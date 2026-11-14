// Stop hook: the agent may not finish a turn with uncommitted code that fails `npm run check`.
// Blocks once per stop; if the agent still cannot get green it may stop and must report the failure.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8')) as { cwd?: string; stop_hook_active?: boolean };
if (input.stop_hook_active) process.exit(0);

const cwd = input.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
let changed: string[];
try {
  changed = execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' })
    .split('\n')
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
} catch (error) {
  console.error(`check-on-stop: git status failed in ${cwd}: ${(error as Error).message}`);
  process.exit(0); // not a git checkout we manage; nothing to enforce
}

const touchesCode = changed.some((path) => /\.(ts|json)$/.test(path) || /^(content|data|scripts|src|tests)\//.test(path));
if (!touchesCode) process.exit(0);

const result = spawnSync('npm', ['run', '--silent', 'check'], { cwd, encoding: 'utf8' });
if (result.status !== 0) {
  const output = `${result.stdout}\n${result.stderr}`.trim().split('\n').slice(-40).join('\n');
  console.log(
    JSON.stringify({
      decision: 'block',
      reason: `There are uncommitted code changes and \`npm run check\` fails. Fix the cause (do not weaken tests or checks), then commit.\n\n${output}`,
    }),
  );
}
