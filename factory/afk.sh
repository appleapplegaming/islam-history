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

  trust_check

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

    # The prompt goes in on stdin: --allowedTools/--disallowedTools take any number of values and
    # would swallow a prompt passed as the last argument.
    printf '%s\n\nTicket: %s\n' "$(cat factory/prompt.md)" "$ticket" |
      claude -p \
        --permission-mode dontAsk --output-format stream-json --verbose \
        --allowedTools "Read Edit Write Glob Grep Agent Skill TodoWrite WebFetch(domain:quran.com) WebFetch(domain:tanzil.net)" \
        --disallowedTools "Bash(git push*) Bash(git reset*) Bash(git rebase*) Bash(git checkout*) Bash(git switch*) Bash(git config*)" \
        >"$log" 2>&1 || stop "claude exited with an error on $ticket (see $log)"
    # Claude ignores the project's allow-list and hooks in a folder it has not been told to trust.
    if grep -q 'has not been trusted' "$log"; then
      stop "Claude does not trust this folder, so it ignored .claude/settings.json. Run 'claude' here once, accept the trust dialog, then rerun."
    fi

    verify "$ticket" "$before_head" "$local_settings_before" "$log"
    echo "      done: $ticket is waiting for your review (screenshots: $log.screens/)"
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
  npm run --silent check:full >>"$log.check" 2>&1 || stop "npm run check:full fails after $ticket (see $log.check)"
  node "$trusted/scripts/factory/mutate-changed.ts" "$before_head" >"$log.mutation" 2>&1 ||
    stop "the tests do not catch mistakes in $ticket's new code (see $log.mutation)"

  # Keep the evidence next to the log: test-results/ is overwritten by the next run.
  if [ -d test-results/screens ]; then
    mkdir -p "$log.screens" && cp test-results/screens/*.png "$log.screens/" 2>/dev/null || true
  fi
  grep '^Mutation score' "$log.mutation" | sed 's/^/      /' || true
}

# The part of a ticket the agent may not change: everything above its review brief and comments,
# ignoring the status line, the Started-at line and checkbox ticks.
criteria() {
  sed -E -e '/^## (Review brief|Comments)/,$d' -e '/^\**Status:/d' -e '/^\**Started at:/d' -e 's/^- \[[ xX]\]/- [ ]/'
}

criteria_unchanged() {
  [ "$(git show "$2:$1" | criteria)" = "$(criteria <"$1")" ]
}

# Without workspace trust, Claude silently drops the allow-list and hooks in .claude/settings.json,
# so the agent would run without its brakes. Check before spending an iteration.
trust_check() {
  dir=$(pwd -P)
  trusted_flag=$(node -e '
    const fs = require("fs"), path = require("path"), os = require("os");
    let config = {};
    try { config = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".claude.json"), "utf8")); } catch (e) { console.log("unknown"); process.exit(0); }
    let d = process.argv[1];
    for (;;) { const p = (config.projects || {})[d]; if (p && p.hasTrustDialogAccepted) { console.log("yes"); break; } const up = path.dirname(d); if (up === d) { console.log("no"); break; } d = up; }
  ' "$dir")
  case "$trusted_flag" in
    yes) ;;
    no) stop "Claude has not been told to trust $dir, so it would ignore .claude/settings.json (allow-list and hooks). Run 'claude' here once and accept the trust dialog." ;;
    *) echo "warning: could not read ~/.claude.json to check workspace trust; the run stops if Claude reports it." ;;
  esac
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
