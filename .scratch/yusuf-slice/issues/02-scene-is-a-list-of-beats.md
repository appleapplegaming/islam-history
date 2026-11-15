# 02: A scene is a list of beats

**What to build:** a prefactor of the content model so that a scene is told as an ordered list of
beats instead of a single narration string (see `GLOSSARY.md`: beat, ayah beat, narration). A beat is
either a narration beat (text) or an ayah beat (one ref to a single ayah; it carries no text of its
own, the text is resolved later from `data/quran/`). The validator learns the new shape so that bad
chapter content can never be committed. No chapter file exists yet, so nothing else changes. Spec:
`.scratch/yusuf-slice/spec.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Seams:** `validateChapter()`.

- [ ] The content types describe a scene with `beats` (narration beat or ayah beat) and no longer have a scene-level `narration` field
- [ ] `validateChapter()` reports a scene whose `beats` is missing or empty
- [ ] `validateChapter()` reports a beat of an unknown kind
- [ ] `validateChapter()` reports a narration beat with missing or blank text
- [ ] `validateChapter()` reports an ayah beat whose ref is malformed, is a range rather than a single ayah, does not exist in `data/quran/`, or is not inside the scene's refs
- [ ] Every report names the file, the scene and the beat's position
- [ ] A valid scene with both beat kinds passes with no errors, and the existing checks (refs, certainty, hadith, tradition, tafsir notes) still behave as before
- [ ] `npm run check` passes
