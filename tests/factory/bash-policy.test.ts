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
