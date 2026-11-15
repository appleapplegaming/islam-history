// Mutation-tests only the lines changed since <base> (default: the merge-base with main), and fails
// below the threshold. This is how "would the tests notice if this code were wrong?" is answered
// without anyone reading the tests.
//   npm run mutate:changed                 lines changed since main
//   npm run mutate:changed -- <base>       lines changed since <base>
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { GIT_DIFF_FLAGS } from './guard-rules.ts';
import { changedLineRanges, mutateArgs, summariseMutationReport, type MutationReport } from './mutation.ts';

export const NEW_CODE_THRESHOLD = 90;
const REPORT = 'reports/mutation/mutation.json';

const git = (...args: string[]): string => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const base = process.argv[2] ?? git('merge-base', 'HEAD', 'main').trim();
const targets = mutateArgs(changedLineRanges(git('diff', ...GIT_DIFF_FLAGS, base)));
if (targets.length === 0) {
  console.log(`mutate:changed: no mutable code changed since ${base.slice(0, 7)}; nothing to do.`);
  process.exit(0);
}

console.log(`mutate:changed: ${targets.length} changed range(s) since ${base.slice(0, 7)}`);
const run = spawnSync('npx', ['stryker', 'run', '--mutate', targets.join(','), '--reporters', 'json,html,progress'], {
  stdio: 'inherit',
  env: { ...process.env, STRYKER_BREAK: '0' },
});
if (run.status !== 0) {
  console.error(`mutate:changed: Stryker failed (exit ${run.status}).`);
  process.exit(2);
}

let report: MutationReport;
try {
  report = JSON.parse(readFileSync(REPORT, 'utf8')) as MutationReport;
} catch (error) {
  console.error(`mutate:changed: cannot read ${REPORT}: ${(error as Error).message}`);
  process.exit(2);
}
const { score, total, undetected } = summariseMutationReport(report);
console.log(`\nMutation score on changed lines: ${score}% of ${total} mutant(s) (need ${NEW_CODE_THRESHOLD}%).`);
for (const line of undetected) console.log(`  undetected: ${line}`);
if (score < NEW_CODE_THRESHOLD) {
  console.error('Add tests that fail for these changes (do not delete the code to dodge them).');
  process.exit(1);
}
