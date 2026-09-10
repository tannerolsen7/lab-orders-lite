#!/bin/bash
# Logs every tool call to a per-project JSONL file for session-end analysis.
# Used to identify safe patterns not yet in the allowlist.
INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
if [ "$TOOL" = "Skill" ]; then
  FIRST_KEY="skill"
  FIRST_VAL=$(echo "$INPUT" | jq -r '.tool_input.skill // ""')
else
  FIRST_KEY=$(echo "$INPUT" | jq -r '.tool_input | keys[0] // "?"')
  FIRST_VAL=$(echo "$INPUT" | jq -r --arg k "$FIRST_KEY" '.tool_input[$k] // ""' | head -c 300)
fi
HASH=$(set -o pipefail; echo "${CLAUDE_PROJECT_DIR:-/}" | md5 2>/dev/null | cut -c1-8 \
  || echo "${CLAUDE_PROJECT_DIR:-/}" | md5sum 2>/dev/null | cut -c1-8 \
  || echo "00000000")
LOGFILE="/tmp/claude-perm-log-${HASH}.jsonl"
printf '%s\n' "{\"ts\":$(date +%s),\"tool\":\"$TOOL\",\"key\":\"$FIRST_KEY\",\"val\":$(printf '%s' "$FIRST_VAL" | jq -Rs .)}" >> "$LOGFILE"
exit 0
