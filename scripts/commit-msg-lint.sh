#!/usr/bin/env bash
set -euo pipefail

# Validates commit message follows conventional commits format.
# Per CLAUDE.md: type(scope): short description

MSG_FILE="$1"
MSG=$(head -1 "$MSG_FILE")

if [ -z "$MSG" ]; then
  echo "Commit message is empty." >&2
  exit 1
fi

PATTERN='^(feat|fix|chore|refactor|test|docs|perf|build|ci|style|revert)(\([a-zA-Z0-9_-]+\))?: .+'

if ! echo "$MSG" | grep -qE "$PATTERN"; then
  printf "Invalid commit message format.\n" >&2
  printf "Expected: type(scope): description\n" >&2
  printf "Types: feat fix chore refactor test docs perf build ci style revert\n" >&2
  printf "Got: %s\n" "$MSG" >&2
  exit 1
fi

if [ ${#MSG} -gt 72 ]; then
  printf "Commit subject too long (%d chars, max 72).\n" "${#MSG}" >&2
  exit 1
fi
