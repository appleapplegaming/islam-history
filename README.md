<img src="assets/icon.svg" width="64" height="64" alt="">

# Stories of the Prophets

A browser game for studying the stories of the prophets as told in the Quran.
TypeScript + Phaser 3 + Vite, no backend. See `docs/design.md` for the design and `CLAUDE.md`
for the rules the project follows.

## Commands

- `npm run dev`: run the game locally
- `npm test`: unit tests (Vitest)
- `npm run typecheck`: TypeScript check
- `npm run validate`: content validation, must pass before every commit
- `npm run build`: production build into `dist/`
- `npm run check`: typecheck + tests + validate
- `npm run factory:status`: tickets and what is next (`-- --review` prints review briefs)
- `factory/once.sh` / `factory/afk.sh N`: run the agent loop, see `docs/factory.md`
