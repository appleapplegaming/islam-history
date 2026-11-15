// Mutation testing: Stryker changes the code in small ways (flips conditions, drops calls...) and
// checks a test fails each time. A surviving mutant is code no test really checks.
//   npm run mutate                      everything below (slow; CI runs it)
//   npm run mutate -- --mutate <glob>   only the files a ticket touched (what the agent runs)
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  mutate: [
    'src/systems/**/*.ts',
    'src/content/**/*.ts',
    'scripts/lib/**/*.ts',
    'scripts/factory/guard-rules.ts',
    'scripts/factory/tickets.ts',
    'scripts/factory/bash-policy.ts',
    'scripts/factory/mutation.ts',
  ],
  coverageAnalysis: 'perTest',
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  // break is a ratchet on the whole codebase: raise it as tests improve, never lower it.
  // New code is held to 90% separately by scripts/factory/mutate-changed.ts.
  thresholds: { high: 90, low: 80, break: Number(process.env.STRYKER_BREAK ?? 95) },
  // TypeScript 7 has no JS API yet; pointing at a missing file stops Stryker from loading it.
  tsconfigFile: 'tsconfig.stryker-none.json',
  tempDirName: '.stryker-tmp',
  cleanTempDir: 'always',
};
