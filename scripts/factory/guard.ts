// Quality guard: blocks diffs that weaken the checks instead of fixing the code.
//   node scripts/factory/guard.ts          check staged changes (pre-commit)
//   node scripts/factory/guard.ts <base>   check every commit in <base>..HEAD (CI)
//   node scripts/factory/guard.ts <base> --strict
//                                          same, but no overrides count and the whole range is also
//                                          checked as one diff (AFK loop: agents never get overrides)
// A human can allow one rule for one commit: FACTORY_ALLOW=guardrails git commit ...
// The commit-msg hook records that as a "Factory-Allow:" trailer, which range mode honours.
import { execFileSync } from 'node:child_process';
import { findGuardViolations, GIT_DIFF_FLAGS, parseDiff, type GuardViolation } from './guard-rules.ts';

function git(...args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    console.error(`guard: git ${args.join(' ')} failed: ${(error as Error).message}`);
    process.exit(2);
  }
}

const parseAllowed = (value: string): Set<string> =>
  new Set(value.split(/[,\n]/).map((rule) => rule.trim()).filter(Boolean));

const report: string[] = [];
const overrides: string[] = [];
const base = process.argv[2];
const strict = process.argv.includes('--strict');
const NONE: ReadonlySet<string> = new Set();
if (base !== undefined && /^0*$/.test(base)) {
  console.log('guard: no base commit (first push of a branch), so there is no range to check.');
  process.exit(0);
}

const record = (where: string, violations: GuardViolation[]): void => {
  for (const { rule, path, detail } of violations) report.push(`  - ${where}[${rule}] ${path}: ${detail}`);
};

/** True when `ancestor` is in the history of `commit` (or is `commit`). */
function isAncestor(ancestor: string, commit: string): boolean {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, commit]);
    return true;
  } catch {
    return false; // exit 1 means "not an ancestor"; a bad ref fails earlier in rev-list
  }
}

if (base) {
  // Commits made before the guard existed are not judged by it. Found via history, so deleting
  // the guard later does not exempt anything.
  const introduced = git('log', '--diff-filter=A', '--format=%H', '--', 'scripts/factory/guard-rules.ts').trim().split('\n').pop();
  for (const commit of git('rev-list', '--reverse', '--no-merges', `${base}..HEAD`).split('\n').filter(Boolean)) {
    if (!introduced || !isAncestor(introduced, commit)) {
      console.log(`  - ${commit.slice(0, 7)} predates the guard; not checked`);
      continue;
    }
    const trailer = parseAllowed(git('log', '-1', '--format=%(trailers:key=Factory-Allow,valueonly)', commit));
    const subject = git('log', '-1', '--format=%h %s', commit).trim();
    if (trailer.size > 0) overrides.push(`  - ${subject}  (${strict ? 'IGNORED in strict mode' : 'allowed'}: ${[...trailer].join(', ')})`);
    const allowed = strict ? NONE : trailer;
    record(`${commit.slice(0, 7)} `, findGuardViolations(parseDiff(git('diff', ...GIT_DIFF_FLAGS, `${commit}^`, commit)), allowed));
  }
  if (strict) record('whole range ', findGuardViolations(parseDiff(git('diff', ...GIT_DIFF_FLAGS, base, 'HEAD')), NONE));
} else {
  const allowed = parseAllowed(process.env.FACTORY_ALLOW ?? '');
  if (allowed.size > 0) overrides.push(`  - staged changes (allowed: ${[...allowed].join(', ')})`);
  record('', findGuardViolations(parseDiff(git('diff', '--cached', ...GIT_DIFF_FLAGS)), allowed));
}

if (overrides.length > 0) console.log(`Human overrides:\n${overrides.join('\n')}`);
if (report.length > 0) {
  console.error(`Guard failed with ${report.length} violation(s):\n${report.join('\n')}`);
  console.error('\nFix the code instead of weakening the checks.');
  console.error('Only a human may override, one rule per commit: FACTORY_ALLOW=<rule> git commit ...');
  process.exit(1);
}
console.log('Guard passed.');
