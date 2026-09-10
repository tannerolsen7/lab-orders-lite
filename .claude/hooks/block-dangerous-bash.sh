#!/bin/bash
# PreToolUse(Bash) hook — THE KEYSTONE LOCK. Blocks destructive / irreversible
# NON-GIT shell operations. Git operations are handled by block-dangerous-git.sh
# (compose, do not duplicate).
#
# Design (R4-D8: the locks are the SOLE safety net — assume no practice DB anywhere):
#  - FAIL CLOSED. Missing jq, or any uncertainty, BLOCKS (exit 2). Over-blocking is
#    the safe failure mode — the human can always run an intended command themselves.
#  - Two layers: (A) raw-string scans for content-level danger (destructive SQL,
#    remote-code-exec, deploys), (B) per-segment argv parse for verb+target danger
#    (rm -rf, writes into protected paths). Both run; either can block.
#  - Parses each command SEGMENT (split on shell separators), stripping env
#    assignments and wrapper words (sudo/env/timeout/...) before reading the verb —
#    so `VAR=1 sudo rm -rf x` and newline-chained commands are still caught.
#
# Exit 2 = block; exit 0 = allow.

INPUT=$(cat)

# FAIL CLOSED on missing jq — unlike a fail-open guard, an un-inspectable command
# is treated as dangerous. (Phase 0 also fails-closed the older jq hooks.)
command -v jq >/dev/null 2>&1 || {
  echo "block-dangerous-bash: jq missing — cannot inspect the command, BLOCKING (fail-closed). Install jq." >&2
  exit 2
}

CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$CMD" ] && { echo "block-dangerous-bash: empty command field — BLOCKING (fail-closed)." >&2; exit 2; }

block() {
  echo "Blocked by block-dangerous-bash: $1" >&2
  echo "If genuinely intended, run it yourself in a terminal (the agent must not)." >&2
  exit 2
}

# Protected paths: the safety machinery + credentials. Matched against redirect
# targets and the arguments of mutating verbs (rm/cp/mv/ln/chmod/sed -i/...).
is_protected() {
  case "$1" in
    .git|.git/*|*/.git|*/.git/*) return 0 ;;
    .husky|.husky/*|*/.husky|*/.husky/*) return 0 ;;
    .claude/hooks|.claude/hooks/*|*/.claude/hooks|*/.claude/hooks/*) return 0 ;;
    .claude/agents|.claude/agents/*|*/.claude/agents|*/.claude/agents/*) return 0 ;;
    .claude/settings.json|*/.claude/settings.json) return 0 ;;
    .claude/settings.local.json|*/.claude/settings.local.json) return 0 ;;
    .env|.env.*|*/.env|*/.env.*) return 0 ;;
  esac
  return 1
}

# ---------------------------------------------------------------------------
# Layer A — raw-string scans (deliberately over-block; a comment containing the
# string is rare and a false block is cheap vs. an escaped destructive op).
# ---------------------------------------------------------------------------
shopt -s nocasematch

# Remote code execution: curl/wget/fetch ... | sh|bash|zsh
[[ "$CMD" =~ (curl|wget|fetch)[^|]*\|[[:space:]]*(sudo[[:space:]]+)?(ba|z|da|k)?sh([[:space:]]|$|\;) ]] &&
  block "piping a remote download into a shell (remote code execution)"

# Destructive SQL
[[ "$CMD" =~ drop[[:space:]]+(table|database|schema|index|view|role|user|function|trigger|type|sequence|materialized) ]] &&
  block "destructive SQL (DROP ...)"
[[ "$CMD" =~ truncate[[:space:]]+(table[[:space:]]+)?[a-z_\"\.\`]+ ]] &&
  block "destructive SQL (TRUNCATE ...)"
{ [[ "$CMD" =~ delete[[:space:]]+from[[:space:]] ]] && ! [[ "$CMD" =~ where ]]; } &&
  block "destructive SQL (DELETE without a WHERE clause)"

# Destructive DB / migration subcommands — migrations are human-applied (F4).
[[ "$CMD" =~ (db[[:space:]]+(reset|push)|migrate[[:space:]]+(reset|deploy|fresh)|db:drop|prisma[[:space:]]+migrate[[:space:]]+reset|drizzle-kit[[:space:]]+push|--force-reset) ]] &&
  block "destructive database / migration command (apply migrations by hand — F4)"

# Deploys / publishes (irreversible side effects)
[[ "$CMD" =~ (vercel[^;|\&]*(deploy|promote|--prod)|netlify[[:space:]]+deploy|(npm|yarn|pnpm)[[:space:]]+publish|firebase[[:space:]]+deploy|wrangler[[:space:]]+(deploy|publish)|(serverless|sls)[[:space:]]+deploy|terraform[[:space:]]+(apply|destroy)|kubectl[[:space:]]+(apply|delete)|docker[[:space:]]+push|gh[[:space:]]+release[[:space:]]+create|eas[[:space:]]+(build|submit)|(fly|flyctl)[[:space:]]+deploy) ]] &&
  block "deploy / publish (irreversible side effect)"

# Destructive cloud
{ [[ "$CMD" =~ aws[[:space:]]+s3[[:space:]]+(rm|rb) ]] || [[ "$CMD" =~ aws[[:space:]]+[a-z0-9-]+[[:space:]]+delete- ]]; } &&
  block "destructive cloud command (aws rm/rb/delete-*)"

# Disk catastrophe / fork bomb
{ [[ "$CMD" =~ mkfs ]] || [[ "$CMD" =~ dd[[:space:]].*of=/dev/ ]] || [[ "$CMD" =~ \>[[:space:]]*/dev/(sd|nvme|disk|rdisk) ]]; } &&
  block "raw disk write / format"
[[ "$CMD" =~ :\(\)\{ ]] && block "fork bomb"

shopt -u nocasematch

# ---------------------------------------------------------------------------
# Layer B — per-segment argv parse (verb + target).
# ---------------------------------------------------------------------------
ENVRE='^[A-Za-z_][A-Za-z0-9_]*=("[^"]*"|[^[:space:]]*)([[:space:]]+(.*))?$'

while IFS= read -r seg; do
  seg="${seg#"${seg%%[![:space:]]*}"}"
  [ -z "$seg" ] && continue
  # peel leading env assignments
  while [[ "$seg" =~ $ENVRE ]]; do
    [ -z "${BASH_REMATCH[3]}" ] && { seg=""; break; }
    seg="${BASH_REMATCH[3]}"
  done
  [ -z "$seg" ] && continue
  set -f; set -- $seg; set +f
  # strip wrapper words; for shell/runner wrappers, also unwrap -c 'inner cmd'
  while [ $# -gt 0 ]; do
    case "$1" in
      sudo|env|command|time|nice|nohup|xargs|timeout|stdbuf|setsid|\\) shift ;;
      npx|yarn|pnpm) shift ;;
      bash|sh|zsh|dash|ksh) shift
        if [ "${1:-}" = "-c" ] && [ -n "${2:-}" ]; then
          shift
          inner="$*"; inner="${inner#\'}"; inner="${inner%\'}"; inner="${inner#\"}"; inner="${inner%\"}"
          set -f; set -- $inner; set +f
        fi ;;
      *) break ;;
    esac
  done
  [ $# -eq 0 ] && continue
  verb="$1"

  # Redirects into a protected path — glued forms (>tgt, 2>tgt) and spaced (> tgt, 2> tgt).
  prev=""
  for tok in "$@"; do
    case "$tok" in
      '>'*|'>>'*|[0-9]'>'*|[0-9]'>>'*)
        tgt="$tok"
        case "$tgt" in [0-9]*) tgt="${tgt#?}" ;; esac  # strip leading fd digit
        tgt="${tgt#>}"; tgt="${tgt#>}"                  # strip > or >>
        case "$tgt" in '&'*) tgt="" ;; esac             # skip fd redirects like 2>&1
        [ -n "$tgt" ] && is_protected "$tgt" && block "redirect into a protected path ($tgt)"
        ;;
    esac
    case "$prev" in ">"|">>"|[0-9]">"|[0-9]">>")
      is_protected "$tok" && block "redirect into a protected path ($tok)"
    ;; esac
    prev="$tok"
  done

  case "$verb" in
    rm)
      rec=0; frc=0; rf=0
      for a in "$@"; do
        case "$a" in
          --recursive) rec=1 ;;
          --force) frc=1 ;;
          --) break ;;
          -*r*f*|-*f*r*) rf=1 ;;
          -*r*) rec=1 ;;
          -*f*) frc=1 ;;
        esac
      done
      { [ "$rf" = 1 ] || { [ "$rec" = 1 ] && [ "$frc" = 1 ]; }; } && block "rm -rf (recursive forced delete)"
      shift
      for a in "$@"; do
        case "$a" in -*) continue ;; esac
        is_protected "$a" && block "rm of a protected path ($a)"
      done
      ;;
    cp|mv|ln|tee|dd|truncate|install|rsync)
      for a in "$@"; do
        case "$a" in -*|*=*) continue ;; esac
        is_protected "$a" && block "$verb touching a protected path ($a)"
      done
      ;;
    chmod|chown|chattr|chflags)
      for a in "$@"; do
        case "$a" in -*) continue ;; esac
        is_protected "$a" && block "$verb on a protected path ($a)"
      done
      ;;
    sed)
      inplace=0
      for a in "$@"; do case "$a" in -i|-i*|--in-place*) inplace=1 ;; esac; done
      if [ "$inplace" = 1 ]; then
        for a in "$@"; do
          case "$a" in -*) continue ;; esac
          is_protected "$a" && block "sed -i on a protected path ($a)"
        done
      fi
      ;;
  esac
done <<EOF
$(printf '%s' "$CMD" | tr $';|&()`' $'\n')
EOF

exit 0
