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

  it('reads ticket numbers with more than one digit', () => {
    expect(parseTicket('y', '.scratch/y/issues/12-a.md', file('ready-for-agent')).number).toBe(12);
  });

  it('throws when the file name has no ticket number', () => {
    expect(() => parseTicket('y', '.scratch/y/issues/readme.md', file('ready-for-agent'))).toThrow(
      '.scratch/y/issues/readme.md: file name must start with a ticket number, e.g. 01-slug.md',
    );
  });

  it('throws when the file is not markdown', () => {
    expect(() => parseTicket('y', '.scratch/y/issues/01-a.md.orig', file('ready-for-agent'))).toThrow(/must start with a ticket number/);
  });

  it('trims whitespace around the title and status', () => {
    const parsed = parseTicket('y', '.scratch/y/issues/01-a.md', '# 01: Ayat journal   \n\n**Status:** ready-for-agent   \n');
    expect(parsed.title).toBe('Ayat journal');
    expect(parsed.status).toBe('ready-for-agent');
  });

  it('reads a title however the heading is spaced', () => {
    expect(parseTicket('y', '.scratch/y/issues/01-a.md', '#01:Ayat journal\n\n**Status:** done\n').title).toBe('Ayat journal');
    expect(parseTicket('y', '.scratch/y/issues/01-a.md', '# 01 : Ayat journal\n\n**Status:** done\n').title).toBe('Ayat journal');
  });

  it('falls back to the path as title when there is no numbered heading', () => {
    const text = '**Blocked by:** #02: Loader\n\n**Status:** done\n';
    expect(parseTicket('y', '.scratch/y/issues/03-a.md', text).title).toBe('.scratch/y/issues/03-a.md');
  });

  it('lists every valid status when the status is unknown', () => {
    expect(() => parseTicket('y', '.scratch/y/issues/01-a.md', file('ready'))).toThrow(
      '.scratch/y/issues/01-a.md: unknown status "ready", expected one of needs-triage, needs-info, ready-for-agent, ready-for-human, in-progress, needs-review, done, wontfix',
    );
  });

  it('treats a missing Blocked by line as no blockers', () => {
    expect(parseTicket('y', '.scratch/y/issues/01-a.md', '# 01: A\n\n**Status:** done\n').blockedBy).toEqual([]);
  });

  it('only treats "None" at the start as no blockers', () => {
    expect(parseTicket('y', '.scratch/y/issues/03-a.md', file('ready-for-agent', '02: Handle none values')).blockedBy).toEqual([2]);
  });

  it('reads blockers written with #', () => {
    expect(parseTicket('y', '.scratch/y/issues/03-a.md', file('ready-for-agent', '#01, #02')).blockedBy).toEqual([1, 2]);
  });

  it('throws on a blocker entry that does not start with a number', () => {
    expect(() => parseTicket('y', '.scratch/y/issues/03-a.md', file('ready-for-agent', '01, Loader 02'))).toThrow(
      '.scratch/y/issues/03-a.md: cannot read blocker "Loader 02", expected e.g. "01, 02"',
    );
  });
});

describe('nextTicket ordering and blockers', () => {
  it('stays blocked until every blocker is finished', () => {
    expect(nextTicket([ticket(1, 'done'), ticket(2, 'needs-info'), ticket(3, 'ready-for-agent', [1, 2])])).toBeUndefined();
  });

  it('picks by feature name first, then by number', () => {
    const tickets = [ticket(2, 'ready-for-agent', [], 'yusuf'), ticket(3, 'ready-for-agent', [], 'adam'), ticket(1, 'ready-for-agent', [], 'yusuf')];
    expect(nextTicket(tickets)).toMatchObject({ feature: 'adam', number: 3 });
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

  it('lists them by feature, then by number', () => {
    const tickets = [ticket(2, 'needs-review', [], 'yusuf'), ticket(3, 'needs-review', [], 'adam'), ticket(1, 'needs-review', [], 'yusuf'), ticket(1, 'needs-review', [], 'adam')];
    expect(ticketsAwaitingReview(tickets).map((t) => `${t.feature} ${t.number}`)).toEqual(['adam 1', 'adam 3', 'yusuf 1', 'yusuf 2']);
  });
});
