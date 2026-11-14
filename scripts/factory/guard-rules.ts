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

/** Files that enforce quality. Changing them changes the bar, so a human must approve it. */
const GUARDRAIL_PATHS = [
  /^\.githooks\//,
  /^\.github\/workflows\//,
  /^\.claude\/settings\.json$/,
  /^\.claude\/hooks\//,
  /^\.claude\/agents\//,
  /^scripts\/factory\//,
  /^scripts\/validate\.ts$/,
  /^src\/content\/(validate|honorifics|credits|refs)\.ts$/,
  /^CODING_STANDARDS\.md$/,
  /^package(-lock)?\.json$/, // scripts and dependencies (new dependencies need approval anyway)
  /^tsconfig\.json$/,
  /^vite(st)?\.config\.ts$/,
  /^CLAUDE\.md$/,
];

// The guard's own source mentions every banned pattern, so it is exempt from pattern rules
// (it is still a guardrail file, so changing it needs approval anyway).
const PATTERN_EXEMPT = /^(scripts\/factory\/guard-rules\.ts|tests\/factory\/guard-rules\.test\.ts)$/;

const SKIPPED_TEST = /\b(?:it|test|describe)\.(?:skip|only|todo)\b|\bx(?:it|test|describe)\s*\(/;
const SUPPRESSION = /@ts-(?:ignore|nocheck|expect-error)|eslint-disable|\bas\s+any\b|:\s*any\b|<any>/;
const TEST_CASE = /^\s*(?:it|test)(?:\.each\(.*?\))?\s*\(/;
const ASSERTION = /\bexpect\s*\(/;

const isTestFile = (path: string): boolean => path.startsWith('tests/') || /\.test\.ts$/.test(path);
const isCode = (path: string): boolean => /\.(ts|js|mjs)$/.test(path);
const count = (lines: string[], pattern: RegExp): number => lines.filter((line) => pattern.test(line)).length;

/** Parses `git diff` output (any context size) into added and removed lines per file. */
export function parseDiff(text: string): FileDiff[] {
  const files: FileDiff[] = [];
  let current: FileDiff | undefined;
  let oldPath = '';
  let inHunk = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('diff --git ')) {
      inHunk = false;
      current = undefined;
    } else if (!inHunk && line.startsWith('--- ')) {
      oldPath = line.slice(4).replace(/^a\//, '');
    } else if (!inHunk && line.startsWith('+++ ')) {
      const newPath = line.slice(4);
      current = { path: newPath === '/dev/null' ? oldPath : newPath.replace(/^b\//, ''), added: [], removed: [] };
      files.push(current);
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
        if (isTestFile(path) && SKIPPED_TEST.test(line)) {
          violations.push({ rule: 'skipped-test', path, detail: line.trim() });
        }
        if (SUPPRESSION.test(line)) violations.push({ rule: 'suppression', path, detail: line.trim() });
      }
    }
    if (isTestFile(path) && !PATTERN_EXEMPT.test(path)) {
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
