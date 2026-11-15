// Pure rules for scripts/factory/guard.ts. No Node imports, so tests/ can type-check it.
//
// The guard stops an agent from reaching "green" by weakening the checks instead of fixing the
// code. A human can override one rule for one commit with FACTORY_ALLOW=<rule>[,<rule>].

export interface FileDiff {
  path: string;
  added: string[];
  removed: string[];
}

export type GuardRule = 'skipped-test' | 'suppression' | 'test-removal' | 'guardrails';

export interface GuardViolation {
  rule: GuardRule;
  path: string;
  detail: string;
}

/**
 * Flags for every `git diff` the guard reads. They make the output immune to repo and user config
 * that could hide changes: .gitattributes `-diff`/textconv/external diff drivers, custom prefixes,
 * and renames (a renamed guardrail file must show up as delete + add).
 */
export const GIT_DIFF_FLAGS = [
  '--no-color',
  '--no-ext-diff',
  '--no-textconv',
  '--text',
  '--no-renames',
  '--src-prefix=a/',
  '--dst-prefix=b/',
  '-U0',
] as const;

/** Files that enforce quality. Changing them changes the bar, so a human must approve it. */
const GUARDRAIL_PATHS = [
  /^\.githooks\//,
  /^\.github\/workflows\//,
  /^\.claude\//, // settings (incl. settings.local.json), hooks, agents, rules
  /(^|\/)\.gitattributes$/, // can hide diffs from the guard (at any depth)
  /(^|\/)\.gitignore$/, // can hide files from the clean-tree check (at any depth)
  /^factory\//, // the loop runner and prompt
  /^scripts\/factory\//,
  /^scripts\/validate\.ts$/,
  /^src\/content\/(validate|honorifics|credits|refs)\.ts$/,
  /^CODING_STANDARDS\.md$/,
  /^package(-lock)?\.json$/, // scripts and dependencies (new dependencies need approval anyway)
  /^tsconfig(\.[\w-]+)?\.json$/,
  /^vite(st)?\.(config|workspace)(\.[\w-]+)?\.[cm]?[jt]s$/,
  /(^|\/)CLAUDE\.md$/, // agent instructions, at any depth
  /^tests\/factory\//, // the tests that define what the guard and the loop enforce
  /(^|\/)\.oxlintrc\.json$/, // lint rules (oxlint also reads nested configs)
  /^playwright\.config\.[cm]?[jt]s$/, // browser smoke tests
  /^stryker\.config\.[cm]?[jt]s$/, // mutation testing and its thresholds
];

// The guard's own source and tests mention every banned pattern, so they are exempt from the
// pattern rules (skipped-test, suppression) only. Both are guardrail files, so changing them needs
// approval anyway, and the test-removal rule still applies to the tests.
const PATTERN_EXEMPT = /^(scripts\/factory\/guard-rules\.ts|tests\/factory\/guard-rules\.test\.ts)$/;

const SKIPPED_TEST = /\b(?:it|test|describe|suite|bench)(?:\.\w+)*\.(?:skip|only|todo|skipIf|runIf|fails)\b|\bx(?:it|test|describe)\s*\(/;
const SUPPRESSION = /@ts-(?:ignore|nocheck|expect-error)|[a-z]*lint-disable|\bas\s+any\b|[:<,|&(]\s*any\b|\bany\s*(?:\[\]|[>|&,)])/;
const TEST_CASE = /^\s*(?:it|test)(?:\.each\(.*?\))?\s*\(/;
const ASSERTION = /\bexpect\s*\(/;

const isTestFile = (path: string): boolean => path.startsWith('tests/') || path.startsWith('e2e/') || /\.(test|spec)\.[cm]?[jt]sx?$/.test(path);
const isCode = (path: string): boolean => /\.[cm]?[jt]sx?$/.test(path);
const count = (lines: string[], pattern: RegExp): number => lines.filter((line) => pattern.test(line)).length;
/** Blanks out string literals so words inside messages are not mistaken for code. */
const stripStrings = (line: string): string => line.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g, "''");

/** Parses `git diff` output (any context size) into added and removed lines per file. */
export function parseDiff(text: string): FileDiff[] {
  const files: FileDiff[] = [];
  let current: FileDiff | undefined;
  let oldPath = '';
  let inHunk = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('diff --git ')) {
      // Record the file from the header, so changes with no hunks (mode, binary) still count.
      const header = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
      current = { path: header?.[2] ?? line.slice('diff --git '.length), added: [], removed: [] };
      files.push(current);
      inHunk = false;
    } else if (!inHunk && line.startsWith('--- ')) {
      oldPath = line.slice(4).replace(/^a\//, '');
    } else if (!inHunk && line.startsWith('+++ ') && current) {
      const newPath = line.slice(4);
      current.path = newPath === '/dev/null' ? oldPath : newPath.replace(/^b\//, '');
    } else if (line.startsWith('@@')) {
      inHunk = true;
    } else if (inHunk && current) {
      if (line.startsWith('+')) current.added.push(line.slice(1));
      else if (line.startsWith('-')) current.removed.push(line.slice(1));
    }
  }
  return files;
}

/** Returns every rule the diff breaks, minus the rules a human allowed for this commit. */
export function findGuardViolations(files: FileDiff[], allowed: ReadonlySet<string>): GuardViolation[] {
  const violations: GuardViolation[] = [];
  for (const { path, added, removed } of files) {
    if (GUARDRAIL_PATHS.some((pattern) => pattern.test(path))) {
      violations.push({ rule: 'guardrails', path, detail: 'changes a file that enforces quality' });
    }
    if (isCode(path) && !PATTERN_EXEMPT.test(path)) {
      for (const line of added) {
        const code = stripStrings(line);
        if (isTestFile(path) && SKIPPED_TEST.test(code)) {
          violations.push({ rule: 'skipped-test', path, detail: line.trim() });
        }
        if (SUPPRESSION.test(code)) violations.push({ rule: 'suppression', path, detail: line.trim() });
      }
    }
    if (isTestFile(path)) {
      const lostCases = count(removed, TEST_CASE) - count(added, TEST_CASE);
      const lostAssertions = count(removed, ASSERTION) - count(added, ASSERTION);
      if (lostCases > 0 || lostAssertions > 0) {
        violations.push({
          rule: 'test-removal',
          path,
          detail: `net ${Math.max(lostCases, 0)} test case(s) and ${Math.max(lostAssertions, 0)} assertion(s) removed`,
        });
      }
    }
  }
  return violations.filter((violation) => !allowed.has(violation.rule));
}
