---
paths:
  - "**/*.ts"
---

# Code conventions

- Game logic lives in `src/systems/`: pure TypeScript, no Phaser imports, unit-tested.
  Phaser scenes in `src/scenes/` only render and handle input.
- Deterministic logic: seeded RNG, fixed timestep.
- All tuning values (speeds, timings, grain amounts) go in `src/config.ts`.
- Input is mapped to actions (`interact`, `move_left`, ...), never read as raw keys.
- Save data (journal progress, reflections) is versioned JSON in localStorage, with every
  access wrapped in try/catch.
- Debug mode, toggled with `` ` ``, shows scene ids, refs and current state.
- Keep files under about 300 lines.
