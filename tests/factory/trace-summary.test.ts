import { describe, expect, it } from 'vitest';
import { formatTraceSummary, summariseTrace } from '../../scripts/factory/trace-summary.ts';

const toolUse = (id: string, name: string, input: Record<string, unknown>) =>
  JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } });
const toolError = (id: string, content: unknown) =>
  JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: true, content }] } });
const toolOk = (id: string) => JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'ok' }] } });

const log = [
  'Ignoring warnings printed before the JSON starts',
  JSON.stringify({ type: 'system', subtype: 'init' }),
  toolUse('1', 'Bash', { command: 'npm test\n# second line is dropped' }),
  toolOk('1'),
  toolUse('2', 'Write', { file_path: '/repo/scripts/lib/tanzil.ts' }),
  toolUse('3', 'Edit', { file_path: '/repo/scripts/fetch-quran.ts' }),
  toolUse('4', 'Edit', { file_path: '/repo/scripts/lib/tanzil.ts' }),
  toolUse('5', 'Bash', { command: 'git commit --no-verify -m x' }),
  toolError('5', [{ type: 'text', text: 'Permission denied by PreToolUse hook: skipping git hooks is not allowed' }]),
  toolUse('6', 'Bash', { command: 'npx vitest run tests/x.test.ts' }),
  toolError('6', 'Error: 1 test failed'),
  toolUse('7', 'Agent', { subagent_type: 'faith-reviewer', prompt: 'review' }),
  toolUse('8', 'Read', { file_path: '/repo/CLAUDE.md' }),
  toolError('8', 'File does not exist.'),
  '{"type":"assistant","message":{"content":[{"type":"tool_use"', // truncated last line of a killed run
  JSON.stringify({ type: 'result', num_turns: 42, total_cost_usd: 1.234, duration_ms: 754_000, result: 'TICKET DONE: 01\nmore' }),
].join('\n');

describe('summariseTrace', () => {
  const summary = summariseTrace(log);

  it('lists every shell command by its first line, in order', () => {
    expect(summary.commands).toEqual(['npm test', 'git commit --no-verify -m x', 'npx vitest run tests/x.test.ts']);
  });

  it('lists each changed file once, sorted, and ignores reads', () => {
    expect(summary.filesChanged).toEqual(['/repo/scripts/fetch-quran.ts', '/repo/scripts/lib/tanzil.ts']);
  });

  it('lists the subagents that ran', () => {
    expect(summary.subagents).toEqual(['faith-reviewer']);
  });

  it('separates denied calls from commands that merely failed, ignoring other tool errors', () => {
    expect(summary.denied).toEqual([
      'git commit --no-verify -m x: Permission denied by PreToolUse hook: skipping git hooks is not allowed',
    ]);
    expect(summary.failedCommands).toBe(1);
  });

  it('reads the run totals and the first line of the final message', () => {
    expect(summary).toMatchObject({ turns: 42, costUsd: 1.234, minutes: 12.6, finalMessage: 'TICKET DONE: 01' });
  });

  it('returns an empty summary for a log with no JSON', () => {
    expect(summariseTrace('claude: command not found')).toEqual({
      commands: [],
      filesChanged: [],
      subagents: [],
      denied: [],
      failedCommands: 0,
    });
  });

  it('shortens very long commands to 160 characters', () => {
    const long = summariseTrace(toolUse('1', 'Bash', { command: 'x'.repeat(200) })).commands[0];
    expect(long).toBe(`${'x'.repeat(159)}…`);
  });

  it('counts every file-writing tool and lists all subagents', () => {
    const more = summariseTrace(
      [
        toolUse('1', 'MultiEdit', { file_path: '/b.ts' }),
        toolUse('2', 'NotebookEdit', { file_path: '/a.ipynb' }),
        toolUse('3', 'Agent', { subagent_type: 'spec-reviewer' }),
        toolUse('4', 'Task', { subagent_type: 'test-auditor' }),
      ].join('\n'),
    );
    expect(more.filesChanged).toEqual(['/a.ipynb', '/b.ts']);
    expect(formatTraceSummary(more)).toContain('Subagents: spec-reviewer, test-auditor');
  });

  it('joins the text parts of a denial, skips non-text parts, and reads hook block messages', () => {
    const parts = [{ type: 'image' }, { type: 'text', text: 'Command' }, { type: 'text', text: 'blocked by the PreToolUse hook' }];
    expect(summariseTrace(toolError('1', parts)).denied).toEqual(['unknown call: Command blocked by the PreToolUse hook']);
    expect(summariseTrace(toolError('1', { text: 'permission denied' })).denied).toEqual([]); // not a string or list: no reason to read
    expect(summariseTrace(toolError('1', [null, { text: 'denied' }])).denied).toEqual(['unknown call: denied']);
  });

  it('trims leading blank lines before taking the first line, and keeps a 160-character command whole', () => {
    expect(summariseTrace(toolUse('1', 'Bash', { command: '\n  npm test\nnext' })).commands).toEqual(['npm test']);
    expect(summariseTrace(toolUse('1', 'Bash', { command: 'y'.repeat(160) })).commands).toEqual(['y'.repeat(160)]);
  });

  it('names a denied call it never saw as unknown', () => {
    expect(summariseTrace(toolError('9', 'Tool use not allowed in dontAsk mode')).denied).toEqual([
      'unknown call: Tool use not allowed in dontAsk mode',
    ]);
  });

  it('records a call only for the tool it belongs to, and labels denied edits and agents', () => {
    const mixed = summariseTrace(
      [
        toolUse('1', 'Read', { command: 'rm -rf /', file_path: '/read.ts', subagent_type: 'x' }),
        toolUse('2', 'Bash', { description: 'no command given' }),
        toolUse('3', 'Write', { content: 'no path given' }),
        toolUse('4', 'Agent', { prompt: 'no type given' }),
        JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', name: 'Bash', input: { command: 'echo' } }] } }),
        toolUse('5', 'Write', { file_path: '/w.ts' }),
        toolError('5', 'Permission to write denied'),
        toolUse('6', 'Agent', { subagent_type: 'faith-reviewer' }),
        toolError('6', 'Agent not allowed'),
        toolUse('7', 'Bash', { description: 'no command given' }),
        toolError('7', 'exit 1'),
      ].join('\n'),
    );
    expect(mixed).toEqual({
      commands: [],
      filesChanged: ['/w.ts'],
      subagents: ['faith-reviewer'],
      denied: ['Write /w.ts: Permission to write denied', 'Agent faith-reviewer: Agent not allowed'],
      failedCommands: 0,
      verdicts: { 'faith-reviewer': 'none' },
    });
  });

  it('leaves totals out when the result event does not report them', () => {
    const empty = summariseTrace(JSON.stringify({ type: 'result' }));
    expect(empty).toEqual({ commands: [], filesChanged: [], subagents: [], denied: [], failedCommands: 0, turns: undefined, costUsd: undefined });
    expect(formatTraceSummary(empty)).not.toContain('Run:');
  });
});

describe('formatTraceSummary', () => {
  it('prints totals, subagents, relative paths, commands and denials', () => {
    expect(formatTraceSummary(summariseTrace(log), '/repo')).toBe(
      [
        'Run: 12.6 min, 42 turns, $1.23',
        'Subagents: faith-reviewer',
        'Final reviewer verdicts: faith-reviewer none',
        'Files changed (2):',
        '  scripts/fetch-quran.ts',
        '  scripts/lib/tanzil.ts',
        'Commands (3, 1 failed):',
        '  $ npm test',
        '  $ git commit --no-verify -m x',
        '  $ npx vitest run tests/x.test.ts',
        'Denied (1):',
        '  ! git commit --no-verify -m x: Permission denied by PreToolUse hook: skipping git hooks is not allowed',
        'Final message: TICKET DONE: 01',
      ].join('\n'),
    );
  });

  it('keeps absolute paths when no root is given', () => {
    expect(formatTraceSummary(summariseTrace(toolUse('1', 'Write', { file_path: '/a.ts' })))).toContain('\n  /a.ts\n');
  });

  it('leaves out the run line when there are no totals, and keeps paths outside root absolute', () => {
    const summary = summariseTrace(toolUse('1', 'Write', { file_path: '/elsewhere/a.ts' }));
    expect(formatTraceSummary(summary, '/repo')).toBe(
      ['Subagents: none', 'Files changed (1):', '  /elsewhere/a.ts', 'Commands (0, 0 failed):', 'Denied (0):'].join('\n'),
    );
  });
});

describe('summariseTrace with several result events', () => {
  it('adds up turns and time across idle periods and keeps the latest cost and message', () => {
    const resumed = [
      JSON.stringify({ type: 'result', num_turns: 38, duration_ms: 103_767, total_cost_usd: 0.9, result: 'Reviewers running.' }),
      JSON.stringify({ type: 'result', num_turns: 1, duration_ms: 1_351, total_cost_usd: 1.0, result: 'Standards passed.' }),
      JSON.stringify({ type: 'result', num_turns: 9, duration_ms: 25_448, total_cost_usd: 1.3, result: 'TICKET DONE: 01' }),
    ].join('\n');
    expect(summariseTrace(resumed)).toMatchObject({ turns: 48, minutes: 2.2, costUsd: 1.3, finalMessage: 'TICKET DONE: 01' });
  });
});

const said = (parent: string, text: string) =>
  JSON.stringify({ type: 'assistant', parent_tool_use_id: parent, message: { content: [{ type: 'text', text }] } });

describe('summariseTrace reviewer verdicts', () => {
  it('takes each reviewer\'s verdict from its own latest run, not from the implementing agent', () => {
    const reviewLog = [
      toolUse('s1', 'Agent', { subagent_type: 'spec-reviewer' }),
      toolUse('f1', 'Agent', { subagent_type: 'faith-reviewer' }),
      said('s1', 'Reading the ticket.'),
      said('s1', '```\nVERDICT: changes-needed\nCRITERIA: ...'),
      said('f1', 'VERDICT: PASS'),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'All reviewers say VERDICT: pass' }] } }),
      toolUse('s2', 'Agent', { subagent_type: 'spec-reviewer' }),
      said('s2', 'Draft VERDICT: changes-needed, then after checking again:\nVERDICT: pass'),
    ].join('\n');
    expect(summariseTrace(reviewLog).verdicts).toEqual({ 'spec-reviewer': 'pass', 'faith-reviewer': 'pass' });
  });

  it('reports "none" when the latest run of a reviewer printed no verdict, even if an earlier run passed', () => {
    const reviewLog = [
      toolUse('t1', 'Agent', { subagent_type: 'test-auditor' }),
      said('t1', 'VERDICT: pass'),
      toolUse('t2', 'Agent', { subagent_type: 'test-auditor' }),
      said('t2', 'I ran out of time.'),
    ].join('\n');
    expect(summariseTrace(reviewLog).verdicts).toEqual({ 'test-auditor': 'none' });
  });

  it('does not count a subagent\'s own tool calls as the implementing agent\'s', () => {
    const subagentCall = JSON.stringify({
      type: 'assistant',
      parent_tool_use_id: 'a1',
      message: { content: [{ type: 'tool_use', id: 'x', name: 'Bash', input: { command: 'npm run mutate:changed' } }] },
    });
    const summary = summariseTrace([toolUse('a1', 'Agent', { subagent_type: 'test-auditor' }), subagentCall].join('\n'));
    expect(summary.commands).toEqual([]);
  });

  it('keeps a verdict when the reviewer writes more afterwards, and reads one with no space after the colon', () => {
    const reviewLog = [
      toolUse('s1', 'Agent', { subagent_type: 'spec-reviewer' }),
      toolUse('f1', 'Agent', { subagent_type: 'faith-reviewer' }),
      said('s1', 'VERDICT:pass'),
      said('s1', 'Anything else you need?'),
      JSON.stringify({ type: 'assistant', parent_tool_use_id: 'f1' }),
    ].join('\n');
    expect(summariseTrace(reviewLog).verdicts).toEqual({ 'spec-reviewer': 'pass', 'faith-reviewer': 'none' });
    expect(formatTraceSummary(summariseTrace(reviewLog))).toContain('Final reviewer verdicts: spec-reviewer pass, faith-reviewer none\n');
  });

  it('prints the final verdicts after the subagents', () => {
    const reviewLog = [toolUse('s1', 'Agent', { subagent_type: 'spec-reviewer' }), said('s1', 'VERDICT: changes-needed')].join('\n');
    expect(formatTraceSummary(summariseTrace(reviewLog))).toContain('Subagents: spec-reviewer\nFinal reviewer verdicts: spec-reviewer changes-needed\n');
  });
});
