#!/bin/bash
# Removes heredoc BODIES from a command string, so a hook that pattern-matches a command does
# not match text the command is merely writing to a file.
#
# `cat > x.md <<'EOF' ... npm install ... EOF` runs no npm. Matching it blocked documentation
# and workflow files that quote a command, and taught everyone that the way past a guard is to
# write the file with a tool the guard cannot see — which is worse than the false positive.
#
# EXCEPT when the heredoc feeds an interpreter. `bash <<EOF ... EOF` executes its body, so that
# body is a command and stays. The list is deliberately generous: anything not recognised as an
# interpreter is treated AS an interpreter, so an unknown consumer keeps its body and fails
# closed.
#
# Usage: printf '%s' "$CMD" | strip_heredocs

strip_heredocs() {
  awk '
    function opener_is_interpreter(line,    first) {
      # first word, skipping env assignments and common wrappers
      while (match(line, /^[ \t]*([A-Za-z_][A-Za-z0-9_]*=[^ \t]*|sudo|env|command|time|nice|nohup)[ \t]+/)) {
        line = substr(line, RSTART + RLENGTH)
      }
      if (!match(line, /^[ \t]*[^ \t]+/)) return 1
      first = substr(line, RSTART, RLENGTH)
      gsub(/^[ \t]+/, "", first)
      sub(/.*\//, "", first)
      # Consumers that write their input somewhere instead of executing it. Anything else
      # keeps its body.
      if (first == "cat" || first == "tee" || first == "jq" || first == "grep" ||
          first == "sed" || first == "awk" || first == "sort" || first == "wc" ||
          first == "diff" || first == "head" || first == "tail") return 0
      return 1
    }
    !inbody {
      print
      if (match($0, /<<-?[ \t]*['\''"]?[A-Za-z_][A-Za-z0-9_]*['\''"]?/)) {
        d = substr($0, RSTART, RLENGTH)
        sub(/^<<-?[ \t]*/, "", d)
        gsub(/['\''"]/, "", d)
        if (!opener_is_interpreter($0)) { delim = d; inbody = 1 }
      }
      next
    }
    {
      line = $0
      gsub(/^[ \t]+/, "", line)
      if (line == delim) { inbody = 0 }
      next
    }
  '
}
