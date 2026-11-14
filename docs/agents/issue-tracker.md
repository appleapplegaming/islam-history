# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/` (committed, so progress
survives between sessions). Read by Matt Pocock's engineering skills and by the factory loop.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- One file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in
  dependency order, never a single combined tickets file
- Each ticket has `**Blocked by:**` (ticket numbers in the same feature, or `None`) and
  `**Status:**` near the top. Statuses are listed in `docs/agents/triage-labels.md`;
  `npm run factory:status` fails loudly on an unknown one.
- Comments and feedback append to the bottom under `## Comments`
- The agent appends `## Review brief` when it finishes a ticket

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` using the ticket template in `docs/factory.md`.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the number.
