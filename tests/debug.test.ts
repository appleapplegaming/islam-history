import { describe, expect, it } from 'vitest';
import { formatDebugLines } from '../src/systems/debug.ts';

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
