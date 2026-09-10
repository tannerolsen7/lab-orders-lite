#!/bin/bash
# PreToolUse(Bash) hook — BASIC EGRESS CONTROL (F3-lite / CRITICAL-3).
#
# Blocks OUTBOUND DATA-SENDING to non-local hosts — the exfil/mutation leg of the
# lethal trifecta that is live on human-started runs via /spike + WebFetch + curl.
# This is the "basic" pull-forward; the full host-allowlist + operation gate (F3/F5)
# stay deferred until a free-text trigger ships.
#
# Policy (method-based, project-agnostic — no host list to maintain):
#   BLOCK: curl/wget that SEND a body (POST/PUT/PATCH/DELETE, --data/-F/-T/--json,
#          --post-data/--post-file) to a non-localhost host; `gh api` non-GET.
#   ALLOW: GET fetches (research/downloads), and any data-send to localhost
#          (local API testing). Read-only egress is not restricted here.
#
# FAIL CLOSED on missing jq, and when a data-send has no identifiable local target.
# Exit 2 = block; exit 0 = allow.

INPUT=$(cat)
command -v jq >/dev/null 2>&1 || {
  echo "block-egress: jq missing — cannot inspect command, BLOCKING (fail-closed). Install jq." >&2
  exit 2
}
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$CMD" ] && { echo "block-egress: empty command field — BLOCKING (fail-closed)." >&2; exit 2; }

block() {
  echo "Blocked by block-egress: $1" >&2
  echo "Read-only fetches and localhost are allowed. Send external data yourself if intended." >&2
  exit 2
}

is_local_host() {
  case "$1" in
    localhost|localhost:*|127.0.0.1|127.0.0.1:*|0.0.0.0|0.0.0.0:*|\
    ::1|\[::1\]|\[::1\]:*|host.docker.internal|host.docker.internal:*) return 0 ;;
  esac
  return 1
}

ENVRE='^[A-Za-z_][A-Za-z0-9_]*=("[^"]*"|[^[:space:]]*)([[:space:]]+(.*))?$'

while IFS= read -r seg; do
  seg="${seg#"${seg%%[![:space:]]*}"}"
  [ -z "$seg" ] && continue
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

  case "$verb" in
    curl|wget)
      sending=0; wantmethod=0
      for a in "$@"; do
        case "$a" in
          -d|--data|--data-*|--data=*|-F|--form|--form-*|--form=*|-T|--upload-file|--upload-file=*|--json|--json=*) sending=1; wantmethod=0 ;;
          --post-data*|--post-file*|--body-data*|--body-file*) sending=1; wantmethod=0 ;;
          -X|--request) wantmethod=1 ;;
          --request=*|--method=*) m="${a#*=}"; case "$m" in POST|PUT|PATCH|DELETE|post|put|patch|delete) sending=1 ;; esac; wantmethod=0 ;;
          POST|PUT|PATCH|DELETE|post|put|patch|delete) [ "$wantmethod" = 1 ] && sending=1; wantmethod=0 ;;
          *) wantmethod=0 ;;
        esac
      done
      if [ "$sending" = 1 ]; then
        nonlocal=0; localp=0
        for a in "$@"; do
          case "$a" in
            http://*|https://*|ftp://*|ftps://*)
              h="${a#*://}"; h="${h%%/*}"; h="${h##*@}"
              if is_local_host "$h"; then localp=1; else nonlocal=1; fi ;;
            localhost|localhost:*|localhost/*|127.0.0.1|127.0.0.1:*|127.0.0.1/*|0.0.0.0*|::1*|\[::1\]*|host.docker.internal*) localp=1 ;;
          esac
        done
        { [ "$nonlocal" = 1 ] || [ "$localp" = 0 ]; } &&
          block "outbound data-send to a non-local host ($verb) — basic egress control (full allowlist F3 deferred)"
      fi
      ;;
    gh)
      if [ "${2:-}" = "api" ]; then
        mut=0; wm=0
        for a in "$@"; do
          case "$a" in
            -X|--method) wm=1 ;;
            --method=*) m="${a#--method=}"; case "$m" in POST|PUT|PATCH|DELETE|post|put|patch|delete) mut=1 ;; esac; wm=0 ;;
            POST|PUT|PATCH|DELETE|post|put|patch|delete) [ "$wm" = 1 ] && mut=1; wm=0 ;;
            *) wm=0 ;;
          esac
        done
        [ "$mut" = 1 ] && block "gh api mutation (non-GET) — external write (basic egress control)"
      fi
      ;;
  esac
done <<EOF
$(printf '%s' "$CMD" | tr $';|&()`' $'\n')
EOF

exit 0
