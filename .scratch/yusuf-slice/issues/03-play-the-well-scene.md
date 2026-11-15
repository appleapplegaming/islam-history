# 03: Play the well scene (ayah beats only)

**What to build:** the tracer bullet through every layer. The Yusuf (as) marker on the map becomes
playable and opens the first scene of the Yusuf chapter: refs `12:19-20`, certainty `quran`, made
of exactly two ayah beats (12:19, then 12:20). No narration yet (that is ticket 07, which needs the
human's approval). The player advances with Enter, Space or a click and returns to the map with
Escape, or by advancing past the last beat. Each ayah beat shows the whole ayah, Arabic
right-to-left in the Amiri Quran font above the Sahih International English, with a credit line:
Quran text from the Tanzil Project (tanzil.net), translation Sahih International (required by the
Tanzil licence). Placeholder art only, in the style of the map. Spec: `.scratch/yusuf-slice/spec.md`.

**Blocked by:** 02

**Status:** ready-for-agent

**Seams:** the scene playthrough module (pure, no Phaser): start a scene from chapter content and
Quran data, current beat already resolved, `advance()`, finished, unlocked refs. The browser smoke
test through the existing debug probe.

- [ ] The chapter file for Yusuf exists with one scene, refs `12:19-20`, certainty `quran`, beats: ayah 12:19, ayah 12:20; it passes `npm run validate`, and a test runs the real chapter file through the validator
- [ ] The loader loads the chapter and the surah data and fails loudly, naming the file and scene, when the content is invalid
- [ ] The playthrough resolves each ayah beat to exactly the Arabic and English in `data/quran/surah-012.json` (tested against the real data), advances in order, reports finished after the last beat, and reports `12:19` and `12:20` as the refs it unlocks
- [ ] The Yusuf (as) marker is playable; clicking it or pressing Enter on it opens the scene
- [ ] Interact advances one beat; back returns to the map from any beat; advancing past the last beat returns to the map
- [ ] Arabic is rendered right-to-left in Amiri Quran, self-hosted in `assets/fonts/` and listed with its licence (SIL OFL) in `assets/CREDITS.md`
- [ ] Every ayah beat shows the Tanzil and Sahih International credit line with tanzil.net
- [ ] No figure or shape of any prophet is drawn; prophets have no text of their own
- [ ] The scene publishes its state (scene id, current beat, refs) through the debug probe
- [ ] Browser smoke test: map → Yusuf marker → both beats → back on the map, with no console errors, screenshots of each beat
- [ ] `npm run check:full` passes
