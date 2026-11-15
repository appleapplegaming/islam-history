# 06: Presence as light at the well

**What to build:** the scene's placeholder setting and the presence of Yusuf (as) shown only as light.
The scene draws a placeholder well and caravan from simple shapes (no human figures needed, never a
figure of a prophet). A beat can be marked in the content as the moment the light rises; in this
scene that is the 12:19 ayah beat. From that beat on, a soft warm light rises from the well and stays
near the caravan to the end of the scene, including when the player moves back through the scene
or reopens it. Light colour, size and timing live in the config. Spec: `.scratch/yusuf-slice/spec.md`.

**Blocked by:** 03

**Status:** ready-for-agent

**Seams:** `validateChapter()` (the light marker), the scene playthrough module (whether the light
is present on the current beat), the browser smoke test.

- [ ] The content can mark one beat per scene as the moment the light rises; `validateChapter()` reports a scene that marks more than one
- [ ] The playthrough reports no light before the marked beat and light on it and every beat after it
- [ ] The well scene marks the 12:19 ayah beat
- [ ] The scene shows a placeholder well and caravan; the light appears from the marked beat on and stays to the end
- [ ] Nothing drawn has the shape, outline or silhouette of a person standing for Yusuf (as)
- [ ] The debug probe reports whether the light is shown
- [ ] Browser smoke test: no light on the beat before the marker, light on the marked beat and after, screenshots of both, no console errors
- [ ] `npm run check:full` passes
