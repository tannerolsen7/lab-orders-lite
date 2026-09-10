#!/bin/bash
set -euo pipefail

INPUT=$(cat)

# stop_hook_active is a JSON field on stdin, not an env var.
# If Claude re-entered after a stop, skip to avoid looping.
if printf '%s' "$INPUT" | jq -e '.stop_hook_active == true' >/dev/null 2>&1; then
  exit 0
fi

# Subagent stops include agent_type on stdin. Only top-level stops write a record.
AGENT_TYPE=$(printf '%s' "$INPUT" | jq -r '.agent_type // ""')
[ -n "$AGENT_TYPE" ] && exit 0

PROJ="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJ"

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
RECENT_COMMITS=$(git log --oneline -5 2>/dev/null || echo "(no commits)")
PR_URL=$(gh pr view --json url -q .url 2>/dev/null || echo "")
WORKTREES=$(git worktree list 2>/dev/null | tail -n +2 || echo "")
QUESTIONS=""
if [ -f ".claude/questions.md" ]; then
  # grep -c exits 1 on zero matches; the || 0 is required, not cosmetic.
  BLOCKING=$(grep -c "^\*\*Type:\*\* BLOCKING" .claude/questions.md 2>/dev/null || echo "0")
  if [ "$BLOCKING" -gt 0 ]; then
    QUESTIONS="$BLOCKING blocking question(s) in .claude/questions.md"
  fi
fi

printf '\n'
printf '## Handoff — %s\n' "$BRANCH"
printf '\n'

printf '### Done\n'
printf '%s\n' "$RECENT_COMMITS" | while IFS= read -r line; do
  printf '%s\n' "- $line"
done
printf '\n'

printf '### In-flight\n'
if [ -n "$QUESTIONS" ]; then
  printf '%s\n' "- $QUESTIONS"
fi
DIRTY=$(git status --short 2>/dev/null || true)
if [ -n "$DIRTY" ]; then
  printf '%s\n' "- Uncommitted changes on $BRANCH"
fi
if [ -z "$QUESTIONS" ] && [ -z "$DIRTY" ]; then
  printf '%s\n' "- (none)"
fi
printf '\n'

printf '### Continue from here\n'
printf '```bash\n'
printf 'cd %s\n' "$PROJ"
if [ -n "$PR_URL" ]; then
  printf '%s\n' "# PR: $PR_URL"
fi
if [ -n "$WORKTREES" ]; then
  printf '%s\n' "# Live worktrees:"
  printf '%s\n' "$WORKTREES" | while IFS= read -r line; do
    printf '%s\n' "#   $line"
  done
fi
printf 'git status\n'
printf '```\n'
printf '\n'

# Write one activity record to .claude/activity/{branch-slug}.jsonl.
# Errors go to stderr only — this block must never block the session stop.
(
  set -euo pipefail
  SESSION_ID=$(printf '%s' "$INPUT" | jq -r '.session_id // ""')
  HASH=$(echo "${CLAUDE_PROJECT_DIR:-/}" | md5 2>/dev/null | cut -c1-8 \
    || echo "${CLAUDE_PROJECT_DIR:-/}" | md5sum 2>/dev/null | cut -c1-8 \
    || echo "00000000")
  LOGFILE="/tmp/claude-perm-log-${HASH}.jsonl"

  TMPFILE="/tmp/claude-activity-${SESSION_ID}"
  if [ -f "$TMPFILE" ]; then
    START_TS=$(cut -d' ' -f1 "$TMPFILE")
    MODEL=$(cut -d' ' -f2- "$TMPFILE")
    STOP_TS=$(date +%s)
    DURATION_JSON=$((STOP_TS - START_TS))
  else
    MODEL="unknown"
    DURATION_JSON="null"
  fi

  SKILLS_JSON="[]"
  if [ -f "$LOGFILE" ]; then
    SKILLS_JSON=$(jq -rs '[.[] | select(.tool == "Skill") | .val | select(. != "")] | unique | sort' \
      "$LOGFILE" 2>/dev/null || printf '[]')
  fi

  SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
  SLUG=$(printf '%s' "$BRANCH" | sed 's|/|-|g' | tr -cd 'a-zA-Z0-9-')
  mkdir -p "$PROJ/.claude/activity"
  TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  printf '%s\n' \
    "$(jq -nc --arg ts "$TS" --arg branch "$BRANCH" --arg sha "$SHA" \
              --arg model "$MODEL" --argjson skills "$SKILLS_JSON" \
              --argjson dur "$DURATION_JSON" \
       '{ts:$ts,branch:$branch,sha:$sha,model:$model,skills:$skills,duration_s:$dur}')" \
    >> "$PROJ/.claude/activity/${SLUG}.jsonl"
) 2>&1 | sed 's/^/activity-writer: /' >&2 || true

# Remove the session worktree when the session did no work, to keep the branch list clean.
_SESSION_ID=$(printf '%s' "$INPUT" | jq -r '.session_id // ""')
if [ -n "$_SESSION_ID" ]; then
  _SESSION_WT_FILE="/tmp/claude-session-wt-${_SESSION_ID}"
  if [ -f "$_SESSION_WT_FILE" ]; then
    _SESSION_WT=$(cat "$_SESSION_WT_FILE")
    _SESSION_BRANCH="session/${_SESSION_ID}"
    if [ -n "$_SESSION_WT" ]; then
      _DEFAULT_BRANCH=$(git -C "$PROJ" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null \
        | sed 's|refs/remotes/origin/||' || echo "main")
      # Fall back to 1 (not 0) so a git failure preserves the branch rather than deleting it.
      _AHEAD=$(git -C "$PROJ" rev-list --count "${_DEFAULT_BRANCH}..${_SESSION_BRANCH}" \
        2>/dev/null || echo "1")
      case "$_AHEAD" in ''|*[!0-9]*) _AHEAD=1 ;; esac
      if [ "$_AHEAD" -eq 0 ]; then
        if git -C "$PROJ" worktree remove "$_SESSION_WT" 2>/dev/null; then
          git -C "$PROJ" branch -d "$_SESSION_BRANCH" 2>/dev/null || true
          rm -f "$_SESSION_WT_FILE" || true
        fi
      else
        printf '\n=== Session branch %s has %s commit(s) — run /feature or open a PR to merge ===\n' \
          "$_SESSION_BRANCH" "$_AHEAD"
        rm -f "$_SESSION_WT_FILE" || true
      fi
      unset _DEFAULT_BRANCH _AHEAD
    else
      rm -f "$_SESSION_WT_FILE" || true
    fi
    unset _SESSION_WT _SESSION_BRANCH
  fi
  unset _SESSION_WT_FILE
fi
unset _SESSION_ID
