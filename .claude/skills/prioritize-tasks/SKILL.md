---
name: prioritize-tasks
description: |
  Reads TASKS.md and STRATEGY.md, produces a recommended priority reordering
  aligned with the current north star and product stage, flags stale tasks and
  unreviewed backlog entries, and waits for human confirmation before writing
  changes. Use when the user asks "what should I work on", "help me prioritize",
  "which tasks matter most right now", "reorder the backlog", "what's next", or
  invokes /prioritize-tasks. Also run as part of the weekly planning ritual
  alongside any architecture and context-freshness checks (tracked in rituals.md).
---

## Prerequisites

- `TASKS.md` exists
- Read `STRATEGY.md` (if present) before evaluating any task
- Read `TASKS.md` in full before producing any recommendation

If `TASKS.md` doesn't exist: stop and surface — "TASKS.md not found. Create it before running /prioritize-tasks."

---

## Presenting decisions to the human

Every place below where the human is asked to decide, approve, or confirm
something must do three things. The goal is not to dumb the information
down — it's to make it as easy as possible to read, understand, and decide
on:

1. **Full context first.** State what's being decided and why it matters, in
   one message. Don't make the human scroll back through the conversation to
   piece it together.
2. **Plain words — teachable, not dumbed down.** 8th/9th-grade English. If a
   technical term really is the clearest word, say the plain-English effect
   *before* using the term — never name a mechanism and assume it's
   understood (see `~/.claude/CLAUDE.md` → "Communication voice"). The bar:
   could the human explain this back to a colleague and answer a follow-up
   question about it, confidently? If not, simplify the language further —
   never cut real information to get there.
3. **Leave the door open.** Close with something like "ask me to explain any
   part of this before you decide." A summary the human can't question is a
   rubber stamp, not a decision.

**Choosing how to ask.** For a small set of discrete choices — approve
vs. reject, pick one of a few options — use `AskUserQuestion`; it renders as
clickable options and already has a built-in escape hatch (the human can
always answer "Other" with free text instead of picking a preset). For
anything the human needs to actually read before deciding — a reordered task
list, a backlog diff, a full report — present it as prose or a document; a
structured question can't hold that much content.

This applies to: the recommendation in Step 3, where the human confirms or
adjusts the reordering, flags, and backlog changes before anything is written.

---

## Step 1 — Read and parse

Read both files in full. From `STRATEGY.md` extract:
- Current stage
- North star (the 12-month outcome)
- Decided constraints
- Out of scope items

From `TASKS.md` extract:
- All active tasks with their current status
- All `[backlog]` entries
- Any tasks marked BLOCKED
- Last-modified dates if present

---

## Step 2 — Evaluate

For each active task, evaluate against `STRATEGY.md`:

**Alignment check:**
- Does this task move toward the north star?
- Does it conflict with a decided constraint?
- Does it touch something explicitly out of scope?

**Staleness check:**
- Has this task been in the queue more than 30 days without moving? Flag it.
- Is it BLOCKED? Surface what's blocking it.

**Backlog check:**
- For each `[backlog]` entry: does it align with current stage and north star?
- Flag any High severity backlog entries older than 30 days for immediate review.

---

## Step 3 — Produce recommendation

Output a recommended `TASKS.md` reordering. Format:

```
## Priority Recommendation — YYYY-MM-DD

### Recommended active task order
1. [task] — [one-line reason it ranks here against north star]
2. [task] — [reason]
...

### Flags
- STALE (30+ days): [task] — still relevant? promote, defer, or remove?
- BLOCKED: [task] — [what's blocking it]
- STRATEGY MISALIGNMENT: [task] — [conflicts with decided constraint or out-of-scope item]

### Backlog candidates to promote
- [entry] (High severity, [N] days old) — promote to active?
- [entry] — still relevant given current stage?

### Backlog candidates to prune
- [entry] (Low severity, 90+ days old) — remove?
```

Before presenting, explain each flag in plain terms the first time it
appears — e.g. "STALE means this hasn't moved in 30+ days, so it's worth
asking if it still matters." Invite questions before asking for confirmation.

Present the recommendation and wait for confirmation. Do not rewrite `TASKS.md` until confirmed.

---

## Step 4 — Apply confirmed changes

After human confirms (or adjusts) the recommendation:
1. Reorder active tasks in `TASKS.md` to match confirmed priority
2. Promote confirmed backlog candidates to active status, remove `[backlog]` tag
3. Remove confirmed prune candidates
4. Add a `## Last prioritized: YYYY-MM-DD` line at the top of `TASKS.md`
5. Update `rituals.md`:

```
## prioritize-tasks
last_run: YYYY-MM-DD
frequency: weekly
notes: [optional — what was promoted, what was pruned, key alignment decisions]
```

---

## Hard rules

- Never reorder or prune without human confirmation
- Severity ordering within a tier (High before Medium before Low) is automatic — strategic ordering requires judgment
- If `STRATEGY.md` doesn't exist, still run — flag that prioritization is based on severity alone and recommend running `/setup-strategy` before next run
- A task that conflicts with a decided constraint is flagged, not auto-removed — the human decides whether the constraint changed or the task should be cut
