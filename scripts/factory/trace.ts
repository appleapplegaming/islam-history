// What did the agent do? Summarises an AFK iteration log (.factory-logs/*.log, stream-json).
//   npm run factory:trace               the latest log
//   npm run factory:trace -- <log>      a specific log
//   ... --verdicts                       only "reviewer verdict" lines (used by factory/afk.sh)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatTraceSummary, summariseTrace } from './trace-summary.ts';

const LOGS = '.factory-logs';

function latestLog(): string {
  let names: string[];
  try {
    names = readdirSync(LOGS).filter((n) => n.endsWith('.log')).toSorted();
  } catch (error) {
    console.error(`factory:trace: cannot read ${LOGS}/ (${(error as Error).message}). Run factory/afk.sh first.`);
    process.exit(2);
  }
  const latest = names.at(-1);
  if (latest === undefined) {
    console.error(`factory:trace: ${LOGS}/ has no iteration logs yet.`);
    process.exit(2);
  }
  return join(LOGS, latest);
}

const args = process.argv.slice(2);
const verdictsOnly = args.includes('--verdicts');
const path = args.find((arg) => arg !== '--verdicts') ?? latestLog();
const summary = summariseTrace(readFileSync(path, 'utf8'));
if (verdictsOnly) {
  for (const [type, verdict] of Object.entries(summary.verdicts ?? {})) console.log(`${type} ${verdict}`);
} else {
  console.log(`${path}\n`);
  console.log(formatTraceSummary(summary, process.cwd()));
}
