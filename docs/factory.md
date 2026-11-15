# The software factory

How work gets from an idea to a verified commit in this repo, without the human reading the code.
Based on Matt Pocock's approach (AI Hero "Software Factories for Real Engineers", his Ralph loop
tips, and his `mattpocock-skills` plugin), adapted to a solo, accuracy-critical project.

## The idea in one paragraph

Agents write code faster than anyone can review it, so review the **system**, not the code. The
human does the two things only a human can: decide **what** to build (planning) and judge **whether
it is right** (reading a short review brief and hand-testing). Everything in between is done by an
agent in a loop, held in by deterministic brakes it cannot get around, checked by reviewers that
did not write the code, and verified by the loop script instead of the agent's own word.

## The loop

```
 you                         agent (factory/prompt.md)                     you
 ───                         ─────────────────────────                     ───
 /grill-me ─► /to-spec ─►    pick next ticket ─► claim ─► TDD, commit       read brief
 /to-tickets                 each green step ─► 4 reviewers in parallel ─►  try it (2 min)
 (.scratch/<feature>/)       fix, max 3 rounds ─► write review brief ─►     done, or
                             status needs-review                            comment + send back
                                     ▲                                          │
                                     └──────────── /retro: improve the system ◄─┘
```

## 1. Plan (human in the loop)

All in an interactive Claude session, using the installed `mattpocock-skills`:

1. `/grill-me` (or `/grill-with-docs`): get interviewed until the feature is unambiguous. For
   story content, settle sources and what is `tradition` here, not during implementation.
2. `/to-spec`: writes `.scratch/<feature>/spec.md`.
3. `/to-tickets`: splits it into tracer-bullet tickets in `.scratch/<feature>/issues/NN-slug.md`,
   each a thin end-to-end slice with acceptance criteria and blockers. Approve the breakdown.
   Mark tickets that need your judgement `ready-for-human`, the rest `ready-for-agent`.

Good tickets are the single biggest quality lever: an agent cannot meet a criterion nobody wrote
down, and the reviewers check against exactly these criteria.

### Ticket template

```markdown
# 03: Ayat journal shows unlocked ayat

**What to build:** the end-to-end behaviour, from the player's point of view.

**Blocked by:** 01, 02

**Status:** ready-for-agent

**Seams:** the public interfaces to test at (e.g. `loadChapter()`, `Journal.unlock()`).

- [ ] Acceptance criterion, phrased so a test or check can prove it
- [ ] ...
```

## 2. Build (agent)

| Command | What it does |
| --- | --- |
| `npm run factory:status` | Every ticket, its status, and which one is next |
| `factory/once.sh` | **HITL**: one ticket in an interactive session you watch and steer |
| `factory/afk.sh 5` | **AFK**: up to 5 tickets unattended, one after another |
| `npm run factory:trace` | What the agent did in the last AFK iteration: every command, file changed, subagent, denied action, time and cost |

Start with `once.sh` (Matt: always HITL before AFK). Watch where the agent struggles, then fix the
ticket, the prompt or a check, not the code. Move to `afk.sh` once a few iterations need no help.

The AFK runner never trusts the agent's report. Before each ticket it copies the guard and status
scripts out of the repo, so the agent cannot change the code that judges it. Afterwards it checks,
by itself: the status is `needs-review`; there are new commits and history was not rewritten; the
tree is clean; no commit carries an override; the ticket's description and acceptance criteria are
unchanged; a review brief exists; `.claude/settings.local.json` is untouched; the guard passes in
strict mode (every commit and the whole range, no overrides); `npm run check:full` passes (types,
lint, unit tests, validation and the browser smoke tests); and the mutation score on the lines the
ticket changed is at least 90%. Screenshots from the browser tests are kept next to the log. It stops
at the first problem. The agent runs in `dontAsk` mode: only commands pre-approved in
`.claude/settings.json` run; guardrail edits, `git push`, `reset`, `rebase`, `checkout` and
`config` are denied. Logs are in `.factory-logs/` (not committed): a full JSON trace of every tool
call, which `npm run factory:trace` turns into a one-screen summary.

Claude ignores a project's `.claude/settings.json` (allow-list and hooks) in a folder it has not been
told to trust, so `afk.sh` refuses to start until you have run `claude` there once and accepted the
trust dialog.

These checks were tested against a fake agent that tampers with its acceptance criteria, skips a
test behind `--no-verify`, forges an override trailer, and guts the guard itself: each run stopped
with the right reason, and an honest run passed.

## 3. Brakes (automated checks)

Each layer catches what the previous one missed. All are deterministic; none rely on the agent
following instructions.

| Layer | Where | Catches |
| --- | --- | --- |
| Validation | `npm run validate` | Arabic outside `data/quran/`, bad or missing refs, `tradition` without label, tafsir without source, **missing honorifics** in content, **uncredited assets** |
| Types and tests | `npm run typecheck`, `npm test` | Broken code (scripts are type-checked too, via `tsconfig.node.json`) |
| Lint | `npm run lint` (oxlint, `.oxlintrc.json`) | Phaser or Node imports in `src/systems/` and `src/content/`, `Math.random`/`Date.now` in systems, empty `catch`, `any`, focused or skipped tests |
| Browser smoke tests | `npm run e2e` (Playwright, `e2e/`) | The game failing to start, console errors, a scene not reaching the state the ticket promises. Tests read game state from the debug probe (`window.__storyDebug`) and save screenshots to `test-results/screens/` |
| Mutation testing | `npm run mutate:changed`, `npm run mutate` (Stryker) | Tests that pass but would also pass with the code broken. New code: 90% of mutants on changed lines must be caught. Whole codebase: a ratchet in `stryker.config.mjs` that only goes up |
| Guard | `npm run guard` | Agent "fixing" red by weakening checks: skipped or focused tests, net loss of tests or assertions, `any` and suppression comments, edits to guardrail files (`package.json`, hooks, checks, standards, `CLAUDE.md`, ...) |
| Pre-commit hook | `.githooks/pre-commit` | Runs guard, types, lint, tests and validation on every commit, so a commit is proof of green (browser and mutation tests are slower and run at review, in AFK verification and in CI) |
| Claude Code hooks | `.claude/settings.json` | `--no-verify`, `commit -n`, `core.hooksPath` changes, force-push, shell writes to `data/quran/`, and ending a turn with uncommitted red code |
| CI | `.github/workflows/check.yml` | Everything above again, for anything committed outside Claude or with hooks bypassed; lists every human override; uploads screenshots and the mutation report as an `evidence` artifact |

**Human overrides.** When a guarded change is intended (you asked for a new dependency, or to
improve the factory itself), commit with `FACTORY_ALLOW=<rule> git commit ...`. The commit-msg hook
records it as a `Factory-Allow:` trailer so CI can tell an approved change from a sneaked-in one.
Agents cannot do this: the Claude hook asks you first, and denies outright in AFK runs.

## 4. Automated review

Four subagents in `.claude/agents/` review every ticket in parallel. None of them wrote the code,
and each looks at one thing only, so one concern cannot hide another (Matt's "two axes", extended):

| Reviewer | Question | Main source |
| --- | --- | --- |
| `spec-reviewer` | Does it do exactly what the ticket asked? Which test proves each criterion? | the ticket |
| `standards-reviewer` | Does it follow how this repo writes code? | `CODING_STANDARDS.md`, `.claude/rules/` |
| `faith-reviewer` | Religious rules, and is every narrative claim supported by its ayat? | `CLAUDE.md`, `data/quran/`, fetched tafsir |
| `test-auditor` | Would the tests notice if the code were wrong? Runs mutation testing on the changed lines, judges each survivor, checks the browser test covers the screen change. | the diff, Stryker |

All four run on Sonnet at medium effort (`model` and `effort` in each agent's frontmatter), which
keeps a review round cheap; change it there if a reviewer starts missing things.

`CODING_STANDARDS.md` is read only by reviewers (implementers already carry a lot of context).

## 5. Human review: the review brief

You review **evidence**, not code. Run `npm run factory:status -- --review` to print the brief of
every ticket waiting for you. Each brief has:

- each acceptance criterion with the test or check that would fail without it,
- screenshots from the browser smoke test (AFK runs keep them in `.factory-logs/<run>.screens/`),
- the mutation score on the lines the ticket changed,
- every reviewer's verdict and what was fixed,
- each narrative claim mapped to its ayah, and anything left unverified,
- decisions the agent made that the ticket did not settle,
- a two-minute hand test with exact steps and expected results.

Then either set `**Status:** done`, or add what is wrong under `## Comments`, set it back to
`ready-for-agent`, and the next iteration picks it up with your feedback.

Where to spend your attention, most valuable first: (1) the faith and accuracy section, (2) the
hand test, (3) "decisions I made", (4) any criterion whose evidence looks thin.

## 6. Retro: improve the system, not the code

When something slips through, do not just fix the code. Ask which layer should have caught it and
fix that (Matt's `/retro` skill does this from the session logs):

- a mechanical mistake → a new check in `validate` or the guard, with a test,
- a judgement mistake → a line in `CODING_STANDARDS.md` or a reviewer's checklist,
- a vague result → a better ticket template or acceptance criteria,
- an agent getting lost → a navigation pointer in `CLAUDE.md` or `docs/`.

## Evidence you can check without reading code

| Question | Where the answer is |
| --- | --- |
| Does it do what the ticket says? | Acceptance table in the brief, each row a test name you can run |
| Does it actually work in the game? | Screenshots, and the 2-minute hand test |
| Would the tests catch a mistake? | Mutation score on changed lines (`npm run mutate:changed`); full report in `reports/mutation/index.html` |
| Did the agent lower the bar? | AFK verification and CI: guard in strict mode, no overrides |
| What did the agent actually run? | `npm run factory:trace`: commands, files, denied actions |
| Is it faithful to the Quran? | Faith section of the brief: each claim mapped to an ayah |

## Not built yet

- **Docker sandbox** for AFK runs (Matt's recommendation): today the agent runs on your machine,
  held in by `dontAsk` mode and an allow-list rather than a container.
- **Visual regression**: screenshots are saved for you to look at, not compared to a baseline.
  Worth adding once scenes have real art and stop changing every ticket.
