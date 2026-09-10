#!/usr/bin/env bash
set -euo pipefail

# Writes the /cr sentinel after a successful code review.
# Only this script may produce .claude/.cr-ok — direct staging is blocked by the pre-commit hook.

ROOT=$(git rev-parse --show-toplevel)
SENTINEL="$ROOT/.claude/.cr-ok"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
HEAD_SHA=$(git rev-parse HEAD)

printf "%s:%s" "$BRANCH" "$HEAD_SHA" > "$SENTINEL"
printf "cr-ok: sentinel written for %s at %s\n" "$BRANCH" "$HEAD_SHA"
