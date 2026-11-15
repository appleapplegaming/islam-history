# 01: Fetch Surah Yusuf into data/quran

**What to build:** a script, `scripts/fetch-quran.ts`, that downloads Surah Yusuf (12) from
Tanzil.net (Uthmani Arabic) and the Sahih International English translation from the same verified
source, and writes `data/quran/surah-012.json` in the format `scripts/validate.ts` already reads:
`{ "surah": 12, "ayat": [{ "number": 1, "arabic": "...", "translation": "..." }, ...] }`. The
Tanzil licence notice goes in `data/quran/LICENSE`. After this, `npm run validate` can check refs
against real Quran data.

**Blocked by:** None (can start immediately)

**Status:** in-progress
**Started at:** 8584d57

**Seams:** the pure function that turns the downloaded Tanzil text into the JSON shape (unit-tested
with a small fixture); the script itself is a thin IO wrapper.

- [x] `node scripts/fetch-quran.ts` writes `data/quran/surah-012.json` with exactly 111 ayat, numbered 1 to 111
- [x] Every ayah has non-empty `arabic` and `translation`, taken unaltered from Tanzil (no trimming beyond surrounding whitespace, no normalisation)
- [x] `data/quran/LICENSE` contains the Tanzil licence notice as published by Tanzil
- [x] Running the script twice produces byte-identical files
- [x] The script fails with a clear message (and writes nothing) if a download fails or the ayah count is not 111
- [x] No Quran text appears anywhere outside `data/quran/` (`npm run validate` passes)

## Comments

**Human decision needed before an agent can start:** `scripts/` is not type-checked because
`@types/node` is not installed. Either approve adding `@types/node` as a dev dependency (and include
`scripts` in `tsconfig.json`), or confirm the script stays un-type-checked with its logic in a pure,
tested module. Then set the status to `ready-for-agent`.

**Decision (2026-11-15):** `@types/node` is approved and installed. `scripts/` is now type-checked
through `tsconfig.node.json` (part of `npm run typecheck`), so the script can use Node APIs with full
types. Put the parsing in a pure module under `scripts/lib/` (no Node imports) with unit tests, as the
Seams say: files there are mutation-tested, and new code needs a 90% score.


**Review feedback (human, 2026-11-15):**

1. **Basmala: remove it from 12:1.** Tanzil prefixes the basmala to the first ayah of each surah,
   but it is not part of 12:1, and the translation of 12:1 does not include it. The JSON must
   hold 12:1 without it. This overrides "taken unaltered" for this one case only: removing a
   prefix Tanzil adds is not changing an ayah, and nothing else may be trimmed or normalised.
   How: never type the basmala (no Arabic in code, ever). Take it from Tanzil's own text of
   1:1 (Al-Fatiha's first ayah is the basmala), and strip it from the start of 12:1 only if
   12:1 starts with exactly that text followed by whitespace; otherwise fail with a clear
   message. Test it with fixture text, add the data test that 12:1 no longer starts with 1:1's
   text, and remove the basmala item from `docs/open-questions.md`.
2. **Full comparison with tanzil.net:** accepted as is. The spot check is enough; drop it from
   the open questions.

## Review brief

**Result:** `node scripts/fetch-quran.ts` downloads Surah Yusuf (Tanzil Uthmani + Sahih International) and writes `data/quran/surah-012.json` (111 ayat) and `data/quran/LICENSE`; `npm run validate` can now check refs against real data.
**Commits:** 8584d57..38d7401 (7 commits; the WIP commit 807ab45 from a stopped iteration is covered by the reviews below)

### Acceptance criteria
| Criterion | Evidence (would fail without this change) |
| --- | --- |
| 111 ayat, numbered 1 to 111 | `tests/quran-data.test.ts > is Surah 12 with exactly 111 ayat numbered 1 to 111`; `tests/tanzil.test.ts > buildSurahJson > fails when the ayah count is not the expected one` |
| Non-empty, unaltered text | `tests/quran-data.test.ts > has non-empty Arabic and translation...`; `tests/tanzil.test.ts > keeps pipes inside the text and trims only surrounding whitespace` |
| LICENSE has the Tanzil notice | `tests/quran-data.test.ts > ships with the Tanzil licence notice...`; `tests/tanzil.test.ts > extractLicence` |
| Twice gives identical files | `tests/fetch-surah.test.ts > produces byte-identical output when run twice`; I also ran the script 3 times and the sha1 of both files did not change |
| Clear failure, nothing written | `tests/fetch-surah.test.ts > writes nothing when a download fails / the ayah count is wrong / the licence notice is missing` |
| No Quran text outside `data/quran/` | `npm run validate` (Arabic-outside-data rule): passes |

**Screenshots:** no screen change

### Automated review
- Spec: pass in round 2. Round 1 found missing evidence (data test, no-write on failure, idempotence); fixed in 38d7401.
- Standards: pass. Minor smells left on purpose: `SURAH`/filename are separate constants (one surah only, so a descriptor would be speculative).
- Faith and accuracy: pass. No depiction, no prophet voice, no hand-written Quran text; the only Quran text is the generated JSON. No narrative claims. The reviewer read ayat 49-60 and found no corruption but could NOT compare the whole file to Tanzil.
- Tests: mutation 98.8% of 83 on changed lines. One survivor (`scripts/lib/tanzil.ts:41`, `/^# ?/` to `/# ?/`) is equivalent: the line already starts with `#` and the regex has no `g` flag. e2e: no screen change (`npm run e2e` still passes).

### Decisions I made
- Moved the script's orchestration into `scripts/lib/fetch-surah.ts` (IO injected) so "writes nothing on failure" and idempotence are testable; `scripts/fetch-quran.ts` is now only wiring.
- `data/quran/LICENSE` is the Arabic file's Tanzil notice plus the translation file's own header (Saheeh International, en.sahih, "Last Update: April 24, 2011", "Source: Tanzil.net"). The `# ` comment markers are stripped; the wording is unchanged.
- Tests read the data with a JSON import and `?raw` so the web tsconfig needs no Node types.

### Open questions and risks
- Recorded in `docs/open-questions.md`: ayah 1's Arabic starts with the basmala but its translation does not (kept unaltered); the translation header holds attribution only, not usage terms; and the JSON has not been compared by a person with the live Tanzil pages.
- The in-game credits must link to tanzil.net (the LICENSE text has no link).

### Try it yourself (about 2 minutes)
1. `npm run dev`, open the printed URL (no visible change expected)
2. `node scripts/fetch-quran.ts`, then `git status`: expect "Wrote 111 ayat..." and no modified files
3. Open `data/quran/surah-012.json` and compare 12:1, 12:4 and 12:111 with tanzil.net/#12:1 etc.; this is the check the reviewers could not do.
