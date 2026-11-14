#!/bin/sh
# AFK: run up to N factory iterations unattended, one ticket each.
# Usage: factory/afk.sh [max-iterations]   (default 5)
#
# The agent runs headless in dontAsk mode: anything not pre-approved in .claude/settings.json or
# below is denied, including guardrail edits and git push. After every iteration this script
# verifies the result itself instead of trusting the agent, and stops at the first problem.
set -eu
cd "$(git rev-parse --show-toplevel)"

max="${1:-5}"
logs=".factory-logs"
mkdir -p "$logs"

stop() {
  echo "STOPPED: $1"
  echo "Logs: $logs/   Status: npm run factory:status"
  exit 1
}

status_of() { sed -n 's/^\*\*Status:\*\* *//p' "$1" | head -n 1; }

i=1
while [ "$i" -le "$max" ]; do
  [ -z "$(git status --porcelain)" ] || stop "working tree is not clean; commit or stash first"

  ticket=$(npm run --silent factory:status -- --next) || {
    echo "No more tickets ready for an agent after $((i - 1)) iteration(s)."
    npm run --silent factory:status
    exit 0
  }
  before_head=$(git rev-parse HEAD)
  log="$logs/$(date +%Y%m%d-%H%M%S)-$(basename "$ticket" .md).log"
  echo "[$i/$max] $ticket  (log: $log)"

  claude -p \
    --permission-mode dontAsk \
    --allowedTools "Read Edit Write Glob Grep Agent Skill TodoWrite WebFetch(domain:quran.com) WebFetch(domain:tanzil.net)" \
    --disallowedTools "Bash(git push*) Bash(git reset*) Bash(git rebase*) Bash(git checkout -b*)" \
    "$(cat factory/prompt.md)

Ticket: $ticket" >"$log" 2>&1 || stop "claude exited with an error on $ticket (see $log)"

  # Verify, do not trust: the agent's claims are checked by this script, not by the agent.
  after=$(status_of "$ticket")
  case "$after" in
    needs-review) ;;
    ready-for-human | needs-info) stop "$ticket needs you (status: $after)" ;;
    *) stop "$ticket ended with status '$after'; the iteration did not finish (see $log)" ;;
  esac
  [ "$(git rev-parse HEAD)" != "$before_head" ] || stop "$ticket produced no commits"
  [ -z "$(git status --porcelain)" ] || stop "$ticket left uncommitted changes"
  grep -q '^## Review brief' "$ticket" || stop "$ticket has no review brief"
  npm run --silent check >"$log.check" 2>&1 || stop "npm run check fails after $ticket (see $log.check)"
  npm run --silent guard -- "$before_head" >>"$log.check" 2>&1 || stop "guard fails on $ticket's commits (see $log.check)"

  echo "      done: $ticket is waiting for your review"
  i=$((i + 1))
done

echo "Reached the iteration cap ($max)."
npm run --silent factory:status
