#!/usr/bin/env bash
set -euo pipefail

# Assembles docs/testing/*.md shards into docs/TESTING.md.
# Called by the pre-commit hook when testing shards are staged.

ROOT=$(git rev-parse --show-toplevel)
TESTING_DIR="$ROOT/docs/testing"
OUTPUT="$ROOT/docs/TESTING.md"

[ -d "$TESTING_DIR" ] || exit 0

SHARDS=$(find "$TESTING_DIR" -maxdepth 1 -name '*.md' -not -name '_*' | sort)

[ -z "$SHARDS" ] && exit 0

{
  printf "# Testing\n\n"
  printf "> Auto-generated from docs/testing/ shards. Do not edit directly.\n\n"
  first=true
  for shard in $SHARDS; do
    $first || printf "\n---\n\n"
    first=false
    cat "$shard"
  done
  printf "\n"
} > "$OUTPUT"

git add "$OUTPUT"
