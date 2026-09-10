#!/usr/bin/env bash
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
DESIGN_FILE="$ROOT/docs/design/DESIGN.md"

if [ ! -f "$DESIGN_FILE" ]; then
  echo "token-lint: skipped — no design token file (docs/design/DESIGN.md)"
  exit 0
fi

if [ "${1:-}" = "--diff" ]; then
  FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null \
    | grep -E '\.(css|scss|less|jsx|tsx|vue|svelte)$' || true)
else
  FILES="$*"
fi

[ -z "$FILES" ] && exit 0

ERRORS=0

for f in $FILES; do
  [ -f "$f" ] || continue
  grep -qE '@theme\b' "$f" && continue

  matches=$(grep -nE '#[0-9a-fA-F]{3,8}' "$f" \
    | grep -vE '^\s*(//|\*|/\*)' \
    | grep -vE 'url\(' || true)
  if [ -n "$matches" ]; then
    printf "ERROR [%s]: hardcoded hex color — use a design token\n" "$f"
    printf "%s\n" "$matches"
    ERRORS=$((ERRORS + 1))
  fi

  matches=$(grep -nE '\b(rgb|rgba|hsl|hsla)\(' "$f" \
    | grep -vE '^\s*(//|\*|/\*)' || true)
  if [ -n "$matches" ]; then
    printf "ERROR [%s]: raw color function — use a design token\n" "$f"
    printf "%s\n" "$matches"
    ERRORS=$((ERRORS + 1))
  fi
done

[ "$ERRORS" -gt 0 ] && exit 1
exit 0
