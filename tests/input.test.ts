import { describe, expect, it } from 'vitest';
import { INPUT_BINDINGS } from '../src/config.ts';
import { actionForCode, findBindingConflicts } from '../src/systems/input.ts';

describe('actionForCode', () => {
  it('maps a bound key code to its action', () => {
    expect(actionForCode('Enter', INPUT_BINDINGS)).toBe('interact');
    expect(actionForCode('KeyA', INPUT_BINDINGS)).toBe('move_left');
    expect(actionForCode('Backquote', INPUT_BINDINGS)).toBe('toggle_debug');
  });

  it('returns undefined for an unbound code', () => {
    expect(actionForCode('KeyQ', INPUT_BINDINGS)).toBeUndefined();
  });
});

describe('findBindingConflicts', () => {
  it('finds no conflicts in the game config', () => {
    expect(findBindingConflicts(INPUT_BINDINGS)).toEqual([]);
  });

  it('reports a code bound to two actions', () => {
    expect(findBindingConflicts({ a: ['Space'], b: ['Space', 'KeyB'] })).toEqual(['Space']);
  });
});
