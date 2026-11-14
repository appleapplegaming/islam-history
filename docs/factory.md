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

Start with `once.sh` (Matt: always HITL before AFK). Watch where the agent struggles, then fix the
ticket, the prompt or a check, not the code. Move to `afk.sh` once a few iterations need no help.

The AFK runner never trusts the agent's report. After each ticket it checks for itself that the
status is `needs-review`, there are new commits, the tree is clean, a review brief exists,
`npm run check` passes, and the guard passes on every new commit. It stops at the first problem.
The agent runs in `dontAsk` mode: only commands pre-approved in `.claude/settings.json` run,
guardrail edits and `git push` are denied. Logs are in `.factory-logs/` (not committed).

## 3. Brakes (automated checks)

Each layer catches what the previous one missed. All are deterministic; none rely on the agent
following instructions.

| Layer | Where | Catches |
| --- | --- | --- |
| Validation | `npm run validate` | Arabic outside `data/quran/`, bad or missing refs, `tradition` without label, tafsir without source, **missing honorifics** in content, **uncredited assets** |
| Types and tests | `npm run typecheck`, `npm test` | Broken code |
| Guard | `npm run guard` | Agent "fixing" red by weakening checks: skipped or focused tests, net loss of tests or assertions, `any` and suppression comments, edits to guardrail files (`package.json`, hooks, checks, standards, `CLAUDE.md`, ...) |
| Pre-commit hook | `.githooks/pre-commit` | Runs all of the above on every commit, so a commit is proof of green |
| Claude Code hooks | `.claude/settings.json` | `--no-verify`, `commit -n`, `core.hooksPath` changes, force-push, shell writes to `data/quran/`, and ending a turn with uncommitted red code |
| CI | `.github/workflows/check.yml` | Anything committed outside Claude or with hooks bypassed; lists every human override |

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
| `test-auditor` | Would the tests notice if the code were wrong? Breaks the code on purpose to find out. | the diff |

`CODING_STANDARDS.md` is read only by reviewers (implementers already carry a lot of context).

## 5. Human review: the review brief

You review **evidence**, not code. Run `npm run factory:status -- --review` to print the brief of
every ticket waiting for you. Each brief has:

- each acceptance criterion with the test or check that would fail without it,
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

## Not built yet (each needs a new dependency, so ask first)

- **Browser smoke test** with Playwright: start the game, click through a scene, assert the debug
  overlay state and save a screenshot into the brief. Biggest gain for "verify without reading".
- **Mutation testing** with Stryker: a mutation score threshold in CI, replacing the hand-run
  mutations of `test-auditor`.
- **ESLint** with custom rules (e.g. no Phaser import in `src/systems/`, no `Math.random` in
  systems), so those standards become checks instead of review comments.
