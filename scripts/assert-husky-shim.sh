#!/bin/sh
# Verify the husky shim directory was regenerated in a worktree after npm install.
# Called by .claude/hooks/worktree-create.sh — exit non-zero if gates won't fire.
set -e

WORKTREE="${1:?usage: assert-husky-shim.sh <worktree-path>}"

if [ ! -f "$WORKTREE/.husky/_/husky.sh" ]; then
  echo "assert-husky-shim: .husky/_/husky.sh missing in $WORKTREE" >&2
  exit 1
fi

if [ ! -x "$WORKTREE/.husky/_/pre-commit" ]; then
  echo "assert-husky-shim: .husky/_/pre-commit not executable in $WORKTREE" >&2
  exit 1
fi
