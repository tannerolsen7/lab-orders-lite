---
name: post-mortem
description: Investigates a hotfix after it ships to find what allowed the bug
  to exist and what would have caught it. Run against a specific hotfix slug.
  Produces PITFALLS.md and memory.md candidates. Use when the user says
  "run post-mortem", "investigate the hotfix", or invokes /post-mortem.
  Also run when a [hotfix-postmortem] task is promoted to active in TASKS.md.
  Do not use during the hotfix itself — this runs after merge.
---

# /post-mortem — Find what allowed this. Make it impossible to repeat.

The hotfix fixed the symptom. The post-mortem fixes the system. Without
it, the same class of bug recurs under a different name. The output is
always two candidates: a PITFALLS.md entry (what to avoid) and a
memory.md entry (what to remember going forward).

## What this is not

- Not a blame exercise — the output is structural, not personal
- Not a lengthy investigation — the cause is already known from the hotfix
- Not optional — the [hotfix-postmortem] task in TASKS.md blocks until this runs
- Not a rewrite — output is candidates, not automatic writes

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
anything the human needs to actually read before deciding — the PITFALLS.md
candidate, the memory.md candidate, the root-condition reasoning behind
them — present it as prose or a document; a structured question can't hold
that much content.

This applies to: the Review and write step, where the human approves, edits,
or rejects the PITFALLS.md and memory.md candidates.

---

## Entry

Run with the hotfix slug:
```
/post-mortem [slug]
```

The skill reads:
1. `TASKS.md` — the `[hotfix-postmortem]` entry for this slug (symptom, cause)
2. `git diff main hotfix/[slug]` — what changed
3. `PITFALLS.md` — existing traps (to avoid duplication)
4. `memory.md` — existing memory entries (to avoid duplication)

If the hotfix branch is already deleted: read the merged commit directly.

---

## The three questions

Answer all three in writing before producing candidates.

**Q1 — What allowed this?**
Not "what caused the bug" — that's already in the hotfix task.
This is: what structural condition made the bug possible? Missing
validation layer? Untested edge case in a shared utility? An assumption
about caller behavior that wasn't enforced?

Examples:
- "The function assumed `userId` was always defined, but callers from
  the webhook path skip auth middleware and pass undefined."
- "The migration script ran without a dry-run gate — no mechanism
  existed to preview the change before it executed."

**Q2 — What test would have caught it?**
Not the test that was added in the hotfix (that's a regression guard).
This is: what test, if it had existed *before* the bug was introduced,
would have prevented it from shipping? Name the specific behavior it
would have asserted and where it would have lived.

Examples:
- "A unit test on the payment utility for undefined userId input."
- "A dry-run integration test in the migration suite that asserts
  no rows are deleted when DRY_RUN=true."

**Q3 — What pattern needs to change?**
Based on Q1 and Q2, what rule, convention, or structural change would
prevent this class of bug across all future work — not just this file?
This is the candidate for PITFALLS.md and memory.md.

Examples:
- "All functions receiving userId from webhook paths must validate
  before use — never assume upstream middleware ran."
- "Migration scripts must have a DRY_RUN mode tested in CI before
  they are eligible to merge."

---

## Output — two candidates

### PITFALLS.md candidate

```
## [Short title — the trap]
**What happened:** [One sentence — the hotfix slug and symptom]
**Root condition:** [Answer to Q1 — what structural condition allowed it]
**The rule:** [Answer to Q3 — what must always be true going forward]
**Test that would have caught it:** [Answer to Q2]
**First seen:** [YYYY-MM-DD] in hotfix/[slug]
```

### memory.md candidate

```
- rule: [One-sentence rule derived from Q3]
	source: hotfix/[slug] post-mortem
	last_seen: [YYYY-MM-DD]
```

---

## Review and write

1. Present both candidates to the human — state each one's plain-English
   effect (what changes going forward) before the technical template (root
   condition, structural rule), and invite questions before they decide.
2. Human approves, edits, or rejects each independently
3. On approval: write to `PITFALLS.md` and `memory.md`
4. On sentinel projects: `@doc-updater` writes them — same review step required
5. Update the `[hotfix-postmortem]` entry in `TASKS.md` to `[x]` (complete)

Nothing is written automatically. The review step is required.

---

## Done criteria

- Three questions answered in writing
- PITFALLS.md candidate produced
- memory.md candidate produced
- Human reviewed and approved/rejected each
- Approved candidates written to their files
- `[hotfix-postmortem]` task in TASKS.md marked `[x]`

**Feeds:** `PITFALLS.md`, `memory.md`
**Triggered by:** `[hotfix-postmortem]` task in TASKS.md after hotfix merges
**@doc-updater** handles writes on sentinel projects