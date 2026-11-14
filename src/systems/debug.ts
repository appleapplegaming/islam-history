export interface DebugInfo {
  sceneId: string;
  refs?: readonly string[];
  state?: Readonly<Record<string, unknown>>;
}

/** Formats the lines shown by the debug overlay. */
export function formatDebugLines(info: DebugInfo): string[] {
  const lines = [`scene: ${info.sceneId}`];
  if (info.refs && info.refs.length > 0) lines.push(`refs: ${info.refs.join(', ')}`);
  for (const [key, value] of Object.entries(info.state ?? {})) {
    lines.push(`${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
  }
  return lines;
}
