#!/bin/bash
# PreToolUse(Bash) hook — CREDENTIAL FIREWALL (F2 / CRITICAL-1 / MED-1).
#
# Blocks reading or exfiltrating credential FILES via Bash. This closes the bypass
# that a Read-tool deny + chmod cannot:
#   - `cat .env` via Bash never goes through the Read tool's deny list.
#   - the agent runs AS the file's owner, so `chmod 600` does not stop it reading.
# MED-1: every reachable credential file is treated as root — not just one key shape.
# The REAL fix is operational (don't put a prod key in the agent's env; apply prod
# migrations by hand — F4); this hook is defense-in-depth over that.
#
# FAIL CLOSED on missing jq. Exit 2 = block; exit 0 = allow.
# Note: block-dangerous-bash.sh blocks WRITING to credential paths; this blocks READING.

INPUT=$(cat)
command -v jq >/dev/null 2>&1 || {
  echo "block-credential-read: jq missing — cannot inspect command, BLOCKING (fail-closed). Install jq." >&2
  exit 2
}
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$CMD" ] && { echo "block-credential-read: empty command field — BLOCKING (fail-closed)." >&2; exit 2; }

block() {
  echo "Blocked by block-credential-read: $1" >&2
  echo "Credential files must not be read by the agent. Use a scoped/local credential; read it yourself if needed." >&2
  exit 2
}

# Is this argument a credential file? (.env.example/.sample/.template/.dist are
# committed, secret-free templates — explicitly allowed.)
is_credential() {
  b="${1##*/}"   # basename
  case "$b" in
    .env.example|.env.sample|.env.template|.env.dist) return 1 ;;
    .env|.env.*) return 0 ;;
  esac
  case "$b" in
    *.pem|*.key|id_rsa*|id_ed25519*|id_dsa*|id_ecdsa*) return 0 ;;
    .npmrc|.netrc|.pgpass) return 0 ;;
    credentials|credentials.json|*-credentials.json|*_credentials.json) return 0 ;;
    service-account*.json|*serviceaccount*.json|*-key.json) return 0 ;;
    *.tfvars|terraform.tfstate|terraform.tfstate.*) return 0 ;;
    secrets|secrets.*|*.secret|*.secrets) return 0 ;;
  esac
  case "$1" in
    */.aws/credentials|.aws/credentials|*/.ssh/id_*|.ssh/id_*) return 0 ;;
  esac
  return 1
}

# Verbs that read a file's contents or copy it elsewhere (exfil).
is_reader() {
  case "$1" in
    cat|less|more|nl|tac|head|tail|xxd|od|hexdump|strings|base64|openssl) return 0 ;;
    grep|egrep|fgrep|rg|ag|awk|sed|cut|sort|uniq|tr|paste|column) return 0 ;;
    cp|scp|rsync|tar|zip|gzip|install|dd) return 0 ;;
    source|.) return 0 ;;
    python3|python|node|nodejs|ruby|perl|php|bun|deno) return 0 ;;
    bash|sh|zsh|dash|ksh) return 0 ;;
  esac
  return 1
}

# Pre-split check: interpreter -c/-e code string references a credential file.
# tr splits on parens/semicolons; that fragments "open('.env')" into separate
# segments, losing the connection to the interpreter verb. Check raw CMD here.
_i_precheck=0
case "$CMD" in
  python3\ *|python\ *|node\ *|nodejs\ *|ruby\ *|perl\ *|php\ *|bun\ *|deno\ *) _i_precheck=1 ;;
esac
if [ "$_i_precheck" = 1 ]; then
  case "$CMD" in *\ -c\ *|*\ -c\"*|*\ -e\ *|*\ -e\"*|*\ -r\ *)
    case "$CMD" in
      *.env*|*id_rsa*|*.npmrc*|*credentials.json*|*.pem*|*.netrc*)
        block "interpreter -c/-e code string references a credential file" ;;
    esac
  esac
fi

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
  # strip wrapper words; for shell wrappers, also unwrap -c 'inner cmd'
  while [ $# -gt 0 ]; do
    case "$1" in
      sudo|env|command|time|nice|nohup|xargs|timeout|stdbuf|setsid|\\) shift ;;
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

  # A credential file as the target of a redirect-from (cmd < .env) — block.
  prev=""
  for tok in "$@"; do
    if [ "$prev" = "<" ]; then is_credential "$tok" && block "reading a credential file ($tok)"; fi
    case "$tok" in '<'*) t="${tok#<}"; [ -n "$t" ] && is_credential "$t" && block "reading a credential file ($t)" ;; esac
    prev="$tok"
  done

  is_reader "$verb" || continue
  shift
  for a in "$@"; do
    case "$a" in -*|*=*) continue ;; esac
    is_credential "$a" && block "$verb of a credential file ($a)"
  done
done <<EOF
$(printf '%s' "$CMD" | tr $';|&()`' $'\n')
EOF

exit 0
