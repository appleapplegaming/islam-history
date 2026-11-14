import { describe, expect, it } from 'vitest';
import { findUncreditedAssets } from '../src/content/credits.ts';

describe('findUncreditedAssets', () => {
  it('passes when every asset is listed in the credits', () => {
    expect(findUncreditedAssets(['assets/icon.svg'], '| `assets/icon.svg` | Template | MIT |')).toEqual([]);
  });

  it('reports assets missing from the credits', () => {
    expect(findUncreditedAssets(['assets/icon.svg', 'assets/map.png'], '`assets/icon.svg`')).toEqual(['assets/map.png']);
  });
});
