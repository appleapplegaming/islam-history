// Pure ticket logic for the local-markdown issue tracker (see docs/agents/issue-tracker.md).
// No Node imports, so tests/ can type-check it.

export const STATUSES = [
  'needs-triage', // a human still has to evaluate it
  'needs-info', // waiting on more information
  'ready-for-agent', // fully specified, an AFK agent may take it
  'ready-for-human', // needs a human (judgement, design, manual work)
  'in-progress', // an agent has claimed it
  'needs-review', // agent finished; waiting for the human to read the review brief and hand-test
  'done', // human accepted it
  'wontfix',
] as const;

export type TicketStatus = (typeof STATUSES)[number];

export interface Ticket {
  feature: string;
  number: number;
  title: string;
  status: TicketStatus;
  blockedBy: number[];
  path: string;
}

/** Statuses that unblock dependents. needs-review counts so the loop is not stalled by review. */
const FINISHED: ReadonlySet<TicketStatus> = new Set(['needs-review', 'done']);

function field(text: string, name: string): string | undefined {
  return new RegExp(`^\\**${name}:\\**\\s*(.+)$`, 'mi').exec(text)?.[1]?.trim();
}

/** Parses one ticket file. Throws with the path on anything malformed, so nothing is skipped silently. */
export function parseTicket(feature: string, path: string, text: string): Ticket {
  const number = Number(/(\d+)-[^/]*\.md$/.exec(path)?.[1]);
  if (!Number.isInteger(number)) throw new Error(`${path}: file name must start with a ticket number, e.g. 01-slug.md`);

  const title = /^#\s*\d+\s*:\s*(.+)$/m.exec(text)?.[1]?.trim() ?? path;

  const rawStatus = field(text, 'Status');
  if (rawStatus === undefined) throw new Error(`${path}: no Status line`);
  if (!(STATUSES as readonly string[]).includes(rawStatus)) {
    throw new Error(`${path}: unknown status "${rawStatus}", expected one of ${STATUSES.join(', ')}`);
  }

  const rawBlockedBy = field(text, 'Blocked by') ?? 'None';
  // "01, 02: Loader" -> [1, 2]. Only the leading number of each comma-separated entry counts,
  // so digits inside a ticket title are not mistaken for blockers.
  const blockedBy = /^none\b/i.test(rawBlockedBy)
    ? []
    : rawBlockedBy.split(',').flatMap((entry) => {
        const match = /^\s*#?(\d{1,3})\b/.exec(entry);
        if (!match) throw new Error(`${path}: cannot read blocker "${entry.trim()}", expected e.g. "01, 02"`);
        return [Number(match[1])];
      });

  return { feature, number, title, status: rawStatus as TicketStatus, blockedBy, path };
}

function byOrder(a: Ticket, b: Ticket): number {
  return a.feature.localeCompare(b.feature) || a.number - b.number;
}

/**
 * The ticket the agent should work on next: an in-progress ticket first (a previous iteration
 * stopped mid-way), otherwise the lowest-numbered ready-for-agent ticket whose blockers in the
 * same feature are all finished. Undefined when there is nothing an agent may do.
 */
export function nextTicket(tickets: readonly Ticket[]): Ticket | undefined {
  const sorted = [...tickets].sort(byOrder);
  const inProgress = sorted.find((t) => t.status === 'in-progress');
  if (inProgress) return inProgress;
  return sorted.find(
    (t) =>
      t.status === 'ready-for-agent' &&
      t.blockedBy.every((n) => {
        const blocker = tickets.find((other) => other.feature === t.feature && other.number === n);
        return blocker !== undefined && FINISHED.has(blocker.status);
      }),
  );
}

export function ticketsAwaitingReview(tickets: readonly Ticket[]): Ticket[] {
  return tickets.filter((t) => t.status === 'needs-review').sort(byOrder);
}
