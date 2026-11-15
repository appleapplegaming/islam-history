# Spec: the first Yusuf scene, at the well (12:19-20)

**Status:** ready-for-agent

Settled in a grilling session on 2026-11-15. Vocabulary: `GLOSSARY.md` (chapter, scene, beat, ayah
beat, narration, witness, ref, certainty, ayat journal, source panel). Religious rules: `CLAUDE.md`.

## Problem Statement

The game has a map hub and verified Quran data for Surah Yusuf, but nothing to play. As an adult
Muslim studying the stories of the prophets, I cannot yet live through any part of the story, see
the ayat it rests on, or keep the ayat I have studied. There is no way yet to tell whether the
whole idea (a witness, narration, ayat unlocked into a journal) works in practice.

## Solution

The first playable scene of the Yusuf (as) chapter, built as a thin vertical slice through
content, loader, scene, ayat journal and source panel.

The player clicks the Yusuf (as) marker on the map and becomes an unnamed traveller in the caravan
of 12:19. They read through the scene beat by beat: narration beats in second person, present
tense, and ayah beats that show 12:19 and 12:20 whole, in Arabic and English, loaded from
`data/quran/`. When the water-drawer's bucket comes up, a soft warm light rises from the well and
stays near the caravan; Yusuf (as) himself is never drawn. The scene ends at the sale (12:20),
shows the ayat it unlocked, and returns to the map. The ayat journal, opened from the map, keeps
the unlocked ayat across reloads. A source panel shows the scene's ayat from any beat. Every screen
showing ayat credits Tanzil.

## User Stories

1. As a player, I want the Yusuf (as) marker on the map to be playable, so that I can start the chapter.
2. As a player, I want clicking the marker or pressing Enter on it to open the first scene, so that mouse and keyboard both work.
3. As a player, I want to be an unnamed traveller in the caravan, so that I witness the story without being the prophet or a named person from the Quran.
4. As a player, I want the scene to begin at the well with no introduction and no place name, so that I know only what a traveller there would know.
5. As a player, I want to advance one beat at a time with Enter, Space or a click, so that I read at my own pace.
6. As a player, I want narration beats written as "you" in the present tense, so that I feel present and never mistake narration for Quran text.
7. As a player, I want ayah beats to show a whole ayah in Arabic and English, so that I read the Quran's own words in context.
8. As a player, I want the Arabic shown right-to-left in a proper Quran font, so that the Uthmani text and its marks render correctly.
9. As a player, I want the water-drawer's words to appear only inside the full 12:19, so that no ayah is cut into a dialogue line.
10. As a player, I want Yusuf (as)'s presence shown only as light rising from the well, so that he is never depicted.
11. As a player, I want the light to stay near the caravan until the scene ends, so that his presence is felt throughout.
12. As a player, I want the narration to call him "the boy", as the ayah does, so that the narrator knows no more than the witness.
13. As a player, I want the narration not to say who sold him in 12:20, so that it does not settle a question the ayah leaves open.
14. As a player, I want the scene to end at the sale, so that the arrival in Egypt (12:21) is kept for its own scene.
15. As a player, I want the end of the scene to show which ayat I unlocked, so that I know what I can now study.
16. As a player, I want Escape to return to the map from any beat, so that I can always leave.
17. As a player, I want to replay the scene from the map, so that I can read it again.
18. As a player, I want replaying not to unlock the same ayat twice, so that my journal stays clean.
19. As a player, I want to open the ayat journal from the map, so that I can study what I unlocked.
20. As a player, I want one journal entry per ayah, in surah and ayah order, so that the journal reads like the mushaf.
21. As a player, I want each entry to show the ref, the Arabic above and the English below, so that I can compare them.
22. As a player, I want my journal to survive a page reload, so that my progress is kept between sessions.
23. As a player whose browser blocks storage, I want the game to keep working with progress for this session only, so that a storage problem never breaks the game.
24. As a player, I want to open the source panel from any beat with a key, so that I can check the ayat behind the scene at any moment.
25. As a player, I want the source panel to list the scene's ayat in full, so that I can see exactly what the scene is based on.
26. As a player, I want every screen that shows ayat to credit Tanzil and Sahih International with a link to tanzil.net, so that the text's source is clear and the licence is respected.
27. As the author, I want each scene to declare its refs and certainty (`quran` for this scene), so that every scene says where it comes from.
28. As the author, I want `npm run validate` to reject a scene with no beats, an unknown beat kind, an ayah beat that is not a single ayah, or an ayah beat outside the scene's refs, so that bad content never reaches the game.
29. As the author, I want the validator's existing checks (Arabic outside `data/quran/`, honorifics, refs) to cover narration beats, so that narration cannot smuggle in Quran text.
30. As the author, I want every narration beat drafted strictly from the ayat and checked by the faith-reviewer, then approved by me, so that no unverified detail enters the game.
31. As the author, I want the Amiri Quran font and the scene's placeholder art listed in `assets/CREDITS.md`, so that every asset's licence is recorded.

## Implementation Decisions

- **Content model.** A scene keeps `id`, `title`, `refs`, `certainty` (and the existing hadith,
  tradition and tafsir fields), but its single `narration` string is replaced by an ordered list of
  `beats`. A beat is one of two kinds: a narration beat (text) or an ayah beat (one ref to a single
  ayah). Ayah beats carry no text of their own; the text is resolved from `data/quran/`.
- **The scene content.** Chapter `yusuf`, surah 12, first scene based on refs `12:19-20`,
  certainty `quran`. Witness: an unnamed traveller in the caravan, not the water-drawer. Narration
  is second person, present tense; it calls Yusuf (as) "the boy", gives no place name for the well,
  never names the seller in 12:20, and has no invented dialogue for anyone. Ayah beats show 12:19
  and 12:20 whole.
- **Scene playthrough module** (new, pure TypeScript in `systems`, no Phaser). Starts a scene from
  the chapter content and the Quran data. Exposes the current beat already resolved (narration text,
  or an ayah with ref, Arabic and English), `advance()`, whether the scene is finished, and the refs
  the scene unlocks when it finishes. It is the only place the flow of a scene lives.
- **Ayat journal module** (new, pure). `unlock(refs)` adds ayat (a range ref unlocks each ayah in
  it), ignoring ones already unlocked; `entries()` returns one entry per ayah sorted by surah then
  ayah. It persists through a small injected storage interface: the game passes localStorage; when
  storage throws or is unavailable, the journal keeps working in memory for the session and warns
  once in the console.
- **Loader.** Loads the chapter JSON and the needed `data/quran/` surah and checks the chapter
  against the content types, failing loudly with the file and scene if anything is wrong.
- **Validator.** `validateChapter()` is extended for beats: a non-empty `beats` list, only known
  beat kinds, narration beats with non-empty text, ayah beats whose ref is a single existing ayah
  inside the scene's refs. The old `narration` field is no longer required.
- **Phaser scenes stay thin.** A chapter scene renders the current beat from the playthrough
  module, the light at the well, and the end-of-scene unlock summary; a journal scene and the source
  panel render from the journal module and the scene's refs. They hold no logic of their own and
  publish their state through the existing debug probe for the browser tests.
- **Presence as light.** A soft warm light rises from the well when the bucket comes up (the beat
  showing 12:19 or the narration just before it) and stays near the caravan to the end of the scene.
  No shape, outline or silhouette of a person.
- **Input.** Uses the existing actions: interact advances, back returns to the map. One new action
  opens and closes the source panel; the journal opens from the map with another key or a button.
  New bindings go in the config with the rest.
- **Map.** The Yusuf (as) marker stays on Egypt and becomes playable. A way to open the journal is
  added to the map.
- **Font.** Amiri Quran (SIL Open Font License), self-hosted in `assets/fonts/`, credited in
  `assets/CREDITS.md`. Approved as a new asset dependency on 2026-11-15.
- **Credit line.** Every screen that shows ayat (ayah beats, journal, source panel) shows a small
  line: Quran text from the Tanzil Project (tanzil.net), translation Sahih International.
- **Art.** Placeholder shapes, gradients and text in the style of the map. All tuning values (colours,
  light, timings, layout) live in the config.

## Testing Decisions

- A good test checks behaviour through a public seam, never internals: what the player would see
  next, what is unlocked, what the validator reports. Tests must survive a rewrite of the inside of
  the module.
- **Seams**, agreed with the user:
  1. `validateChapter()` (existing): bad beats, refs and kinds are reported with the scene named.
     Prior art: `tests/validate.test.ts`.
  2. Scene playthrough (new): beats in order, ayah beats resolved to the exact Arabic and
     English from the data, finished state, unlocked refs. Tested with the real
     `data/quran/surah-012.json` as well as small fixtures. Prior art: `tests/refs.test.ts`,
     `tests/quran-data.test.ts`.
  3. Ayat journal (new): unlock, ordering, no duplicates, range refs, persistence across a new
     journal on the same storage, and the in-memory fallback with a storage fake that throws.
  4. Browser smoke test (existing debug probe in `e2e/`): map → Yusuf (as) marker → every beat →
     end screen lists 12:19 and 12:20 → map → journal shows both → reload → still there; the source
     panel opens from a beat; no console errors. Prior art: `e2e/map.spec.ts`.
- The real chapter file is run through the validator in a test, so the shipped content is always
  checked, not just fixtures.
- New code meets the factory's 90% mutation score on changed lines.

## Out of Scope

- Tafsir notes in the source panel, and checking the tafsir on who sold Yusuf (as) in 12:20 (logged
  in `docs/open-questions.md`).
- Any scene other than 12:19-20, including an introduction covering 12:4-18 and the arrival in
  Egypt (12:21).
- Walking, exploration or a chapter mechanic; the scene is read and advance only.
- Real art, music and sound.
- The full credits screen, the reflection screen and recurring words.
- Resetting progress.

## Further Notes

- Every narration beat needs the human's approval, so the ticket that adds the scene's narration is
  `ready-for-human`, after the faith-reviewer has checked it against the ayat and Sahih International.
- The arrangement of beats (how many, where the ayah beats fall) is drafted with the narration and
  approved together with it.
- Arabic in code must be built with `String.fromCodePoint`, never `\u` escapes or literals, so the
  validator's Arabic check keeps passing.
