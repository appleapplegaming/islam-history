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

/** Where the latest debug info is published, for the browser smoke tests in e2e/. */
export const DEBUG_PROBE_KEY = '__storyDebug';

/**
 * Publishes the current debug info on the given global object, overlay visible or not, so the
 * browser smoke tests can check game state without reading pixels.
 */
export function publishDebugInfo(target: object, info: DebugInfo): void {
  Reflect.set(target, DEBUG_PROBE_KEY, info);
}
