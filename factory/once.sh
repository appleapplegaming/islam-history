#!/bin/sh
# HITL: run one factory iteration in an interactive Claude session that you watch and steer.
# Usage: factory/once.sh [ticket-path]     (defaults to the next ready ticket)
set -eu
cd "$(git rev-parse --show-toplevel)"

ticket="${1:-}"
if [ -z "$ticket" ]; then
  ticket=$(npm run --silent factory:status -- --next) || {
    echo "No ticket is ready for an agent. See: npm run factory:status"
    exit 0
  }
fi

echo "Factory (HITL): $ticket"
exec claude --permission-mode acceptEdits "$(cat factory/prompt.md)

Ticket: $ticket"
