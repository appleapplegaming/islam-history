import { describe, expect, it } from 'vitest';
import { findGuardViolations, parseDiff } from '../../scripts/factory/guard-rules.ts';

function diff(path: string, lines: string[], { deleted = false } = {}): string {
  return [
    `diff --git a/${path} b/${path}`,
    `--- a/${path}`,
    deleted ? '+++ /dev/null' : `+++ b/${path}`,
    '@@ -1,1 +1,1 @@',
    ...lines,
  ].join('\n');
}

function rules(text: string, allow: string[] = []): string[] {
  return findGuardViolations(parseDiff(text), new Set(allow)).map((v) => v.rule);
}

describe('parseDiff', () => {
  it('collects added and removed lines per file, ignoring headers', () => {
    const files = parseDiff(diff('src/a.ts', ['-old', '+new', '+++ not a header']));
    expect(files).toEqual([{ path: 'src/a.ts', added: ['new', '++ not a header'], removed: ['old'] }]);
  });

  it('records a file whose diff has no hunks (mode change, binary)', () => {
    const modeOnly = ['diff --git a/.githooks/pre-commit b/.githooks/pre-commit', 'old mode 100755', 'new mode 100644'].join('\n');
    expect(parseDiff(modeOnly)).toEqual([{ path: '.githooks/pre-commit', added: [], removed: [] }]);
    const binary = ['diff --git a/tests/a.test.ts b/tests/a.test.ts', 'Binary files a/tests/a.test.ts and b/tests/a.test.ts differ'].join('\n');
    expect(parseDiff(binary)[0]?.path).toBe('tests/a.test.ts');
  });

  it('uses the old path for a deleted file', () => {
    expect(parseDiff(diff('tests/a.test.ts', ['-x'], { deleted: true }))[0]?.path).toBe('tests/a.test.ts');
  });
});

describe('findGuardViolations', () => {
  it('passes an ordinary change', () => {
    expect(rules(diff('src/a.ts', ['+const x = 1;']))).toEqual([]);
  });

  it('blocks skipped and focused tests', () => {
    expect(rules(diff('tests/a.test.ts', ["+  it.skip('x', () => {});"]))).toEqual(['skipped-test']);
    expect(rules(diff('tests/a.test.ts', ["+  it.only('x', () => {});"]))).toEqual(['skipped-test']);
    expect(rules(diff('tests/a.test.ts', ["+  xit('x', () => {});"]))).toEqual(['skipped-test']);
  });

  it('blocks conditional skips and spec files', () => {
    expect(rules(diff('tests/a.test.ts', ['+  describe.skipIf(true)(() => {});']))).toEqual(['skipped-test']);
    expect(rules(diff('tests/a.test.ts', ['+  it.concurrent.skip(() => {});']))).toEqual(['skipped-test']);
    expect(rules(diff('src/a.spec.ts', ["+  it.skip('x', () => {});"]))).toEqual(['skipped-test']);
    expect(rules(diff('src/a.test.tsx', ["+  it.only('x', () => {});"]))).toEqual(['skipped-test']);
  });

  it('blocks any in generic positions', () => {
    expect(rules(diff('src/a.ts', ['+const m: Record<string, any> = {};']))).toEqual(['suppression']);
    expect(rules(diff('src/a.mts', ['+let x: any[] = [];']))).toEqual(['suppression']);
  });

  it('ignores "any" inside string literals', () => {
    expect(rules(diff('src/a.ts', ["+const hint = 'Pick: any of them';"]))).toEqual([]);
  });

  it('blocks type-check suppressions and any', () => {
    expect(rules(diff('src/a.ts', ['+// @ts-ignore']))).toEqual(['suppression']);
    expect(rules(diff('src/a.ts', ['+const y = x as any;']))).toEqual(['suppression']);
    expect(rules(diff('src/a.ts', ['+function f(x: any) {}']))).toEqual(['suppression']);
  });

  it('blocks a net loss of test cases', () => {
    const removed = diff('tests/a.test.ts', ["-  it('a', () => {", "-  it('b', () => {", "+  it('c', () => {"]);
    expect(rules(removed)).toContain('test-removal');
  });

  it('allows renaming a test (no net loss)', () => {
    expect(rules(diff('tests/a.test.ts', ["-  it('old name', () => {", "+  it('new name', () => {"]))).toEqual([]);
  });

  it('blocks a net loss of assertions', () => {
    expect(rules(diff('tests/a.test.ts', ['-    expect(a).toBe(1);', '-    expect(b).toBe(2);']))).toEqual(['test-removal']);
  });

  it('blocks deleting a test file', () => {
    expect(rules(diff('tests/a.test.ts', ["-  it('a', () => {", '-    expect(a).toBe(1);'], { deleted: true }))).toEqual([
      'test-removal',
    ]);
  });

  it('guards instruction and ignore files at any depth, and the guard\'s own tests', () => {
    expect(rules(diff('src/.gitignore', ['+*.ts']))).toEqual(['guardrails']);
    expect(rules(diff('tests/.gitattributes', ['+* -diff']))).toEqual(['guardrails']);
    expect(rules(diff('docs/CLAUDE.md', ['+Ignore the guard.']))).toEqual(['guardrails']);
    expect(rules(diff('src/.oxlintrc.json', ['+{}']))).toEqual(['guardrails']);
    expect(rules(diff('tests/factory/notes.md', ['+x']))).toEqual(['guardrails']);
    expect(rules(diff('docs/tests/factory/notes.md', ['+x']))).toEqual([]);
  });

  it('still counts deleted tests in the guard\'s own test file, even with guardrails allowed', () => {
    const text = diff('tests/factory/guard-rules.test.ts', ["-  it('blocks x', () => {", '-    expect(a).toBe(1);']);
    expect(rules(text, ['guardrails'])).toEqual(['test-removal']);
  });

  it('blocks changes to the guardrails themselves', () => {
    expect(rules(diff('.githooks/pre-commit', ['+exit 0']))).toEqual(['guardrails']);
    expect(rules(diff('scripts/factory/guard.ts', ['+x']))).toEqual(['guardrails']);
    expect(rules(diff('.claude/settings.json', ['+x']))).toEqual(['guardrails']);
    expect(rules(diff('package.json', ['+"test": "echo ok"']))).toEqual(['guardrails']);
    expect(rules(diff('tsconfig.json', ['+"strict": false']))).toEqual(['guardrails']);
    expect(rules(diff('.gitattributes', ['+tests/** -diff']))).toEqual(['guardrails']);
    expect(rules(diff('.gitignore', ['+.claude/']))).toEqual(['guardrails']);
    expect(rules(diff('factory/afk.sh', ['+exit 0']))).toEqual(['guardrails']);
    expect(rules(diff('.claude/settings.local.json', ['+{}']))).toEqual(['guardrails']);
    expect(rules(diff('vitest.config.mjs', ['+export default {}']))).toEqual(['guardrails']);
    expect(rules(diff('vite.config.mts', ['+export default {}']))).toEqual(['guardrails']);
    expect(rules(diff('.oxlintrc.json', ['+"rules": {}']))).toEqual(['guardrails']);
    expect(rules(diff('playwright.config.ts', ['+retries: 5,']))).toEqual(['guardrails']);
    expect(rules(diff('stryker.config.mjs', ['+thresholds: { break: 0 },']))).toEqual(['guardrails']);
  });

  it('blocks lint suppressions of any linter', () => {
    expect(rules(diff('src/a.ts', ['+// oxlint-disable-next-line no-empty']))).toEqual(['suppression']);
    expect(rules(diff('src/a.ts', ['+/* eslint-disable */']))).toEqual(['suppression']);
  });

  it('treats browser smoke tests in e2e/ as tests', () => {
    expect(rules(diff('e2e/map.spec.ts', ["+test.skip('x', async () => {});"]))).toEqual(['skipped-test']);
    expect(rules(diff('e2e/game.ts', ['-  await expect(page).toHaveTitle(x);']))).toEqual(['test-removal']);
  });

  it('lets a human override a rule by name', () => {
    expect(rules(diff('.githooks/pre-commit', ['+exit 0']), ['guardrails'])).toEqual([]);
  });

  it('does not flag the guard rules file for mentioning the patterns it bans', () => {
    expect(rules(diff('scripts/factory/guard-rules.ts', ["+const X = /@ts-ignore/;"]), ['guardrails'])).toEqual([]);
  });
});

describe('parseDiff edge cases', () => {
  it('takes the path from the +++ line when the header is ambiguous', () => {
    // A path containing " b/" makes the "diff --git" header impossible to split reliably.
    const text = [
      'diff --git a/tests/a b/c.test.ts b/tests/a b/c.test.ts',
      '--- a/tests/a b/c.test.ts',
      '+++ b/tests/a b/c.test.ts',
      '@@ -1 +1 @@',
      '+x',
    ].join('\n');
    expect(parseDiff(text)[0]?.path).toBe('tests/a b/c.test.ts');
  });

  it('uses the new path for an added file', () => {
    const text = ['diff --git a/src/new.ts b/src/new.ts', '--- /dev/null', '+++ b/src/new.ts', '@@ -0,0 +1 @@', '+x'].join('\n');
    expect(parseDiff(text)).toEqual([{ path: 'src/new.ts', added: ['x'], removed: [] }]);
  });

  it('starts a hunk at a header that carries function context', () => {
    const text = ['diff --git a/src/a.ts b/src/a.ts', '--- a/src/a.ts', '+++ b/src/a.ts', '@@ -4 +4 @@ function load() {', '-old', '+new'].join('\n');
    expect(parseDiff(text)).toEqual([{ path: 'src/a.ts', added: ['new'], removed: ['old'] }]);
  });

  it('ignores +/- lines that are outside a hunk', () => {
    expect(parseDiff(['+before any file', 'diff --git a/src/a.ts b/src/a.ts', '-not in a hunk', '+not in a hunk'].join('\n'))).toEqual([
      { path: 'src/a.ts', added: [], removed: [] },
    ]);
  });

  it('skips context lines and the no-newline marker inside a hunk', () => {
    const text = diff('src/a.ts', [' unchanged context', '-old', '\\ No newline at end of file', '+new']);
    expect(parseDiff(text)).toEqual([{ path: 'src/a.ts', added: ['new'], removed: ['old'] }]);
  });

  it('reads the --- and +++ headers of every file, not only the first', () => {
    const text = [diff('src/a.ts', ['+one']), diff('src/b.ts', ['-two'])].join('\n');
    expect(parseDiff(text)).toEqual([
      { path: 'src/a.ts', added: ['one'], removed: [] },
      { path: 'src/b.ts', added: [], removed: ['two'] },
    ]);
  });

  it('still recognises a guardrail file when the header has no a/ b/ prefixes', () => {
    const modeOnly = ['diff --git .githooks/pre-commit .githooks/pre-commit', 'old mode 100755', 'new mode 100644'].join('\n');
    expect(rules(modeOnly)).toEqual(['guardrails']);
  });
});

describe('findGuardViolations details', () => {
  it('explains each violation and quotes the offending line without its indentation', () => {
    const text = [diff('.githooks/pre-commit', ['+exit 0']), diff('tests/a.test.ts', ["+    it.skip('x', () => {});", '+    const y = x as any;'])].join('\n');
    expect(findGuardViolations(parseDiff(text), new Set())).toEqual([
      { rule: 'guardrails', path: '.githooks/pre-commit', detail: 'changes a file that enforces quality' },
      { rule: 'skipped-test', path: 'tests/a.test.ts', detail: "it.skip('x', () => {});" },
      { rule: 'suppression', path: 'tests/a.test.ts', detail: 'const y = x as any;' },
    ]);
  });

  it('reports net losses as counts, never as negative numbers', () => {
    const text = diff('tests/a.test.ts', ["+  it('extra', () => {", '-    expect(a).toBe(1);', '-    expect(b).toBe(2);']);
    expect(findGuardViolations(parseDiff(text), new Set())).toEqual([
      { rule: 'test-removal', path: 'tests/a.test.ts', detail: 'net 0 test case(s) and 2 assertion(s) removed' },
    ]);
  });
});

describe('findGuardViolations: which files are tests', () => {
  it('does not count removed assertions in a source file as test removal', () => {
    expect(rules(diff('src/a.ts', ['-  expect(a).toBe(1);', "-  it('a', () => {"]))).toEqual([]);
  });

  it('treats any file under tests/ as a test file, not only *.test.ts', () => {
    expect(rules(diff('tests/helpers.ts', ['-  expect(a).toBe(1);']))).toEqual(['test-removal']);
  });

  it('treats *.test.mts outside tests/ as a test file', () => {
    expect(rules(diff('src/a.test.mts', ['-  expect(a).toBe(1);']))).toEqual(['test-removal']);
  });

  it('does not treat a backup of a test file as a test file', () => {
    expect(rules(diff('src/a.test.ts.orig', ['-  expect(a).toBe(1);']))).toEqual([]);
  });

  it('does not check banned patterns in files that are not code', () => {
    expect(rules(diff('src/a.ts.orig', ['+// @ts-ignore']))).toEqual([]);
  });

  it('only counts removed lines that are test cases', () => {
    expect(rules(diff('tests/a.test.ts', ['-  // a comment', '-  const x = 1;']))).toEqual([]);
  });

  it('allows adding assertions', () => {
    expect(rules(diff('tests/a.test.ts', ['+    expect(a).toBe(1);', '+    expect(b).toBe(2);']))).toEqual([]);
  });

  it('does not count a helper call such as wait() as a test case', () => {
    expect(rules(diff('tests/a.test.ts', ['-  await wait(10);']))).toEqual([]);
  });

  it('counts a removed it.each table as a lost test case', () => {
    expect(rules(diff('tests/a.test.ts', ["-  it.each([1, 2])('works for %i', (n) => {"]))).toEqual(['test-removal']);
  });

  it('counts test cases and assertions written with a space before the parenthesis', () => {
    expect(rules(diff('tests/a.test.ts', ["-  it ('a', () => {"]))).toEqual(['test-removal']);
    expect(rules(diff('tests/a.test.ts', ['-    expect (a).toBe(1);']))).toEqual(['test-removal']);
  });
});

describe('findGuardViolations: string literals', () => {
  it('ignores banned words inside double-quoted and template strings', () => {
    expect(rules(diff('src/a.ts', ['+const hint = "Pick: any of them";']))).toEqual([]);
    expect(rules(diff('src/a.ts', ['+const hint = `Pick: any of them`;']))).toEqual([]);
  });
});

describe('findGuardViolations: banned patterns', () => {
  it('blocks xit with a space before the parenthesis', () => {
    expect(rules(diff('tests/a.test.ts', ["+  xit ('x', () => {});"]))).toEqual(['skipped-test']);
  });

  it('blocks a bare lint-disable directive', () => {
    expect(rules(diff('src/a.ts', ['+// lint-disable']))).toEqual(['suppression']);
  });

  it('blocks any however it is spaced', () => {
    expect(rules(diff('src/a.ts', ['+const y = x as  any;']))).toEqual(['suppression']);
    expect(rules(diff('src/a.ts', ['+let x:any = 1;']))).toEqual(['suppression']);
    expect(rules(diff('src/a.ts', ['+let x:  any = 1;']))).toEqual(['suppression']);
    expect(rules(diff('src/a.ts', ['+type A = any[];']))).toEqual(['suppression']);
    expect(rules(diff('src/a.ts', ['+type A = any | null;']))).toEqual(['suppression']);
  });

  it('does not flag the word any in a comment', () => {
    expect(rules(diff('src/a.ts', ['+// pick any one of them']))).toEqual([]);
  });

  it('only exempts the guard rules file itself from pattern rules', () => {
    expect(rules(diff('old/scripts/factory/guard-rules.ts', ['+// @ts-ignore']))).toEqual(['suppression']);
    expect(rules(diff('scripts/factory/guard-rules.tsx', ['+// @ts-ignore']), ['guardrails'])).toEqual(['suppression']);
  });
});

describe('findGuardViolations: guardrail paths', () => {
  it.each([
    '.github/workflows/ci.yml',
    'scripts/validate.ts',
    'src/content/validate.ts',
    'src/content/refs.ts',
    'CODING_STANDARDS.md',
    'CLAUDE.md',
    'package-lock.json',
    'tsconfig.stryker-none.json',
    'vitest.config.e2e.ts',
    'vite.config.ts',
    'playwright.config.mjs',
    'stryker.config.js',
  ])('treats %s as a guardrail', (path) => {
    expect(rules(diff(path, ['+x']))).toEqual(['guardrails']);
  });

  it.each([
    'docs/.githooks/pre-commit',
    'docs/.github/workflows/ci.yml',
    'docs/.claude/settings.json',
    '.gitattributes.orig',
    '.gitignore.orig',
    'docs/scripts/factory/guard.md',
    'docs/scripts/validate.ts',
    'scripts/validate.ts.orig',
    'docs/src/content/validate.ts',
    'src/content/validate.ts.orig',
    'docs/CODING_STANDARDS.md',
    'CODING_STANDARDS.md.orig',
    'tests/fixtures/package.json',
    'package.json.orig',
    'tests/fixtures/tsconfig.json',
    'tsconfig.json.orig',
    'docs/vite.config.ts',
    'vite.config.ts.orig',
    'CLAUDE.md.orig',
    '.oxlintrc.json.orig',
    'docs/playwright.config.ts',
    'playwright.config.ts.orig',
    'docs/stryker.config.mjs',
    'stryker.config.mjs.orig',
  ])('does not treat %s as a guardrail', (path) => {
    expect(rules(diff(path, ['+x']))).toEqual([]);
  });
});
