import { describe, expectTypeOf, it } from 'vitest';
import type { AyahBeat, Beat, NarrationBeat, Scene } from '../src/content/types.ts';

// Checked by `npm run typecheck` (tsc covers tests/): these fail to compile if the content
// model drifts from "a scene is a list of beats".
describe('content types', () => {
  it('tells a scene as a list of beats, with no scene-level narration', () => {
    expectTypeOf<Scene['beats']>().toEqualTypeOf<Beat[]>();
    expectTypeOf<Scene>().not.toHaveProperty('narration');
  });

  it('has exactly two beat kinds: narration with text, ayah with only a ref', () => {
    expectTypeOf<Beat>().toEqualTypeOf<NarrationBeat | AyahBeat>();
    expectTypeOf<NarrationBeat>().toEqualTypeOf<{ kind: 'narration'; text: string }>();
    expectTypeOf<AyahBeat>().toEqualTypeOf<{ kind: 'ayah'; ref: string }>();
  });
});
