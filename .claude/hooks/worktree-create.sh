#!/bin/sh
# WorktreeCreate hook — creates an isolated git worktree for a subagent and
# symlinks env files in. The harness sends JSON on stdin with a `name` field
# (agent identifier) and expects the worktree path on stdout.
set -e

command -v jq >/dev/null 2>&1 || { echo "worktree-create: jq required but not installed" >&2; exit 1; }
[ -z "$CLAUDE_PROJECT_DIR" ] && { echo "worktree-create: CLAUDE_PROJECT_DIR not set" >&2; exit 1; }

INPUT=$(cat)
NAME=$(echo "$INPUT" | jq -r '.name // empty' 2>/dev/null)
# Back-compat: if the harness pre-creates the worktree, accept the path and just decorate.
PRESET=$(echo "$INPUT" | jq -r '.worktreePath // .worktree_path // empty' 2>/dev/null)

if [ -n "$PRESET" ]; then
  WORKTREE="$PRESET"
else
  [ -z "$NAME" ] && { echo "worktree-create: no name or worktreePath in hook input" >&2; exit 1; }
  WORKTREE="$CLAUDE_PROJECT_DIR/.claude/worktrees/$NAME"
  BRANCH="agent/$NAME"
  if [ ! -d "$WORKTREE" ]; then
    cd "$CLAUDE_PROJECT_DIR"
    git worktree add -b "$BRANCH" "$WORKTREE" HEAD >&2
  fi
fi

# UNATTENDED + a per-project local-env adapter (scripts/gen-local-env.sh): write
# local/ephemeral backend credentials, fail-closed. Without the adapter there are
# no local creds to generate — fall through to symlinking the repo-root env files.
if [ "${UNATTENDED:-}" = "1" ] && [ -x "$CLAUDE_PROJECT_DIR/scripts/gen-local-env.sh" ]; then
  "$CLAUDE_PROJECT_DIR/scripts/gen-local-env.sh" "$WORKTREE" >&2 || {
    echo "worktree-create: UNATTENDED=1 but local stack unavailable — removing uncredentialed worktree. Start your project's local stack first." >&2
    git worktree remove "$WORKTREE" >&2 || true
    exit 1
  }
else
  for envname in .env.local .env.test .env; do
    src="$CLAUDE_PROJECT_DIR/$envname"; dst="$WORKTREE/$envname"
    if [ -f "$src" ] && [ ! -e "$dst" ]; then
      ln -sf "$src" "$dst" >&2 || { echo "worktree-create: failed to symlink $envname" >&2; exit 1; }
    fi
  done
fi

# G1: the gate machinery must be live in the new worktree, or refuse it (fail-closed).
# All diagnostics go to stderr — stdout must carry only the worktree path.
if [ -f "$WORKTREE/package.json" ] && [ -d "$WORKTREE/.husky" ]; then
  ( cd "$WORKTREE" && npm install ) >&2 || {
    echo "worktree-create: npm install failed — gates not provable; removing worktree (fail-closed)." >&2
    git worktree remove --force "$WORKTREE" >&2 2>/dev/null || true
    exit 1
  }
  "$CLAUDE_PROJECT_DIR/scripts/assert-husky-shim.sh" "$WORKTREE" >&2 || {
    echo "worktree-create: gate shim missing after install; removing worktree (fail-closed)." >&2
    git worktree remove --force "$WORKTREE" >&2 2>/dev/null || true
    exit 1
  }
fi

echo "$WORKTREE"
