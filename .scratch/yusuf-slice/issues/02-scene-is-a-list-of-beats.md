# 02: A scene is a list of beats

**What to build:** a prefactor of the content model so that a scene is told as an ordered list of
beats instead of a single narration string (see `GLOSSARY.md`: beat, ayah beat, narration). A beat is
either a narration beat (text) or an ayah beat (one ref to a single ayah; it carries no text of its
own, the text is resolved later from `data/quran/`). The validator learns the new shape so that bad
chapter content can never be committed. No chapter file exists yet, so nothing else changes. Spec:
`.scratch/yusuf-slice/spec.md`.

**Blocked by:** None (can start immediately)

**Status:** done
**Started at:** 2b5b66f

**Seams:** `validateChapter()`.

- [x] The content types describe a scene with `beats` (narration beat or ayah beat) and no longer have a scene-level `narration` field
- [x] `validateChapter()` reports a scene whose `beats` is missing or empty
- [x] `validateChapter()` reports a beat of an unknown kind
- [x] `validateChapter()` reports a narration beat with missing or blank text
- [x] `validateChapter()` reports an ayah beat whose ref is malformed, is a range rather than a single ayah, does not exist in `data/quran/`, or is not inside the scene's refs
- [x] Every report names the file, the scene and the beat's position
- [x] A valid scene with both beat kinds passes with no errors, and the existing checks (refs, certainty, hadith, tradition, tafsir notes) still behave as before
- [x] `npm run check` passes

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

**Agent, 2026-11-15 (second attempt): still blocked, this time by the agent permissions, not the guard.**

Commit 1fde0dd took `src/content/{validate,refs,honorifics,credits}.ts` out of `GUARDRAIL_PATHS`, but
`.claude/settings.json` still lists all four under `permissions.ask` (lines 52-55):

```
"Edit(/src/content/validate.ts)",
"Edit(/src/content/honorifics.ts)",
"Edit(/src/content/credits.ts)",
"Edit(/src/content/refs.ts)",
```

The factory runs with no human to answer, so an `ask` rule means denied. My Edit to
`src/content/validate.ts` was refused ("Permission to use Edit has been denied because Claude Code is
running in don't ask mode"). I can't fix this myself: `.claude/**` is also on the `ask` list, and
editing the agent's own permissions is a human call. (`git apply` of the WIP patch was also denied,
so I applied the `types.ts` and test parts by hand, confirmed they go red as expected, then restored
the working tree. `02-wip.patch` is untouched and still the starting point.)

**Question:**

1. Please remove those four `Edit(/src/content/...)` lines from `permissions.ask` in
   `.claude/settings.json` (so the permissions match the guard after 1fde0dd), then set this ticket
   back to `ready-for-agent`. If you'd rather keep `refs.ts`, `honorifics.ts` and `credits.ts` behind
   `ask`, removing only `validate.ts` is enough for this ticket.
2. Optional: add `Bash(git apply *)` to `permissions.allow` so the next iteration can apply
   `02-wip.patch` directly. Without it I'll re-apply it by hand, which works fine.

## Review brief

**Result:** chapter content now tells each scene as an ordered list of beats (narration text or a single-ayah ref), and `npm run validate` rejects any badly formed beat with a message naming the file, scene and beat number.
**Commits:** 2b5b66f..fd70ade (5 commits, plus this one)

### Acceptance criteria

| Criterion                                                             | Evidence (would fail without this change)                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types: scene has `beats`, no `narration`                              | `tests/content-types.test.ts > tells a scene as a list of beats, with no scene-level narration`, `> has exactly two beat kinds` (checked by `npm run typecheck`; re-adding `narration` to `Scene` made it fail with TS2554)                                               |
| Reports missing/empty `beats`                                         | `tests/validate.test.ts > fails when a scene has no beats`, `> no longer reads a scene-level narration field`                                                                                                                                                             |
| Reports unknown beat kind                                             | `tests/validate.test.ts > fails on a beat of an unknown kind, naming its position`                                                                                                                                                                                        |
| Reports missing/blank narration text                                  | `tests/validate.test.ts > fails on a narration beat with missing or blank text`                                                                                                                                                                                           |
| Ayah beat: malformed / range / not in data/quran / outside scene refs | `tests/validate.test.ts > fails on an ayah beat whose ref is missing or malformed`, `> ...is a range, not a single ayah`, `> ...is not in data/quran`, `> fails on an ayah beat outside the scene's refs`, `> matches an ayah beat against the scene's refs by surah too` |
| Every report names file, scene, beat position                         | Every beat test asserts the full string `y.json scene "s1" beat #N: ...`; `> names the scene by position when it has no id`                                                                                                                                               |
| Valid two-kind scene passes; old checks unchanged                     | `tests/validate.test.ts > accepts a scene with both beat kinds, an ayah beat anywhere inside a range ref`; existing refs/certainty/hadith/tradition/tafsir tests kept, with only the fixture changed                                                                      |
| `npm run check` passes                                                | `npm run check:full`: typecheck, lint, 259 tests, validate and e2e all pass                                                                                                                                                                                               |

**Screenshots:** no screen change.

### Automated review

- Spec: pass in round 2. Round 1 marked the types criterion partial because no check would fail without the types change. I fixed this by adding `tests/content-types.test.ts`.
- Standards: pass in round 2. Round 1 flagged `.claude/rules/content.md` (left alone on the human's instruction) and a stale `docs/design.md:40`, which I fixed. Two small smells are left on purpose because they match the file's existing style: refs are parsed twice (`checkRefExists` then `parseRef`), and `BEAT_KINDS` repeats the kind literals.
- Faith and accuracy: pass. There is no player-facing text. `AyahBeat` carries only a ref and never stores Quran text, and only `narration` or `ayah` beats are allowed, so a "dialogue" beat for a prophet can't be added. The honorific and Arabic-text checks scan the whole JSON, so they still cover beat text.
- Tests: 100% of 74 mutants killed on the changed lines, with no equivalent mutants left. 3 survived at first in `validRanges` and two new tests now kill them. e2e: no screen change.

### Decisions I made

- If a scene has no valid refs, its ayah beats are not checked for being inside the scene's refs. The bad scene ref is already reported, so this avoids a second, misleading error for the same problem.
- A ref such as `12:4-4` counts as a range and is rejected: an ayah beat must be written `surah:ayah`.
- Updated `docs/design.md:40` (content layout comment) to say `beats` instead of `narration`.

### Open questions and risks

- `.claude/rules/content.md` still lists `narration` as a required scene field. It is a guardrail, so it is left for you to change to `beats` (narration beats and single-ayah beats, never empty).
- `.scratch/yusuf-slice/issues/02-wip.patch` is fully applied but still in the repo, because agent permissions refused `git rm`. Please delete it.

### Try it yourself (about 2 minutes)

No chapter file exists yet, so nothing shows in the game. Check the validator directly:

1. `npm test -- tests/validate.test.ts tests/content-types.test.ts`: expect 36 tests to pass.
2. `npm run validate`: expect `Validation passed.`
3. Most likely failure: in `src/content/types.ts`, add `narration: string;` back to `Scene`, run `npm run typecheck` and expect it to fail. Then revert the change.
