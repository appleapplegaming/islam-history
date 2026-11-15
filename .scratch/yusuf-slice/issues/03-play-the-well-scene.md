# 03: Play the well scene (ayah beats only)

**What to build:** the tracer bullet through every layer. The Yusuf (as) marker on the map becomes
playable and opens the first scene of the Yusuf chapter: refs `12:19-20`, certainty `quran`, made
of exactly two ayah beats (12:19, then 12:20). No narration yet (that is ticket 07, which needs the
human's approval). The player advances with Enter, Space or a click and returns to the map with
Escape, or by advancing past the last beat. Each ayah beat shows the whole ayah, Arabic
right-to-left in the Amiri Quran font above the Sahih International English, with a credit line:
Quran text from the Tanzil Project (tanzil.net), translation Sahih International (required by the
Tanzil licence). Placeholder art only, in the style of the map. Spec: `.scratch/yusuf-slice/spec.md`.

**Blocked by:** 02

**Status:** needs-info

**Seams:** the scene playthrough module (pure, no Phaser): start a scene from chapter content and
Quran data, current beat already resolved, `advance()`, finished, unlocked refs. The browser smoke
test through the existing debug probe.

- [ ] The chapter file for Yusuf exists with one scene, refs `12:19-20`, certainty `quran`, beats: ayah 12:19, ayah 12:20; it passes `npm run validate`, and a test runs the real chapter file through the validator
- [ ] The loader loads the chapter and the surah data and fails loudly, naming the file and scene, when the content is invalid
- [ ] The playthrough resolves each ayah beat to exactly the Arabic and English in `data/quran/surah-012.json` (tested against the real data), advances in order, reports finished after the last beat, and reports `12:19` and `12:20` as the refs it unlocks
- [ ] The Yusuf (as) marker is playable; clicking it or pressing Enter on it opens the scene
- [ ] Interact advances one beat; back returns to the map from any beat; advancing past the last beat returns to the map
- [ ] Arabic is rendered right-to-left in Amiri Quran, self-hosted in `assets/fonts/` and listed with its licence (SIL OFL) in `assets/CREDITS.md`
- [ ] Every ayah beat shows the Tanzil and Sahih International credit line with tanzil.net
- [ ] No figure or shape of any prophet is drawn; prophets have no text of their own
- [ ] The scene publishes its state (scene id, current beat, refs) through the debug probe
- [ ] Browser smoke test: map → Yusuf marker → both beats → back on the map, with no console errors, screenshots of each beat
- [ ] `npm run check:full` passes

## Comments

### Agent, 2026-11-15: blocked on the Amiri Quran font file

One criterion needs Amiri Quran saved in `assets/fonts/`. I can't get the file from this session:

- It is not anywhere on the machine (checked `node_modules/`, `~/Library/Fonts/`, `~/Documents/GitHub/`).
- `curl` and other network tools are denied, and no allowed script downloads fonts.
  `scripts/fetch-quran.ts` only downloads Quran data. I could write a new download script under
  `scripts/factory/` because `node scripts/factory/*` is allowed, but that would get around the
  network denial, so I haven't.

Nothing else is blocking. I haven't started building, so there are no code changes.

**What I need (pick one):**

1. **You add the font (simplest).** Download `AmiriQuran.ttf` from the official Amiri release
   (https://github.com/aliftype/amiri/releases) and save it as `assets/fonts/AmiriQuran.ttf`.
   Also add the release's `OFL.txt` as `assets/fonts/OFL.txt`. Commit both. I will add the
   `assets/CREDITS.md` rows (Amiri Quran, Khaled Hosny / aliftype, SIL OFL 1.1) when I build.
   Note: `npm run validate` needs every asset listed in `assets/CREDITS.md`. If you commit only
   the files, validate will fail until the rows exist, so either add the rows in the same commit
   or tell me to add them first.
2. **Allow a download script.** Approve a new `scripts/fetch-font.ts` that downloads that
   release file, plus a matching `Bash(node scripts/fetch-font.ts*)` rule in
   `.claude/settings.json`. This adds a script but no npm dependency.

Once the font is in the repo (option 1) or the script is allowed (option 2), set this back to
`ready-for-agent`.
