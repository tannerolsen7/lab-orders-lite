---
name: handoff
description: Produces a frictionless handoff — what was done, what's left, the exact commands to continue, and what needs the human. Use when wrapping up a session, handing work to another person or a fresh conversation, when a task is blocked on a human decision / merge / guard-file placement, or when the user says "/handoff", "hand off", "wrap up", "where are we", "what's left", "let's start a new conversation", "summarize where we are", "I'm done for today", "let's stop here", "before I close", or pauses work mid-task. Every task that needs the human to act should end with this.
---

# /handoff — leave the next person (or session) a clean runway

The goal: whoever picks this up — a teammate, or you in a fresh conversation — can continue in
**under a minute** without re-deriving context. This is the operational form of the frictionless-handoff
rule (R4-D24): every handback ends with a checklist + exact commands.

## Step 1 — Gather the state (read it, don't guess)

- `git rev-parse --abbrev-ref HEAD` + `git status --short` — branch + any uncommitted work
- `git log --oneline -10` — recent commits
- Open PRs/MRs: `gh pr list --state open` (GitHub) or `glab mr list` (GitLab) — see `scripts/detect-forge.sh`
- `git worktree list` — any live worktrees + their branches
- The current TODO / task list, and any blocking items in `.claude/questions.md`
- Verification state: did the gates pass? Cite the **actual last result** — never claim green without it.

## Step 2 — Produce the handoff block

Output exactly this structure (omit a section only if genuinely empty):

```
## Handoff — <one-line: what this work is>

### Done
- <what landed + where: commit SHAs, merged PRs, files>

### In progress / not done
- <what's started but unfinished — and the next concrete step for each>

### Needs you (human)
- <decisions to make · PRs to review/merge · guard-file placements · paid/access steps> — each with the why

### Continue from here (exact commands)
\`\`\`bash
cd <worktree or repo path>
<the literal next command(s): start the dev server, run the tests, open an artifact, check out a branch>
\`\`\`

### Open questions / risks
- <anything unresolved the next session must know before proceeding>

### Links
- PRs/MRs: <#n — title — url>
- Branches / worktrees: <name → path>
```

## Rules

- **Exact commands, not descriptions.** "cd to the worktree and run the tests" → the literal
  `cd <path> && npm test`. The "Continue from here" block must run as-is.
- **Honest state** (Honest claims, R4-D7#4). If the gates failed or a step was skipped, say so with
  the evidence. Never claim done/green without the result; never emit a faked metric.
- **No re-derivation.** Link the spec / feature doc / PR so the next reader doesn't reconstruct context.
- **Name what's blocked on the human** explicitly — especially guard-file placements and merges the
  agent can't do itself — so nothing silently waits.

## When to fire

- A task is complete and being handed back.
- A task is blocked and needs a human decision, a merge, or a guard-file placement.
- A session is wrapping up or continuing in a fresh conversation.
- The operator asks "where are we" / "what's left" / "/handoff".
