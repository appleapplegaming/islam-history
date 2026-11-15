import { describe, expect, it } from 'vitest';
import { DEBUG_PROBE_KEY, formatDebugLines, publishDebugInfo } from '../src/systems/debug.ts';

describe('formatDebugLines', () => {
  it('shows scene id, refs and state', () => {
    expect(formatDebugLines({ sceneId: 'map', refs: ['12:4', '12:5-6'], state: { selected: 'yusuf', year: 3 } })).toEqual([
      'scene: map',
      'refs: 12:4, 12:5-6',
      'selected: yusuf',
      'year: 3',
    ]);
  });

  it('shows only the scene id when there is nothing else', () => {
    expect(formatDebugLines({ sceneId: 'map', refs: [] })).toEqual(['scene: map']);
  });
});

describe('publishDebugInfo', () => {
  it('puts the latest info on the target under the probe key, replacing the previous one', () => {
    const target: Record<string, unknown> = {};
    publishDebugInfo(target, { sceneId: 'map' });
    publishDebugInfo(target, { sceneId: 'yusuf', state: { year: 1 } });
    expect(target['__storyDebug']).toEqual({ sceneId: 'yusuf', state: { year: 1 } });
    expect(DEBUG_PROBE_KEY).toBe('__storyDebug');
  });
});
