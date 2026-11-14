import { describe, expect, it } from 'vitest';
import { nextTicket, parseTicket, ticketsAwaitingReview, type Ticket } from '../../scripts/factory/tickets.ts';

function file(status: string, blockedBy = 'None (can start immediately)', title = 'Do a thing'): string {
  return `# 01: ${title}\n\n**What to build:** x\n\n**Blocked by:** ${blockedBy}\n\n**Status:** ${status}\n\n- [ ] it works\n`;
}

function ticket(number: number, status: Ticket['status'], blockedBy: number[] = [], feature = 'yusuf'): Ticket {
  return { feature, number, title: `T${number}`, status, blockedBy, path: `.scratch/${feature}/issues/0${number}-t.md` };
}

describe('parseTicket', () => {
  it('reads number, title, status and blockers', () => {
    const parsed = parseTicket('yusuf', '.scratch/yusuf/issues/03-journal.md', file('ready-for-agent', '01, 02: Loader', 'Ayat journal'));
    expect(parsed).toEqual({
      feature: 'yusuf',
      number: 3,
      title: 'Ayat journal',
      status: 'ready-for-agent',
      blockedBy: [1, 2],
      path: '.scratch/yusuf/issues/03-journal.md',
    });
  });

  it('treats "None" as no blockers', () => {
    expect(parseTicket('y', '.scratch/y/issues/01-a.md', file('ready-for-agent')).blockedBy).toEqual([]);
  });

  it('ignores digits inside a blocker title', () => {
    expect(parseTicket('y', '.scratch/y/issues/04-a.md', file('ready-for-agent', '02: Seven lean years 7')).blockedBy).toEqual([2]);
  });

  it('throws on an unknown status so a typo cannot hide a ticket', () => {
    expect(() => parseTicket('y', '.scratch/y/issues/01-a.md', file('ready'))).toThrow(/unknown status "ready"/);
  });

  it('throws when the status line is missing', () => {
    expect(() => parseTicket('y', '.scratch/y/issues/01-a.md', '# 01: A\n')).toThrow(/no Status line/);
  });
});

describe('nextTicket', () => {
  it('picks the lowest-numbered ready ticket whose blockers are finished', () => {
    const tickets = [ticket(1, 'done'), ticket(2, 'ready-for-agent', [3]), ticket(3, 'ready-for-agent', [1])];
    expect(nextTicket(tickets)?.number).toBe(3);
  });

  it('counts a ticket awaiting human review as finished for its dependents', () => {
    expect(nextTicket([ticket(1, 'needs-review'), ticket(2, 'ready-for-agent', [1])])?.number).toBe(2);
  });

  it('resumes an in-progress ticket before starting a new one', () => {
    expect(nextTicket([ticket(1, 'ready-for-agent'), ticket(2, 'in-progress')])?.number).toBe(2);
  });

  it('never picks tickets reserved for a human', () => {
    expect(nextTicket([ticket(1, 'ready-for-human'), ticket(2, 'needs-info')])).toBeUndefined();
  });

  it('stays blocked when a blocker does not exist', () => {
    expect(nextTicket([ticket(2, 'ready-for-agent', [1])])).toBeUndefined();
  });

  it('only resolves blockers within the same feature', () => {
    expect(nextTicket([ticket(1, 'done', [], 'other'), ticket(2, 'ready-for-agent', [1])])).toBeUndefined();
  });
});

describe('ticketsAwaitingReview', () => {
  it('lists tickets waiting for human review', () => {
    expect(ticketsAwaitingReview([ticket(1, 'done'), ticket(2, 'needs-review')]).map((t) => t.number)).toEqual([2]);
  });
});
