---
paths:
  - "content/**"
  - "src/content/**"
---

# Story content

Each scene in `content/chapters/*.json` has at least `id`, `title`, `narration`, `refs` and
`certainty`, plus optional `tafsirNotes`.

- `refs`: every scene lists the ayat it is based on, e.g. `["12:4", "12:5-6"]`.
- `certainty`: `"quran"` or `"hadith"` by default; `hadith` names the collection and number.
  Anything from Isra'iliyyat or tradition (names, ages, places the Quran doesn't state) is
  `"tradition"` and gets a visible label in the game.
- `tafsirNotes`: each entry names its source and ayah. Use Tafsir Ibn Kathir (e.g. via
  Quran.com), and quote or summarise only what you actually fetched, never from memory.
- A detail you can't verify stays out of the content; add it to `docs/open-questions.md`.
- Never put Arabic Quran text or translations in content files. Reference ayat by `refs` and let
  the loader pull the text from `data/quran/`.
- `content/words.json` tracks the recurring Arabic words and the scenes they appear in.
