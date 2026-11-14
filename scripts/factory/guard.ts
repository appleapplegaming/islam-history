// Quality guard: blocks diffs that weaken the checks instead of fixing the code.
//   node scripts/factory/guard.ts            check staged changes (pre-commit)
//   node scripts/factory/guard.ts <base>     check <base>...HEAD (CI)
// A human can allow one rule for one commit: FACTORY_ALLOW=guardrails git commit ...
import { execFileSync } from 'node:child_process';
import { findGuardViolations, parseDiff } from './guard-rules.ts';

const base = process.argv[2];
const args = base ? ['diff', '--no-color', '-U0', `${base}...HEAD`] : ['diff', '--cached', '--no-color', '-U0'];

let diff: string;
try {
  diff = execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (error) {
  console.error(`guard: could not read the diff (git ${args.join(' ')}): ${(error as Error).message}`);
  process.exit(2);
}

const allowed = new Set((process.env.FACTORY_ALLOW ?? '').split(',').map((rule) => rule.trim()).filter(Boolean));
const violations = findGuardViolations(parseDiff(diff), allowed);

if (violations.length > 0) {
  console.error(`Guard failed with ${violations.length} violation(s):`);
  for (const { rule, path, detail } of violations) console.error(`  - [${rule}] ${path}: ${detail}`);
  console.error('\nFix the code instead of weakening the checks.');
  console.error('Only a human may override, one rule per commit: FACTORY_ALLOW=<rule> git commit ...');
  process.exit(1);
}
if (allowed.size > 0) console.log(`Guard passed (human override: ${[...allowed].join(', ')}).`);
else console.log('Guard passed.');
