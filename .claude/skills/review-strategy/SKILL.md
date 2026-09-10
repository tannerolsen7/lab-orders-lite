---
name: review-strategy
description: |
  Orchestrates three adversarial reviewers against STRATEGY.md — PM lens,
  CTO lens, and Challenger lens — running in parallel as isolated sub-agents.
  Isolation is required: a PM lens that has already read the CTO critique
  softens its own findings. Use when the user says "review our strategy",
  "is this approach sound", "stress-test this plan", "is our direction right",
  "challenge our strategy", or invokes /review-strategy. Also run after
  /setup-strategy, when strategy shifts, or when /scan-context flags
  STRATEGY.md as stale.
---

## Prerequisites

- `STRATEGY.md` exists at repo root
- If not: stop — "STRATEGY.md not found. Run `/setup-strategy` first."

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

**Choosing how to ask.** For a small set of discrete choices — revise now vs.
later, pick which flagged finding to act on first — use `AskUserQuestion`; it
renders as clickable options and already has a built-in escape hatch (the
human can always answer "Other" with free text instead of picking a preset).
For anything the human needs to actually read before deciding — the three
lens reports, the consolidated summary — present it as prose or a document; a
structured question can't hold that much content.

This applies to: the Consolidated summary (Step 3), where the human decides
whether to revise STRATEGY.md.

---

## Step 1 — Read context files (orchestrator only)

Read these before spawning lens agents. Pass content directly — do not ask agents to re-read.

- `STRATEGY.md`
- `CLAUDE.md`
- `AGENTS.md`
- `CONTEXT.md`

---

## Step 2 — Spawn three lens agents IN PARALLEL

Single message, three agent tool calls. Each lens receives only the file contents — no prior lens output. Contamination between lenses degrades findings.

Spawn these three simultaneously:
- `@strategy-lens-pm` — PM lens
- `@strategy-lens-cto` — CTO lens
- `@strategy-lens-challenger` — Challenger lens

Pass to each agent:
- Content of `STRATEGY.md`, `CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`

---

## Step 3 — Consolidated summary

Collect all three lens reports. Produce:

```
## Strategy Review — Summary

**MUST REVISIT total:** [N] items across [N] sections
**Most flagged section:** [section name] — flagged by [reviewer names]
**Clean sections:** [list]

**Recommended action:**
[Revise now — MUST REVISIT items make STRATEGY.md unsafe for agents to act on]
[OR: Note and monitor — CONSIDER items only, strategy is actionable as-is]

**If revising:** focus on [most flagged section] first.
Run `/setup-strategy` in update mode, or edit directly and update `last-reviewed`.
```

Before showing this to the human, define the labels in plain terms the first
time each appears — e.g. "MUST REVISIT: if we act on the strategy as written,
we could make the wrong call here. CONSIDER: worth a look, not blocking."
Close with an invitation to ask about any finding before deciding whether to revise.

---

## Hard rules

- All three lenses spawn every time — no skipping based on apparent quality
- MUST REVISIT means the strategy is unclear or contradicted enough that an agent acting on it would make wrong decisions
- CONSIDER means worth thinking about but not a blocker — don't inflate to MUST REVISIT
- Do not rewrite `STRATEGY.md` — surface findings only. The human decides what to change.
