// Pure summary of a Claude stream-json log (factory/afk.sh writes one per iteration). No Node
// imports, so tests/ can type-check it. Lets the human see what the agent did without reading code.

export interface TraceSummary {
  commands: string[];
  filesChanged: string[];
  subagents: string[];
  /** Tool calls refused by permissions or hooks, with the reason given. */
  denied: string[];
  failedCommands: number;
  turns?: number;
  costUsd?: number;
  minutes?: number;
  finalMessage?: string;
}

interface ContentBlock {
  type?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  is_error?: boolean;
  content?: unknown;
}

interface TraceEvent {
  type?: string;
  message?: { content?: ContentBlock[] };
  num_turns?: number;
  total_cost_usd?: number;
  duration_ms?: number;
  result?: string;
}

const DENIAL = /permission|denied|not allowed|blocked by .*hook/i;
const FILE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

function text(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part: { text?: unknown }) => (typeof part?.text === 'string' ? part.text : '')).join(' ');
}

function firstLine(value: string, max = 160): string {
  const line = value.trim().split('\n')[0] ?? '';
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

/** Summarises the JSON lines of a stream-json log; lines that are not JSON are ignored. */
export function summariseTrace(log: string): TraceSummary {
  const summary: TraceSummary = { commands: [], filesChanged: [], subagents: [], denied: [], failedCommands: 0 };
  const files = new Set<string>();
  const calls = new Map<string, { label: string; isCommand: boolean }>();
  for (const raw of log.split('\n')) {
    if (!raw.startsWith('{')) continue;
    let event: TraceEvent;
    try {
      event = JSON.parse(raw) as TraceEvent;
    } catch {
      continue; // a truncated last line when the run was killed; nothing to summarise in it
    }
    if (event.type === 'result') {
      summary.turns = event.num_turns;
      summary.costUsd = event.total_cost_usd;
      if (event.duration_ms !== undefined) summary.minutes = Math.round(event.duration_ms / 6000) / 10;
      if (event.result !== undefined) summary.finalMessage = firstLine(event.result, 300);
      continue;
    }
    for (const block of event.message?.content ?? []) {
      if (block.type === 'tool_use' && block.name) {
        const input = block.input ?? {};
        const command = input['command'];
        const filePath = input['file_path'];
        const subagent = input['subagent_type'];
        let label = block.name;
        let isCommand = false;
        if (block.name === 'Bash' && typeof command === 'string') {
          label = firstLine(command);
          isCommand = true;
          summary.commands.push(label);
        } else if (FILE_TOOLS.has(block.name) && typeof filePath === 'string') {
          files.add(filePath);
          label = `${block.name} ${filePath}`;
        } else if ((block.name === 'Agent' || block.name === 'Task') && typeof subagent === 'string') {
          summary.subagents.push(subagent);
          label = `Agent ${subagent}`;
        }
        if (block.id) calls.set(block.id, { label, isCommand });
      } else if (block.type === 'tool_result' && block.is_error) {
        const reason = firstLine(text(block.content));
        const call = calls.get(block.tool_use_id ?? '');
        if (DENIAL.test(reason)) summary.denied.push(`${call?.label ?? 'unknown call'}: ${reason}`);
        else if (call?.isCommand) summary.failedCommands++;
      }
    }
  }
  summary.filesChanged = [...files].toSorted();
  return summary;
}

/** Plain-text report of a summary for the terminal; paths under `root` are shown relative to it. */
export function formatTraceSummary(summary: TraceSummary, root = ''): string {
  const rel = (path: string): string => (root !== '' && path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path);
  const stats: string[] = [];
  if (summary.minutes !== undefined) stats.push(`${summary.minutes} min`);
  if (summary.turns !== undefined) stats.push(`${summary.turns} turns`);
  if (summary.costUsd !== undefined) stats.push(`$${summary.costUsd.toFixed(2)}`);
  const lines: string[] = [];
  if (stats.length > 0) lines.push(`Run: ${stats.join(', ')}`);
  lines.push(`Subagents: ${summary.subagents.length > 0 ? summary.subagents.join(', ') : 'none'}`);
  lines.push(`Files changed (${summary.filesChanged.length}):`, ...summary.filesChanged.map((f) => `  ${rel(f)}`));
  lines.push(`Commands (${summary.commands.length}, ${summary.failedCommands} failed):`, ...summary.commands.map((c) => `  $ ${c}`));
  lines.push(`Denied (${summary.denied.length}):`, ...summary.denied.map((d) => `  ! ${d}`));
  if (summary.finalMessage !== undefined) lines.push(`Final message: ${summary.finalMessage}`);
  return lines.join('\n');
}
