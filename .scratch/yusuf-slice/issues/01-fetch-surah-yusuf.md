# 01: Fetch Surah Yusuf into data/quran

**What to build:** a script, `scripts/fetch-quran.ts`, that downloads Surah Yusuf (12) from
Tanzil.net (Uthmani Arabic) and the Sahih International English translation from the same verified
source, and writes `data/quran/surah-012.json` in the format `scripts/validate.ts` already reads:
`{ "surah": 12, "ayat": [{ "number": 1, "arabic": "...", "translation": "..." }, ...] }`. The
Tanzil licence notice goes in `data/quran/LICENSE`. After this, `npm run validate` can check refs
against real Quran data.

**Blocked by:** None (can start immediately)

**Status:** needs-review
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

**Result:** `node scripts/fetch-quran.ts` now writes 12:1 without the basmala, taking the basmala from Tanzil's own 1:1 text; the script fails (writing nothing) if 12:1 does not start with it plus whitespace.
**Commits:** 8584d57..afa107e (12 commits in the range; this feedback round is f6144a3, fe0af65, afa107e)

### Acceptance criteria
| Criterion | Evidence (would fail without this change) |
| --- | --- |
| Basmala stripped from 12:1 only | `tests/tanzil.test.ts > buildSurahJson > strips the 1:1 text (the basmala) from the start of 12:1, and only there` |
| Fails clearly if 12:1 does not start with 1:1's text + whitespace | `tests/tanzil.test.ts > ... > fails when 12:1 does not start with the text of 1:1 followed by whitespace` (no prefix, no whitespace, nothing after, 1:1 missing) |
| Basmala never typed | `extractBasmala` reads Tanzil's 1:1; fixtures use placeholders (`BISM`); `npm run validate` (Arabic-outside-data rule) passes |
| Data test: 12:1 no longer starts with 1:1's text | `tests/quran-data.test.ts > does not start 12:1 with the basmala (the text of 1:1)` |
| Open questions updated | `docs/open-questions.md`: basmala and spot-check items removed |
| Earlier criteria (111 ayat, unaltered text, LICENSE, idempotent, no write on failure) | unchanged; their tests still pass. I re-ran the script: sha1 of all three data files identical between runs |

**Screenshots:** no screen change

### Automated review
- Spec: `changes-needed` in round 1, no blockers. It flagged (a) the new `data/quran/basmala.json` as unrequested and (b) the data test comparing against that file rather than a 1:1 text file. Both are my decision below; not re-run.
- Standards: pass. Smells left on purpose: `basmala.json` and `LICENSE` names hard-coded in `fetch-surah.ts` (one surah only); `extractLicence`/`findLicence` naming.
- Faith and accuracy: pass. No depiction, no prophet voice, no hand-written Quran text; no narrative claims. Reviewer saw 12:1 start at the Alif-Lam-Ra letters with the translation matching, and 12:111 complete; could not compare all 111 ayat to Tanzil (you accepted the spot check).
- Tests: mutation 99.2% of 123 on changed lines (auditor); one equivalent survivor, `scripts/lib/tanzil.ts:41` (`/^# ?/` to `/# ?/`: the line already starts with `#`, no `g` flag). e2e: no screen change; `npm run check:full` passes.

### Decisions I made
- The data test needs 1:1's text, but only Surah 12 is in `data/`. The script therefore also writes `data/quran/basmala.json` (`{source, arabic}`, Tanzil's 1:1). `validate` only reads `surah-NNN.json`, so it is ignored there. Delete it if you prefer another way to test this.
- The strip applies to ayah 1 of whichever surah is built (would not work for surah 1 itself); fine for the current single-surah scope.

### Open questions and risks
- Tanzil's licence says the text must not be changed; the basmala removal is your explicit ruling, so it is a deliberate exception. Consider noting it in the in-game credits.
- Translation licence question remains in `docs/open-questions.md`; credits must link to tanzil.net.

### Try it yourself (about 2 minutes)
1. `npm run dev`, open the printed URL (no visible change expected)
2. `node scripts/fetch-quran.ts`, then `git status`: expect "Wrote 111 ayat..." and no modified files
3. Open `data/quran/surah-012.json`: ayah 1's `arabic` should start with the letters only, not the basmala (compare with `data/quran/basmala.json`), and its `translation` should be unchanged.
