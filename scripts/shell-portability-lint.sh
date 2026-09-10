#!/usr/bin/env bash
set -euo pipefail

# Checks shell scripts for patterns that break on BSD/macOS.

[ $# -eq 0 ] && exit 0

SELF=$(realpath "$0" 2>/dev/null || echo "$0")
ERRORS=0

for f in "$@"; do
  [ -f "$f" ] || continue
  [ "$(realpath "$f" 2>/dev/null || echo "$f")" = "$SELF" ] && continue

  if grep -nE 'sed\s+-i\s+[^'"'"'"]' "$f" | grep -v "sed -i ''" >/dev/null 2>&1; then
    printf "ERROR [%s]: GNU-only sed -i — use \"sed -i '' ...\" on macOS\n" "$f"
    ERRORS=$((ERRORS + 1))
  fi

  if grep -nE 'grep\s+(-[a-zA-Z]*P|--perl-regexp)' "$f" >/dev/null 2>&1; then
    printf "ERROR [%s]: grep -P (PCRE) not available on macOS — use -E (ERE)\n" "$f"
    ERRORS=$((ERRORS + 1))
  fi

  if grep -nE 'readlink\s+-f\b' "$f" >/dev/null 2>&1; then
    printf "ERROR [%s]: readlink -f is GNU-only — not available on macOS\n" "$f"
    ERRORS=$((ERRORS + 1))
  fi

  if grep -nE '\bdate\s+(-d|--date)' "$f" >/dev/null 2>&1; then
    printf "ERROR [%s]: date -d is GNU-only — not available on macOS\n" "$f"
    ERRORS=$((ERRORS + 1))
  fi

  if grep -nE '\bfind\s+.*-printf\b' "$f" >/dev/null 2>&1; then
    printf "ERROR [%s]: find -printf is GNU-only — use -exec printf on macOS\n" "$f"
    ERRORS=$((ERRORS + 1))
  fi
done

[ "$ERRORS" -gt 0 ] && exit 1
exit 0
