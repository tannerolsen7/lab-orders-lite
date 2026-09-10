#!/usr/bin/env bash
set -euo pipefail

# Detects A→B→A circular imports in staged TypeScript/JavaScript files.

ROOT=$(git rev-parse --show-toplevel)
ERRORS=0

STAGED=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null \
  | grep -E '\.(ts|tsx|js|jsx)$' || true)

[ -z "$STAGED" ] && exit 0

for file in $STAGED; do
  file_abs="$ROOT/$file"
  [ -f "$file_abs" ] || continue
  file_dir=$(dirname "$file_abs")
  file_base=$(basename "$file_abs" | sed 's/\.[^.]*$//')

  imports=$(grep -oE "from ['\"](\./[^'\"]+|\.\.\/[^'\"]+)['\"]" "$file_abs" 2>/dev/null \
    | sed "s/from ['\"]//;s/['\"]$//" || true)

  [ -z "$imports" ] && continue

  for imp in $imports; do
    target=$(cd "$file_dir" && realpath "$imp" 2>/dev/null || true)
    [ -z "$target" ] && continue

    resolved=""
    for ext in ".ts" ".tsx" ".js" ".jsx" "/index.ts" "/index.tsx"; do
      if [ -f "${target}${ext}" ]; then
        resolved="${target}${ext}"
        break
      fi
    done
    [ -f "$target" ] && [ -z "$resolved" ] && resolved="$target"
    [ -z "$resolved" ] && continue

    if grep -qE "from ['\"].*/${file_base}['\"]" "$resolved" 2>/dev/null; then
      rel_target=$(realpath --relative-to="$ROOT" "$resolved" 2>/dev/null || echo "$resolved")
      printf "ERROR: circular import: %s ↔ %s\n" "$file" "$rel_target"
      ERRORS=$((ERRORS + 1))
    fi
  done
done

[ "$ERRORS" -gt 0 ] && exit 1
exit 0
