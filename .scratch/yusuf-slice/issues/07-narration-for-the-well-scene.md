# 07: Narration for the well scene

**What to build:** the narration beats of the well scene, so the player lives through 12:19-20 as an
unnamed traveller in the caravan. The agent drafts narration beats around the two ayah beats,
strictly from 12:19-20 and their Sahih International translation, adding no detail beyond them.
Narration is second person, present tense ("you"). The human approves every beat before this
ticket is done. Spec: `.scratch/yusuf-slice/spec.md`; open question on 12:20 in
`docs/open-questions.md`.

**Blocked by:** 03, 06

**Status:** ready-for-human

**Seams:** `validateChapter()` on the real chapter file; the browser smoke test.

- [ ] The scene has narration beats before, between and/or after the two ayah beats, and still shows 12:19 and 12:20 whole as ayah beats
- [ ] Narration is second person, present tense, and the witness is an unnamed traveller who is not the water-drawer
- [ ] Narration calls Yusuf (as) only "the boy", gives no place name for the well, and does not say who sold him in 12:20
- [ ] No narration quotes, paraphrases as a quote, or retells as dialogue any words from the ayat, and no character has invented dialogue
- [ ] Every detail in the narration can be traced to 12:19 or 12:20; the review brief lists each beat next to the words of the ayah it rests on
- [ ] The light marker sits on the beat where the bucket comes up (the 12:19 ayah beat, or the narration beat just before it)
- [ ] The faith-reviewer passes the narration
- [ ] The human has approved every beat (recorded under `## Comments`)
- [ ] The browser smoke test walks every beat of the final scene
- [ ] `npm run check:full` passes
