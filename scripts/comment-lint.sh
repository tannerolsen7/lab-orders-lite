#!/usr/bin/env bash
set -euo pipefail

# Per CLAUDE.md: "ONLY write a comment when the WHY is non-obvious — one line maximum"
# and "NEVER write a comment that describes what the code does."
# Detects WHAT comments — comments that restate code behavior.

[ $# -eq 0 ] && exit 0

ERRORS=0

for f in "$@"; do
  [ -f "$f" ] || continue

  matches=$(grep -nE '^\s*(//|#)\s*(This (function|method|class|component|hook|module|variable|constant) |Loop(s|ing)? (through|over) |Set(s|ting)? the |Get(s|ting)? the |Return(s|ing)? the |Create(s|ing)? (a |an |the )|Initiali[sz](e|ing) |Increment(s|ing)? |Decrement(s|ing)? |Assign(s|ing)? |Defin(e|es|ing) (a |an |the )|Import(s|ing) |Export(s|ing) |Declar(e|es|ing) )' "$f" || true)
  if [ -n "$matches" ]; then
    printf "ERROR [%s]: WHAT comment — comments should explain WHY, not WHAT\n" "$f"
    printf "%s\n" "$matches"
    ERRORS=$((ERRORS + 1))
  fi

  jsdoc_count=$(grep -cE '^\s*/\*\*' "$f" 2>/dev/null || true)
  if [ "${jsdoc_count:-0}" -gt 0 ]; then
    jsdoc_lines=$(grep -nE '^\s*/\*\*' "$f" | grep -vE 'eslint|prettier|@ts-' || true)
    if [ -n "$jsdoc_lines" ]; then
      printf "WARNING [%s]: multi-line comment block — keep comments to one line max\n" "$f"
    fi
  fi
done

[ "$ERRORS" -gt 0 ] && exit 1
exit 0
