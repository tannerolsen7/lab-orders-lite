#!/bin/bash
# PreToolUse(Bash) hook. Blocks destructive/irreversible git ops.
# Parses each command SEGMENT (split on shell separators) and strips env
# assignments, wrapper words (sudo/xargs/...), and git global options
# (-C/-c/--git-dir) before reading the subcommand — so `git -C dir push`,
# `VAR=1 git push`, and newline-chained pushes are all caught, while a
# substring like grep "git push" is not.  Exit 2 = block; exit 0 = allow.

INPUT=$(cat)

# No jq → can't safely extract the command. FAIL CLOSED (HIGH-1): an un-inspectable
# command is treated as dangerous. The locks are the sole safety net (R4-D8).
command -v jq >/dev/null 2>&1 || { echo "block-dangerous-git.sh: jq missing — cannot inspect command, BLOCKING (fail-closed). Install jq." >&2; exit 2; }

CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$CMD" ] && { echo "block-dangerous-git.sh: empty command field — BLOCKING (fail-closed)." >&2; exit 2; }

block() { echo "Blocked by block-dangerous-git.sh: $1" >&2; echo "If genuinely intended, run it yourself in a terminal." >&2; exit 2; }

# dst branch of a push refspec: strip surrounding quotes, take the refspec dst,
# strip a refs/heads/ prefix.
norm_ref() {
  local r="$1"
  r="${r#\"}"; r="${r%\"}"; r="${r#\'}"; r="${r%\'}"
  r="${r##*:}"
  echo "${r#refs/heads/}"
}

# Resolve the branch the git command would act on.
# Priority: explicit -C flag on the git command > preceding cd in the chain > hook cwd.
# Falls back to ambient branch when the target path isn't a git repo (avoids a silent bypass
# where `git -C /non-git-path rev-parse` returns empty and the branch check is skipped).
_resolve_branch() {
  local dir="${_gitC:-$_tracked_cd}"
  local cur=""
  if [ -n "$dir" ]; then
    cur=$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null)
  fi
  # Fallback: non-git target or no dir specified — use the ambient branch.
  if [ -z "$cur" ]; then
    cur=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  fi
  echo "$cur"
}

# matches one leading NAME=VALUE env assignment (VALUE may be double-quoted and
# contain spaces), plus trailing whitespace and the rest of the command.
ENVRE='^[A-Za-z_][A-Za-z0-9_]*=("[^"]*"|[^[:space:]]*)([[:space:]]+(.*))?$'

# Track the last cd target seen in the command chain so that
# `cd .claude/worktrees/slug && git commit` is checked against the worktree's
# branch, not the hook process's cwd.  An explicit `git -C <dir>` takes
# priority over _tracked_cd (see _resolve_branch above).
_tracked_cd=""

while IFS= read -r seg; do
  seg="${seg#"${seg%%[![:space:]]*}"}"
  [ -z "$seg" ] && continue
  # peel leading env assignments off the raw string first, so a quoted value
  # with spaces can't break word-splitting and hide the git invocation.
  while [[ "$seg" =~ $ENVRE ]]; do
    [ -z "${BASH_REMATCH[3]}" ] && { seg=""; break; }
    seg="${BASH_REMATCH[3]}"
  done
  [ -z "$seg" ] && continue
  set -f; set -- $seg; set +f
  while [ $# -gt 0 ]; do
    case "$1" in
      sudo|env|command|time|nice|nohup|xargs|\\) shift ;;
      *) break ;;
    esac
  done
  # Track cd so subsequent git commands resolve the branch in the right dir.
  if [ "$1" = "cd" ] && [ -n "$2" ]; then _tracked_cd="$2"; continue; fi
  [ "$1" = "git" ] || continue
  shift
  _gitC=""
  while [ $# -gt 0 ]; do
    case "$1" in
      -C) _gitC="$2"; shift 2 ;;
      -c) case "$2" in core.hooksPath=*) block "git -c core.hooksPath=... — agents cannot redirect the hooks path" ;; esac; shift 2 ;;
      --git-dir=*|--work-tree=*|--namespace=*|-p|--no-pager|--paginate|--bare) shift ;;
      -*) shift ;;
      *) break ;;
    esac
  done
  sub="$1"; [ $# -gt 0 ] && shift
  case "$sub" in
    reset)  for a in "$@"; do [ "$a" = "--hard" ] && block "git reset --hard (destructive)"; done ;;
    clean)  block "git clean (destructive)" ;;
    stash)  [ "$1" = "clear" ] && block "git stash clear (drops all stashes)" ;;
    branch)
      _has_D=0; _has_force=0; _has_delete=0; _branch_name=""; _bcount=0
      for a in "$@"; do
        case "$a" in
          --force) _has_force=1 ;;
          --delete) _has_delete=1 ;;
          --*) : ;;
          -*D*) _has_D=1 ;;
          -*) : ;;
          *) _bcount=$((_bcount+1)); [ "$_bcount" -eq 1 ] && _branch_name="$a" ;;
        esac
      done
      [ "$_has_force" -eq 1 ] && [ "$_has_delete" -eq 1 ] && _has_D=1
      if [ "$_has_D" -eq 1 ]; then
        if [ "$_bcount" -eq 0 ]; then
          block "git branch -D with no branch name — cannot check for unmerged commits"
        elif [ "$_bcount" -gt 1 ]; then
          block "git branch -D with multiple branch names — check each manually in a terminal"
        else
          _default=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||')
          [ -z "$_default" ] && _default="main"
          if ! git diff --quiet "$_default" "$_branch_name" 2>/dev/null; then
            block "git branch -D '$_branch_name' has changes not in '$_default' — check them first, then run it yourself in a terminal"
          fi
        fi
      fi ;;
    commit)
      # Block committing on main/master/develop — work must start on a feature branch.
      _cur=$(_resolve_branch)
      case "$_cur" in main|master|develop) block "commit on protected branch '$_cur' — run: git checkout -b feat/<slug>" ;; esac
      for a in "$@"; do
        case "$a" in
          --no-verify|-n) block "git commit --no-verify — agents cannot bypass pre-commit hooks" ;;
          -*n*) block "git commit -n flag — agents cannot bypass pre-commit hooks" ;;
        esac
      done ;;
    push)
      for a in "$@"; do
        case "$a" in
          --force|--force-with-lease|--force-with-lease=*|--force=*) block "force push (rewrites remote history)" ;;
          --no-verify) block "git push --no-verify — agents cannot bypass pre-push hooks" ;;
          --*) : ;;
          -*f*) block "force push (-f)" ;;
        esac
      done
      _non_flag=0; _has_colon=0
      for a in "$@"; do
        case "$a" in -*) continue ;; esac
        _non_flag=$((_non_flag+1))
        _ref=$(norm_ref "$a")
        [ "$_ref" = "HEAD" ] && _ref=$(_resolve_branch)
        case "$_ref" in main|master|develop) block "push to a protected branch (main/master/develop)" ;; esac
        case "$a" in *:*) _has_colon=1 ;; esac
      done
      # Bare push (no refspec or remote-only): resolve current branch and block if protected.
      # Closes the "git push origin" gap — remote named but target branch inferred.
      if [ "$_has_colon" -eq 0 ] && [ "$_non_flag" -le 1 ]; then
        _cur=$(_resolve_branch)
        case "$_cur" in main|master|develop) block "push to protected branch '$_cur' (no refspec — current branch inferred)" ;; esac
      fi ;;
    restore)
      # Restoring a protected file reverts safety machinery. Block any path that matches.
      for a in "$@"; do
        case "$a" in -*) continue ;; esac
        case "$a" in
          .claude/hooks|.claude/hooks/*|.husky|.husky/*|\
          .claude/settings.json|.claude/settings.local.json)
            block "git restore of a protected path ($a)" ;;
        esac
      done ;;
    checkout)
      # `git checkout -- file` restores a file from HEAD. `git checkout branch` is safe.
      # Only block when -- signals a path restore, not a branch switch.
      _saw_dashdash=0
      for a in "$@"; do
        [ "$a" = "--" ] && { _saw_dashdash=1; continue; }
        [ "$_saw_dashdash" = 0 ] && continue
        case "$a" in
          .claude/hooks|.claude/hooks/*|.husky|.husky/*|\
          .claude/settings.json|.claude/settings.local.json)
            block "git checkout of a protected path ($a)" ;;
        esac
      done ;;
    remote)
      # Adding or changing a remote URL is an exfiltration path (push to attacker-controlled host).
      case "${1:-}" in
        add|set-url) block "git remote $1 — agents cannot add or change remotes (exfiltration path)" ;;
      esac ;;
    worktree)
      # This project's worktree convention is .claude/worktrees/<slug> (see AI-WORKFLOW.md),
      # not the system-default ../worktree-* — adapt the allowed path accordingly.
      [ "$1" = "remove" ] && { shift
        for a in "$@"; do
          case "$a" in -*) continue ;; esac
          case "$a" in
            .claude/worktrees/*) case "$a" in *..*) block "git worktree remove path traversal" ;; esac ;;
            *) block "git worktree remove of a path other than .claude/worktrees/*" ;;
          esac
          break
        done ; } ;;
  esac
done <<EOF
$(printf '%s' "$CMD" | tr $';|&()`' $'\n')
EOF
exit 0
