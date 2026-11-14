// PreToolUse hook on Bash: blocks shell routes around the quality bar (see scripts/factory/bash-policy.ts).
// Silent on "allow" so the normal permission rules still apply.
import { readFileSync } from 'node:fs';
import { classifyCommand } from '../../scripts/factory/bash-policy.ts';

let command = '';
try {
  const input = JSON.parse(readFileSync(0, 'utf8')) as { tool_input?: { command?: unknown } };
  command = typeof input.tool_input?.command === 'string' ? input.tool_input.command : '';
} catch (error) {
  // Fail closed: if the hook cannot read the call, it cannot vouch for it.
  console.error(`guard-bash: could not parse hook input: ${(error as Error).message}`);
  process.exit(2);
}

const { decision, reason } = classifyCommand(command);
if (decision !== 'allow') {
  console.log(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason },
    }),
  );
}
