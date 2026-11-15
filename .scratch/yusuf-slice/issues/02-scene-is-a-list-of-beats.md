# 02: A scene is a list of beats

**What to build:** a prefactor of the content model so that a scene is told as an ordered list of
beats instead of a single narration string (see `GLOSSARY.md`: beat, ayah beat, narration). A beat is
either a narration beat (text) or an ayah beat (one ref to a single ayah; it carries no text of its
own, the text is resolved later from `data/quran/`). The validator learns the new shape so that bad
chapter content can never be committed. No chapter file exists yet, so nothing else changes. Spec:
`.scratch/yusuf-slice/spec.md`.

**Blocked by:** None (can start immediately)

**Status:** in-progress
**Started at:** 76aea9b

**Seams:** `validateChapter()`.

- [ ] The content types describe a scene with `beats` (narration beat or ayah beat) and no longer have a scene-level `narration` field
- [ ] `validateChapter()` reports a scene whose `beats` is missing or empty
- [ ] `validateChapter()` reports a beat of an unknown kind
- [ ] `validateChapter()` reports a narration beat with missing or blank text
- [ ] `validateChapter()` reports an ayah beat whose ref is malformed, is a range rather than a single ayah, does not exist in `data/quran/`, or is not inside the scene's refs
- [ ] Every report names the file, the scene and the beat's position
- [ ] A valid scene with both beat kinds passes with no errors, and the existing checks (refs, certainty, hadith, tradition, tafsir notes) still behave as before
- [ ] `npm run check` passes

## Comments

**Agent, 2026-11-15: blocked on a guardrail file. A human needs to approve.**

The ticket's only seam, `validateChapter()`, is in `src/content/validate.ts`. That file is in
`GUARDRAIL_PATHS` (`scripts/factory/guard-rules.ts:46`), so the guard refuses any commit that touches it:

```
Guard failed with 1 violation(s):
  - [guardrails] src/content/validate.ts: changes a file that enforces quality
```

`docs/factory.md` says only a human may override this with `FACTORY_ALLOW=guardrails`, so I stopped
rather than work around it. The ticket can't be done without changing that file.

Work so far is saved, uncommitted, in `.scratch/yusuf-slice/issues/02-wip.patch` (first TDD step, green
locally: `Scene.narration` replaced by `beats: Beat[]` with `NarrationBeat | AyahBeat` types, the
validator reports `has no beats`, and tests are updated plus 2 new ones). The working tree was reset to HEAD.

Also out of date, and also a guardrail: `.claude/rules/content.md` still lists `narration` as a
required scene field. It should say `beats` once this lands.

**Questions:**
1. Will you approve the guardrail change to `src/content/validate.ts` for this ticket? Some ways to do it:
   (a) you finish it yourself and commit with `FACTORY_ALLOW=guardrails`, (b) the agent builds the whole
   change and leaves it uncommitted for you to review and commit with the override, or (c) you move the
   beat checks into a new non-guardrail module (e.g. `src/content/beats.ts`) that `validateChapter()` calls.
   That still needs a one-time guardrail edit to wire it in, and the new module would then probably
   need adding to `GUARDRAIL_PATHS`.
2. Should `.claude/rules/content.md` be updated in the same approved commit?

**Human, 2026-11-15 (answer to 1):** `src/content/{validate,refs,honorifics,credits}.ts` are no
longer guardrail files (commit 1fde0dd), so this ticket can now be built normally. You can start from
`02-wip.patch` (apply it with `git apply`, then delete it). Question 2 is still open: `.claude/rules/content.md`
is still a guardrail, so leave it alone and mention it in the review brief.
