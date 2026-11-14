# Stories of the Prophets

A browser game for studying the stories of the prophets as told in the Quran
(TypeScript + Phaser 3 + Vite, no backend). The player is an adult Muslim using it to learn,
so accuracy matters more than anything else: if a detail can't be verified, leave it out and
add it to `docs/open-questions.md`.

Game design, chapter plan and planned layout: `docs/design.md`. Read it before building a new feature.

<!-- More rules load automatically from .claude/rules/ when Claude touches matching files:
     content.md (content/**), quran-data.md (data/quran, fetch script), validation.md (scripts/**),
     code.md (TypeScript), art.md (assets, Phaser scenes). Edits to data/quran/ are denied in
     .claude/settings.json. -->

## Commands

- `npm run dev`: run the game locally
- `npm test`: Vitest unit tests
- `npm run validate`: content validation, must pass before every commit

## Religious rules

These have no exceptions.

- No depiction of prophets, angels, or the Prophet Muhammad's ﷺ family and companions: no sprites,
  portraits, silhouettes, faces or figures. Show a prophet's presence through light, narration or
  other characters' reactions. The player is an ordinary witness to the story, never the prophet.
- Prophets have no voice or dialogue of their own. Their words appear only as Quran text loaded
  from `data/quran/`, or in narration ("Yusuf told his father...").
- Never write Quran text or translations yourself: not from memory, not retyped, not paraphrased
  as a quote, not "fixed". They are only ever loaded from `data/quran/`.
- No game-over or failure tied to a prophet, no combat involving prophets, no humour at the
  expense of the stories. Enemies (e.g. Pharaoh's army) are obstacles to escape, not targets.
- Honorifics in all text: ﷺ after the Prophet Muhammad, (عليه السلام) or (as) after other prophets.

## Working agreement

- Build in small vertical slices. Yusuf (Surah 12) is the first chapter and is finished as a
  complete slice before any other chapter starts.
- Commit after every working step.
- After each change, run `npm test` and `npm run validate`, and say what to test by hand.
- Ask before adding a new dependency.
