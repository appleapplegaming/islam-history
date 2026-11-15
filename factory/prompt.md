# Factory iteration

You are one iteration of this repo's software factory. You implement **exactly one ticket**, get it
reviewed, write a review brief for the human, and stop. The ticket path is given at the end of this
prompt. Read `docs/factory.md` if anything about the process is unclear.

The human will not read your code. They read your **review brief** and hand-test. Everything you
claim must be backed by evidence they can check: a test name, a command and its output, a file path.

## 1. Orient

- Read the ticket in full, including any `## Comments` (feedback from an earlier round wins over
  the original text).
- `git log --oneline -10` and `npm run factory:status` for context.
- Read `docs/design.md`, `GLOSSARY.md` and `docs/adr/` where they touch the ticket, when they exist.
- If the ticket is ambiguous, needs a decision only the human can make, needs a new dependency, or
  would break a rule in `CLAUDE.md`: set its status to `needs-info`, add your questions under
  `## Comments`, commit the ticket file, and stop. Do not guess.

## 2. Claim

Set the ticket's `**Status:**` to `in-progress` and note the starting commit:
`git rev-parse HEAD` → write it as `**Started at:** <sha>` under the status line. Commit the ticket
file. (If the ticket is already `in-progress`, a previous iteration stopped mid-way: reuse its
`Started at` and continue from the last commit.)

## 3. Build, test-first

Use the `tdd` skill: one failing test, then the minimum code to pass it, then the next test. Test
only at the seams the ticket names (or, if it names none, the public interface of the module).
After each change run the narrowest test, and `npm run typecheck`. Commit after every green step;
the pre-commit hook runs guard, typecheck, lint, tests and validate, so a commit is proof of green.

If the ticket changes what is on screen, add or extend a browser smoke test in `e2e/` that drives
the real game and asserts on the state the scene publishes to the debug probe (see
`e2e/map.spec.ts`; publish new state through `DebugOverlay.update`). Save a screenshot with
`screenshot(page, '<name>')` at the moment that proves the criterion; the human looks at it.

Before review, run `npm run mutate:changed -- <Started at>` yourself and add tests until every
undetected mutant is killed or clearly equivalent. Run `npm run check:full` (adds the browser tests).

Never weaken a check to get to green: no skipped tests, no deleted assertions, no `any`, no
suppression comments, no edits to guardrail files. The guard blocks these; if you believe a check is
wrong, set `needs-info` and explain under `## Comments`.

## 4. Review

When every acceptance criterion is built, let `<range>` be `<Started at>..HEAD` and run these four
subagents **in parallel**, giving each only the ticket path and the range:

- `spec-reviewer`: criteria to evidence, scope creep
- `standards-reviewer`: coding standards and smells
- `faith-reviewer`: religious rules and accuracy (always, even for technical tickets)
- `test-auditor`: mutation-tests the changed lines and checks the browser smoke test

Fix every blocker, should-fix, `fail`, `partial`/`missing` criterion and surviving mutation, commit,
and run the reviewers whose verdict was `changes-needed` again. Stop after **3 review rounds**: if
something still fails, it goes into the brief as an open issue and the status becomes
`ready-for-human` instead of `needs-review`.

## 5. Review brief

Append this section to the ticket file (replace it if it exists). Keep it under 60 lines. Write it
for someone who will not open the code.

```markdown
## Review brief

**Result:** <one sentence: what the player or developer can now do>
**Commits:** <Started at>..<HEAD short sha> (<n> commits)

### Acceptance criteria
| Criterion | Evidence (would fail without this change) |
| --- | --- |
| <criterion> | `tests/x.test.ts > <test name>` / `e2e/x.spec.ts > <test>` / `npm run validate` rule |

**Screenshots:** `test-results/screens/<name>.png` (one line each: what it should show) or "no screen change"

### Automated review
- Spec: <verdict, rounds, what was fixed>
- Standards: <verdict, what was fixed, smells left on purpose and why>
- Faith and accuracy: <verdict; each narrative claim -> supporting ayah; anything unverified>
- Tests: <mutation score on changed lines>; <equivalent mutants left and why>; e2e: <spec > test or "no screen change">

### Decisions I made
- <decision the ticket did not settle, and why> (or "None")

### Open questions and risks
- <anything left unverified, added to docs/open-questions.md, or likely to break> (or "None")

### Try it yourself (about 2 minutes)
1. `npm run dev`, open the printed URL
2. <exact clicks or keys>, expect <exact visible result>
3. <one check that would show the most likely failure>
```

## 6. Finish

Set the status to `needs-review` (or `ready-for-human`, see step 4), tick the acceptance criteria
checkboxes that are met, and commit. Then print one line: `TICKET DONE: <ticket path>`.
Do not start another ticket.
