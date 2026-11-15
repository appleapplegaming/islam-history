import { describe, expect, it } from 'vitest';
import { MUTABLE_FILE, changedLineRanges, mutateArgs, summariseMutationReport, type MutationReport } from '../../scripts/factory/mutation.ts';

const diff = [
  'diff --git a/src/systems/save.ts b/src/systems/save.ts',
  '--- a/src/systems/save.ts',
  '+++ b/src/systems/save.ts',
  '@@ -3,0 +4,3 @@ export function load() {',
  '+a',
  '+b',
  '+c',
  '@@ -10 +13 @@',
  '+d',
  '@@ -20,2 +22,0 @@',
  '-gone',
  '-gone',
  'diff --git a/src/scenes/MapScene.ts b/src/scenes/MapScene.ts',
  '--- a/src/scenes/MapScene.ts',
  '+++ b/src/scenes/MapScene.ts',
  '@@ -1 +1 @@',
  '+scene code',
  'diff --git a/src/content/old.ts b/src/content/old.ts',
  '--- a/src/content/old.ts',
  '+++ /dev/null',
  '@@ -1,2 +0,0 @@',
  '-x',
  'diff --git a/scripts/factory/tickets.ts b/scripts/factory/tickets.ts',
  '--- a/scripts/factory/tickets.ts',
  '+++ b/scripts/factory/tickets.ts',
  '@@ -5,1 +5,2 @@',
  '+y',
].join('\n');

describe('changedLineRanges', () => {
  it('keeps added line ranges of mutable files only, skipping deletions and scenes', () => {
    expect([...changedLineRanges(diff)]).toEqual([
      ['src/systems/save.ts', [{ start: 4, end: 6 }, { start: 13, end: 13 }]],
      ['scripts/factory/tickets.ts', [{ start: 5, end: 6 }]],
    ]);
  });

  it('ignores tests and the non-pure factory scripts', () => {
    const other = [
      'diff --git a/tests/save.test.ts b/tests/save.test.ts',
      '+++ b/tests/save.test.ts',
      '@@ -1 +1 @@',
      'diff --git a/scripts/factory/guard.ts b/scripts/factory/guard.ts',
      '+++ b/scripts/factory/guard.ts',
      '@@ -1 +1 @@',
      'diff --git a/src/main.ts b/src/main.ts',
      '+++ b/src/main.ts',
      '@@ -1 +1 @@',
    ].join('\n');
    expect(changedLineRanges(other).size).toBe(0);
  });
});

describe('changedLineRanges edge cases', () => {
  it('reads hunk line counts with more than one digit', () => {
    const text = ['+++ b/src/content/a.ts', '@@ -10,12 +10,12 @@'].join('\n');
    expect([...changedLineRanges(text)]).toEqual([['src/content/a.ts', [{ start: 10, end: 21 }]]]);
  });

  it('does not credit a file whose header it cannot read to the file before it', () => {
    // Git quotes paths with unusual characters, so the +++ line does not start with "+++ b/".
    const text = ['+++ b/src/content/a.ts', '@@ -1 +1 @@', '+x', 'diff --git "a/src/content/caf\\303\\251.ts" "b/src/content/caf\\303\\251.ts"', '+++ "b/src/content/caf\\303\\251.ts"', '@@ -1 +1,2 @@'].join('\n');
    expect([...changedLineRanges(text)]).toEqual([['src/content/a.ts', [{ start: 1, end: 1 }]]]);
  });

  it('treats an added line that starts with "++ b/" as content, not as a new file header', () => {
    const text = [
      'diff --git a/src/content/a.ts b/src/content/a.ts',
      '+++ b/src/content/a.ts',
      '@@ -1 +1 @@',
      '+++ b/src/systems/other.ts',
      '@@ -4 +4,2 @@',
    ].join('\n');
    expect([...changedLineRanges(text)]).toEqual([['src/content/a.ts', [{ start: 1, end: 1 }, { start: 4, end: 5 }]]]);
  });

  it('is not fooled by changed lines that look like diff headers', () => {
    const removedHeader = ['+++ b/src/main.ts', '@@ -1 +0,0 @@', '-+++ b/src/content/a.ts', '@@ -9 +9 @@'].join('\n');
    expect(changedLineRanges(removedHeader).size).toBe(0);
    const addedHunk = ['+++ b/src/content/a.ts', '@@ -3 +3 @@', '+@@ -1 +50,5 @@'].join('\n');
    expect([...changedLineRanges(addedHunk)]).toEqual([['src/content/a.ts', [{ start: 3, end: 3 }]]]);
  });
});

describe('MUTABLE_FILE', () => {
  it('matches game logic and the pure factory rules', () => {
    expect(MUTABLE_FILE.test('src/content/validate.ts')).toBe(true);
    expect(MUTABLE_FILE.test('src/systems/save.ts')).toBe(true);
    expect(MUTABLE_FILE.test('scripts/factory/mutation.ts')).toBe(true);
    expect(MUTABLE_FILE.test('scripts/lib/tanzil.ts')).toBe(true);
    expect(MUTABLE_FILE.test('scripts/fetch-quran.ts')).toBe(false);
  });

  it('does not match look-alike paths elsewhere or other extensions', () => {
    expect(MUTABLE_FILE.test('old/src/content/validate.ts')).toBe(false);
    expect(MUTABLE_FILE.test('src/content/Panel.tsx')).toBe(false);
  });
});

describe('mutateArgs', () => {
  it('formats one file:start-end argument per range', () => {
    expect(mutateArgs(changedLineRanges(diff))).toEqual([
      'src/systems/save.ts:4-6',
      'src/systems/save.ts:13-13',
      'scripts/factory/tickets.ts:5-6',
    ]);
  });
});

const mutant = (status: string, line: number, replacement?: string) => ({
  status,
  location: { start: { line } },
  mutatorName: 'ConditionalExpression',
  ...(replacement === undefined ? {} : { replacement }),
});

describe('summariseMutationReport', () => {
  it('scores killed and timed-out mutants against survived and uncovered ones, ignoring errors', () => {
    const report: MutationReport = {
      files: {
        'src/systems/save.ts': {
          mutants: [mutant('Killed', 1), mutant('Timeout', 2), mutant('Survived', 3, 'false\nmore'), mutant('NoCoverage', 4), mutant('CompileError', 5), mutant('Ignored', 6)],
        },
      },
    };
    expect(summariseMutationReport(report)).toEqual({
      score: 50,
      total: 4,
      undetected: ['src/systems/save.ts:3 Survived ConditionalExpression -> false', 'src/systems/save.ts:4 NoCoverage ConditionalExpression'],
    });
  });

  it('rounds to one decimal and scores 100 when there is nothing to mutate', () => {
    const report: MutationReport = { files: { a: { mutants: [mutant('Killed', 1), mutant('Killed', 2), mutant('Survived', 3)] } } };
    expect(summariseMutationReport(report).score).toBe(66.7);
    expect(summariseMutationReport({ files: {} })).toEqual({ score: 100, total: 0, undetected: [] });
  });
});
