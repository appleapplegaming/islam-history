# Triage labels

The `**Status:**` line of a ticket uses these exact strings (defined in
`scripts/factory/tickets.ts`).

| Role | String | Meaning |
| --- | --- | --- |
| needs-triage | `needs-triage` | A human still has to evaluate it |
| needs-info | `needs-info` | Waiting on information; questions are under `## Comments` |
| ready-for-agent | `ready-for-agent` | Fully specified; the AFK loop may take it |
| ready-for-human | `ready-for-human` | Needs a human: judgement, design, manual work, or the agent got stuck |
| wontfix | `wontfix` | Will not be done |

Factory-only statuses:

| String | Meaning |
| --- | --- |
| `in-progress` | An agent claimed it; a crashed iteration resumes it first |
| `needs-review` | Agent finished; waiting for the human to read the review brief and hand-test |
| `done` | Human accepted it |
