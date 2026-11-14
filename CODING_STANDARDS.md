# Coding standards

Read during **review**, not implementation. Only judgement calls live here: anything a tool can
check is a check instead (`npm run guard`, `typecheck`, `test`, `validate`). When a reviewer keeps
flagging the same mechanical mistake, turn it into a check rather than adding a line here.

The religious rules in `CLAUDE.md` and the path rules in `.claude/rules/` also apply and outrank
everything below.

## Architecture

- Game logic lives in `src/systems/`: pure TypeScript, no Phaser imports, unit-tested. Phaser
  scenes in `src/scenes/` only render and handle input. Logic found in a scene is a finding.
- Story content is data in `content/`, never hard-coded in scenes or systems.
- Quran text reaches the screen only through the loader reading `data/quran/`. A string that looks
  like a translation anywhere else is a blocker, even in English.
- All tuning values (speeds, timings, grain amounts) are in `src/config.ts`.
- Input is mapped to actions (`interact`, `move_left`, ...), never read as raw keys.
- Deterministic logic: seeded RNG, fixed timestep. `Math.random()` or `Date.now()` in a system is a finding.

## Code

- Reuse before writing: search for an existing helper, type or loader before adding one. Never
  add a second way to do the same thing.
- No silent failures. Every `catch` handles the error, rethrows it with context, or reports it.
  No defaults that hide a missing or malformed file.
- Save data is versioned JSON in localStorage, every access wrapped in try/catch.
- Names say what a thing is in the domain (see `GLOSSARY.md` when it exists).
- Files stay under about 300 lines; split by responsibility, not by line count.
- No speculative generality: nothing the ticket did not ask for.

## Tests

- Tests check behaviour through public interfaces, not internals, and survive refactors.
- Expected values come from an independent source (a worked example, the spec, the real
  `data/quran/` file), never recomputed the way the code computes them.
- Every acceptance criterion of a ticket has at least one test or check that fails without the change.
- Content tests read the real files in `content/` and `data/quran/`; logic tests use small fixtures.
