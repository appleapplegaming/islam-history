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

- [ ] `node scripts/fetch-quran.ts` writes `data/quran/surah-012.json` with exactly 111 ayat, numbered 1 to 111
- [ ] Every ayah has non-empty `arabic` and `translation`, taken unaltered from Tanzil (no trimming beyond surrounding whitespace, no normalisation)
- [ ] `data/quran/LICENSE` contains the Tanzil licence notice as published by Tanzil
- [ ] Running the script twice produces byte-identical files
- [ ] The script fails with a clear message (and writes nothing) if a download fails or the ayah count is not 111
- [ ] No Quran text appears anywhere outside `data/quran/` (`npm run validate` passes)

## Comments

**Human decision needed before an agent can start:** `scripts/` is not type-checked because
`@types/node` is not installed. Either approve adding `@types/node` as a dev dependency (and include
`scripts` in `tsconfig.json`), or confirm the script stays un-type-checked with its logic in a pure,
tested module. Then set the status to `ready-for-agent`.

**Decision (2026-11-15):** `@types/node` is approved and installed. `scripts/` is now type-checked
through `tsconfig.node.json` (part of `npm run typecheck`), so the script can use Node APIs with full
types. Put the parsing in a pure module under `scripts/lib/` (no Node imports) with unit tests, as the
Seams say: files there are mutation-tested, and new code needs a 90% score.
