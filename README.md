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
- `npm run lint`: oxlint (architecture rules from `CODING_STANDARDS.md` made into checks)
- `npm run check`: typecheck + lint + tests + validate
- `npm run e2e`: browser smoke tests (first time: `npx playwright install chromium`)
- `npm run check:full`: check + e2e
- `npm run mutate:changed`: mutation score of lines changed since main; `npm run mutate`: whole codebase
- `npm run factory:status`: tickets and what is next (`-- --review` prints review briefs)
- `factory/once.sh` / `factory/afk.sh N`: run the agent loop, see `docs/factory.md`
