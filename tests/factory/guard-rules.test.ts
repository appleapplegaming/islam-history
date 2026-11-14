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
  });

  it('lets a human override a rule by name', () => {
    expect(rules(diff('.githooks/pre-commit', ['+exit 0']), ['guardrails'])).toEqual([]);
  });

  it('does not flag the guard rules file for mentioning the patterns it bans', () => {
    expect(rules(diff('scripts/factory/guard-rules.ts', ["+const X = /@ts-ignore/;"]), ['guardrails'])).toEqual([]);
  });
});
