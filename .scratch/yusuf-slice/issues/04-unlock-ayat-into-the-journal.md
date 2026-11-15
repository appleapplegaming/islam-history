# 04: Unlock ayat into the journal

**What to build:** finishing a scene unlocks the ayat it is based on, and the player can study them
in the ayat journal. After the last beat the scene shows which ayat were unlocked, then returns to
the map. The map has a way to open the journal (a key and a clickable label). The journal lists one
entry per ayah, sorted by surah then ayah: the ref, the Arabic (right-to-left, Amiri Quran) above
the English, loaded from `data/quran/`, with the Tanzil credit line. Back returns to the map.
Progress is kept in the browser's localStorage; if storage is unavailable or throws, the game keeps
working with progress for the session only and warns once in the console. Spec:
`.scratch/yusuf-slice/spec.md`.

**Blocked by:** 03

**Status:** ready-for-agent

**Seams:** the ayat journal module (pure): `unlock(refs)`, `entries()`, with an injected storage
interface. The browser smoke test through the debug probe.

- [ ] `unlock()` with a range ref unlocks each ayah in it; unlocking an ayah already unlocked changes nothing
- [ ] `entries()` returns one entry per ayah, sorted by surah then ayah, whatever order they were unlocked in
- [ ] A new journal on the same storage sees the ayat unlocked by an earlier one
- [ ] With a storage that throws, the journal still unlocks and lists ayat for the session and warns exactly once
- [ ] Corrupt stored data is reported in the console and treated as an empty journal, never a crash
- [ ] The end of the scene shows the unlocked ayat (12:19 and 12:20) before returning to the map
- [ ] Replaying the scene does not add duplicate entries
- [ ] The journal opens from the map by key and by click, shows each entry's ref, Arabic and English, and the credit line; back returns to the map
- [ ] The journal with nothing unlocked shows a short message saying that finishing scenes unlocks ayat
- [ ] Browser smoke test: play the scene → end screen lists 12:19 and 12:20 → map → journal shows both → reload → journal still shows both, with no console errors
- [ ] `npm run check:full` passes
