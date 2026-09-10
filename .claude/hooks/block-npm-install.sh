#!/bin/bash
# PreToolUse(Bash) hook. Blocks npm commands that ADD a dependency.
# Allows: npm ci, bare npm install, flag-only installs. Exit 2 = block.

INPUT=$(cat)
# FAIL CLOSED (HIGH-1): no jq → can't inspect → block rather than silently disable.
command -v jq >/dev/null 2>&1 || { echo "block-npm-install.sh: jq missing — cannot inspect command, BLOCKING (fail-closed). Install jq." >&2; exit 2; }
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$CMD" ] && exit 0

# A heredoc body is data, not a command — unless its consumer is an interpreter, in which case
# the helper leaves it alone. Matching text a command merely writes blocked docs and workflow
# files that quote an install line, and taught everyone to route around the guard with a tool it
# cannot see. FAIL CLOSED: if the helper is missing, analyse the raw command rather than skip.
_LIB="$(dirname "$0")/lib/strip-heredocs.sh"
if [ -r "$_LIB" ]; then
  . "$_LIB"
  CMD=$(printf '%s' "$CMD" | strip_heredocs)
fi

while IFS= read -r seg; do
  seg="${seg#"${seg%%[![:space:]]*}"}"
  [ -z "$seg" ] && continue
  set -f; set -- $seg; set +f
  while [ $# -gt 0 ]; do
    case "$1" in
      [A-Za-z_]*=*) shift ;;
      sudo|env|command|time|nice|nohup|\\) shift ;;
      *) break ;;
    esac
  done
  [ "$1" = "npm" ] || continue
  shift
  # npm accepts global flags (and their values) before the subcommand, so scan
  # for the install/add token rather than assuming it is $1; once found, any
  # later non-flag token is a package being added.
  found=0
  for a in "$@"; do
    if [ "$found" = 1 ]; then
      case "$a" in
        -*) continue ;;
        *) echo "Blocked by block-npm-install.sh: npm install/add/link/update of a package — add deps manually after review (CLAUDE.md)." >&2
           echo "Allowed: npm ci, bare npm install, flag-only installs. Run it yourself if intended." >&2
           exit 2 ;;
      esac
    fi
    case "$a" in
      install|i|in|ins|inst|insta|instal|isntall|isnt|add|link|ln|update|up|upgrade) found=1 ;;
    esac
  done
done <<EOF
$(printf '%s' "$CMD" | tr $';|&()`' $'\n')
EOF
exit 0
