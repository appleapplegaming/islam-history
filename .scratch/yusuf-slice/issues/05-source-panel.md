# 05: Source panel

**What to build:** from any beat of a scene, a key opens the source panel, which shows the scene's
ayat in full (every ayah in the scene's refs, ref + Arabic right-to-left + English, loaded from
`data/quran/`) with the Tanzil credit line. The same key or back closes it and returns to the same
beat; while it is open, interact does not advance the scene. The new key binding goes in the config
with the others and is shown as a hint on the scene. No tafsir notes yet. Spec:
`.scratch/yusuf-slice/spec.md`.

**Blocked by:** 03

**Status:** ready-for-agent

**Seams:** the scene playthrough module (the scene's ayat, resolved); the browser smoke test.

- [ ] The playthrough exposes the scene's ayat in ref order, resolved to the exact Arabic and English in `data/quran/`
- [ ] The new action has its own key in the config, used by no other action
- [ ] The panel opens from any beat and lists 12:19 and 12:20 in full with the credit line
- [ ] Closing the panel returns to the same beat; back closes the panel rather than leaving the scene
- [ ] While the panel is open, interact does not advance the scene
- [ ] Browser smoke test: open the panel on a beat, check both ayat are listed, close it, still on the same beat, no console errors
- [ ] `npm run check:full` passes
