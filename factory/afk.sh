#!/bin/sh
# AFK: run up to N factory iterations unattended, one ticket each.
# Usage: factory/afk.sh [max-iterations]   (default 5)
#
# The agent runs headless in dontAsk mode: anything not pre-approved in .claude/settings.json or
# below is denied, including guardrail edits and git push. After every iteration this script
# verifies the result itself, using guard and status code taken from the commit *before* the
# iteration (so the agent cannot change the code that judges it), and stops at the first problem.
#
# Everything runs inside main(), so sh parses the whole file before executing: editing this file
# during a run cannot change the run.
set -eu

main() {
  cd "$(git rev-parse --show-toplevel)"
  max="${1:-5}"
  logs=".factory-logs"
  mkdir -p "$logs"
  trusted=$(mktemp -d "${TMPDIR:-/tmp}/factory-trusted.XXXXXX")
  trap 'rm -rf "$trusted"' EXIT

  i=1
  while [ "$i" -le "$max" ]; do
    [ -z "$(git status --porcelain --ignored=no)" ] || stop "working tree is not clean; commit or stash first"
    before_head=$(git rev-parse HEAD)
    local_settings_before=$(fingerprint .claude/settings.local.json)

    # Trusted copy of the factory scripts as they are now, before the agent runs.
    rm -rf "$trusted/scripts"
    git archive "$before_head" scripts/factory | tar -x -C "$trusted"

    set +e
    ticket=$(node "$trusted/scripts/factory/status.ts" --next)
    rc=$?
    set -e
    if [ "$rc" -eq 3 ]; then
      echo "No more tickets ready for an agent after $((i - 1)) iteration(s)."
      node "$trusted/scripts/factory/status.ts"
      exit 0
    fi
    [ "$rc" -eq 0 ] || stop "could not read the tickets (run: npm run factory:status)"

    log="$logs/$(date +%Y%m%d-%H%M%S)-$(basename "$ticket" .md).log"
    echo "[$i/$max] $ticket  (log: $log)"

    claude -p \
      --permission-mode dontAsk \
      --allowedTools "Read Edit Write Glob Grep Agent Skill TodoWrite WebFetch(domain:quran.com) WebFetch(domain:tanzil.net)" \
      --disallowedTools "Bash(git push*) Bash(git reset*) Bash(git rebase*) Bash(git checkout*) Bash(git switch*) Bash(git config*)" \
      "$(cat factory/prompt.md)

Ticket: $ticket" >"$log" 2>&1 || stop "claude exited with an error on $ticket (see $log)"

    verify "$ticket" "$before_head" "$local_settings_before" "$log"
    echo "      done: $ticket is waiting for your review"
    i=$((i + 1))
  done

  echo "Reached the iteration cap ($max)."
  node "$trusted/scripts/factory/status.ts"
}

# Verify, do not trust: every claim of the iteration is checked here, not by the agent.
verify() {
  ticket=$1 before_head=$2 local_settings_before=$3 log=$4
  status=$(node "$trusted/scripts/factory/status.ts" --status "$ticket") || stop "cannot read the status of $ticket"
  case "$status" in
    needs-review) ;;
    ready-for-human | needs-info) stop "$ticket needs you (status: $status)" ;;
    *) stop "$ticket ended with status '$status'; the iteration did not finish (see $log)" ;;
  esac

  [ "$(git rev-parse HEAD)" != "$before_head" ] || stop "$ticket produced no commits"
  git merge-base --is-ancestor "$before_head" HEAD || stop "history before $ticket was rewritten (amend/reset)"
  [ -z "$(git status --porcelain --ignored=no)" ] || stop "$ticket left uncommitted changes"
  [ "$(fingerprint .claude/settings.local.json)" = "$local_settings_before" ] || stop ".claude/settings.local.json changed during $ticket"
  if git log --format='%(trailers:key=Factory-Allow,valueonly)' "$before_head..HEAD" | grep -q .; then
    stop "$ticket's commits carry a Factory-Allow override; agents never get overrides"
  fi
  criteria_unchanged "$ticket" "$before_head" || stop "$ticket's description or acceptance criteria were changed by the agent"
  grep -q '^## Review brief' "$ticket" || stop "$ticket has no review brief"

  # Guard first (with the trusted copy): it proves package.json, configs and checks are unchanged,
  # so the npm run check that follows still means what it meant before the iteration.
  node "$trusted/scripts/factory/guard.ts" "$before_head" --strict >"$log.check" 2>&1 ||
    stop "guard fails on $ticket's commits (see $log.check)"
  npm run --silent check >>"$log.check" 2>&1 || stop "npm run check fails after $ticket (see $log.check)"
}

# The part of a ticket the agent may not change: everything above its review brief and comments,
# ignoring the status line, the Started-at line and checkbox ticks.
criteria() {
  sed -E -e '/^## (Review brief|Comments)/,$d' -e '/^\**Status:/d' -e '/^\**Started at:/d' -e 's/^- \[[ xX]\]/- [ ]/'
}

criteria_unchanged() {
  [ "$(git show "$2:$1" | criteria)" = "$(criteria <"$1")" ]
}

fingerprint() {
  if [ -f "$1" ]; then git hash-object "$1"; else echo absent; fi
}

stop() {
  echo "STOPPED: $1"
  echo "Logs: .factory-logs/   Status: npm run factory:status"
  exit 1
}

main "$@"
exit
