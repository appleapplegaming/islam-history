// Factory status from the local tracker in .scratch/<feature>/issues/.
//   npm run factory:status                 overview of every ticket
//   npm run factory:status -- --next       print the next ticket path for the agent (exit 3 if none)
//   npm run factory:status -- --review     print the review brief of every ticket awaiting you
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nextTicket, parseTicket, ticketsAwaitingReview, type Ticket } from './tickets.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const SCRATCH = join(ROOT, '.scratch');
const NO_TICKET_EXIT = 3;

function loadTickets(): Ticket[] {
  if (!existsSync(SCRATCH)) return [];
  const tickets: Ticket[] = [];
  for (const feature of readdirSync(SCRATCH).sort()) {
    const issues = join(SCRATCH, feature, 'issues');
    if (!existsSync(issues)) continue;
    for (const name of readdirSync(issues).filter((n) => /^\d+-.*\.md$/.test(n)).sort()) {
      const path = `.scratch/${feature}/issues/${name}`;
      tickets.push(parseTicket(feature, path, readFileSync(join(ROOT, path), 'utf8')));
    }
  }
  return tickets;
}

/** The "## Review brief" section of a ticket file, up to the next level-2 heading. */
function reviewBrief(path: string): string {
  const text = readFileSync(join(ROOT, path), 'utf8');
  const match = /^## Review brief\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text);
  return match?.[1]?.trim() || '(no review brief written: send it back to the agent)';
}

const mode = process.argv[2];
const tickets = loadTickets();
const next = nextTicket(tickets);

if (mode === '--next') {
  if (!next) process.exit(NO_TICKET_EXIT);
  console.log(next.path);
} else if (mode === '--review') {
  const waiting = ticketsAwaitingReview(tickets);
  if (waiting.length === 0) console.log('Nothing is waiting for your review.');
  for (const t of waiting) {
    console.log(`\n${'='.repeat(78)}\n${t.feature} #${String(t.number).padStart(2, '0')}: ${t.title}\n${t.path}\n${'='.repeat(78)}`);
    console.log(reviewBrief(t.path));
  }
} else if (mode === undefined) {
  if (tickets.length === 0) console.log('No tickets yet. Plan a feature first (see docs/factory.md).');
  let feature = '';
  for (const t of tickets) {
    if (t.feature !== feature) console.log(`\n${(feature = t.feature)}`);
    const marker = t === next ? '  <- next' : '';
    console.log(`  ${String(t.number).padStart(2, '0')}  ${t.status.padEnd(15)} ${t.title}${marker}`);
  }
  const waiting = ticketsAwaitingReview(tickets).length;
  if (waiting > 0) console.log(`\n${waiting} ticket(s) need your review: npm run factory:status -- --review`);
} else {
  console.error(`Unknown option "${mode}". Use --next, --review or nothing.`);
  process.exit(2);
}
