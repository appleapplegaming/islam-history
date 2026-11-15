import { describe, expect, it } from 'vitest';
import { classifyCommand } from '../../scripts/factory/bash-policy.ts';

const decision = (command: string) => classifyCommand(command).decision;

describe('classifyCommand', () => {
  it('allows ordinary commands', () => {
    expect(decision('npm test')).toBe('allow');
    expect(decision('git commit -m "Add journal"')).toBe('allow');
    expect(decision('git log --oneline -n 5')).toBe('allow');
  });

  it('denies skipping the git hooks', () => {
    expect(decision('git commit --no-verify -m x')).toBe('deny');
    expect(decision('git commit -n -m x')).toBe('deny');
    expect(decision('git commit -anm x')).toBe('deny');
    expect(decision('git -c core.hooksPath=/dev/null commit -m x')).toBe('deny');
    expect(decision('git config core.hooksPath foo')).toBe('deny');
    expect(decision('HUSKY=0 git commit -m x')).toBe('deny');
  });

  it('denies hook bypasses hidden in quotes, which the shell removes', () => {
    expect(decision('HUSKY="0" git commit -m x')).toBe('deny');
    expect(decision("git commit '--no-verify' -m x")).toBe('deny');
    expect(decision('git -c "core.hooksPath=/dev/null" commit -m x')).toBe('deny');
    expect(decision('git commit "-n" -m x')).toBe('deny');
    expect(decision("git commit -m x '-an'")).toBe('deny');
    expect(decision("git commit '-nm' x")).toBe('deny');
    expect(decision('git -C repo commit "-n" -m x')).toBe('deny');
  });

  it('allows a quoted commit message that only contains the letter n', () => {
    expect(decision('git commit -m "-x: no"')).toBe('allow');
    expect(decision('git commit -m "-ab"')).toBe('allow');
    expect(decision('git commit --no-veri -m x')).toBe('deny');
    expect(decision('git commit --no-v -m x')).toBe('deny');
  });

  it('does not mistake a message containing -n for the flag', () => {
    expect(decision('git commit -m "fix -n handling"')).toBe('allow');
  });

  it('denies rewriting shared history', () => {
    expect(decision('git push --force origin main')).toBe('deny');
    expect(decision('git push -f')).toBe('deny');
  });

  it('denies git writing arbitrary files through --output', () => {
    expect(decision('git diff --output=.githooks/pre-commit HEAD HEAD')).toBe('deny');
    expect(decision('git log --output data/quran/surah-012.json')).toBe('deny');
  });

  it('does not ask when Factory-Allow is only read, not written', () => {
    expect(decision("git log --format='%(trailers:key=Factory-Allow)'")).toBe('allow');
  });

  it('asks a human before a guard override', () => {
    expect(decision('FACTORY_ALLOW=guardrails git commit -m x')).toBe('ask');
    expect(decision('export FACTORY_ALLOW=guardrails')).toBe('ask');
    expect(decision('git commit -m "x\n\nFactory-Allow: guardrails"')).toBe('ask');
  });

  it('denies writing into the generated Quran data from the shell', () => {
    expect(decision('echo x > data/quran/surah-012.json')).toBe('deny');
    expect(decision("sed -i '' s/a/b/ data/quran/surah-012.json")).toBe('deny');
  });

  it('allows the fetch script, which is how data/quran is meant to change', () => {
    expect(decision('node scripts/fetch-quran.ts')).toBe('allow');
    expect(decision('cat data/quran/surah-012.json')).toBe('allow');
  });
});

describe('classifyCommand edge cases', () => {
  it('does not mistake a single-quoted message containing -n for the flag', () => {
    expect(decision("git commit -m 'fix -n handling'")).toBe('allow');
  });

  it('finds the hook-skipping -n wherever it sits in a commit command', () => {
    expect(decision('git -C dir commit -n -m x')).toBe('deny');
    expect(decision('git commit -m x -n')).toBe('deny');
  });

  it('denies force-pushing with options before push', () => {
    expect(decision('git -C dir push --force')).toBe('deny');
  });

  it('denies sed -i on the Quran data however it is spaced', () => {
    expect(decision('sed  -i s/a/b/ data/quran/surah-012.json')).toBe('deny');
  });
});

describe('classifyCommand reasons', () => {
  it('tells the agent why each command is blocked', () => {
    expect(classifyCommand('git commit --no-verify -m x')).toEqual({
      decision: 'deny',
      reason: 'Skipping git hooks is not allowed. Fix what the pre-commit hook reports.',
    });
    expect(classifyCommand('git diff --output=x')).toEqual({
      decision: 'deny',
      reason: 'git --output can overwrite any file. Use a normal redirect to a scratch file instead.',
    });
    expect(classifyCommand('git commit -n -m x')).toEqual({
      decision: 'deny',
      reason: '`git commit -n` skips the hooks. Fix what the pre-commit hook reports.',
    });
    expect(classifyCommand('git config core.hooksPath foo')).toEqual({
      decision: 'deny',
      reason: 'Changing core.hooksPath disables the pre-commit hook.',
    });
    expect(classifyCommand('HUSKY=0 npm test')).toEqual({ decision: 'deny', reason: 'Disabling hooks is not allowed.' });
    expect(classifyCommand('git push -f')).toEqual({
      decision: 'deny',
      reason: 'Force-pushing rewrites shared history. Ask the human.',
    });
    expect(classifyCommand('rm data/quran/surah-012.json')).toEqual({
      decision: 'deny',
      reason: 'data/quran/ is generated by scripts/fetch-quran.ts. Change the script and run it instead.',
    });
  });

  it('tells the human what an override request is for', () => {
    expect(classifyCommand('git commit -m "x\n\nFactory-Allow: guardrails"')).toEqual({
      decision: 'ask',
      reason: 'A Factory-Allow trailer records a human guard override. Only a human may add it.',
    });
    expect(classifyCommand('FACTORY_ALLOW=guardrails npm test')).toEqual({
      decision: 'ask',
      reason: 'FACTORY_ALLOW overrides the quality guard. Only a human may approve it.',
    });
  });

  it('gives no reason when a command is allowed', () => {
    expect(classifyCommand('npm test')).toEqual({ decision: 'allow' });
  });
});
