---
name: linear-triage
description: |
  Turns a rough, ad hoc ask (typed inline or pulled from the current chat —
  the case where Tanner is working from VS Code with no Linear ticket yet)
  into a single, implementation-ready Linear ticket. Use when the user invokes
  /linear-triage, or says something like "turn this into a ticket", "file this
  properly before we build it", or describes a task with no existing FLO-N
  reference and no immediate intent to start coding this turn. Interviews
  through /design contract's four questions every time, then runs a real
  /grill-with-docs pass, then creates the ticket and stops — it does not size,
  implement, or hand off to /feature on its own.
---

# /linear-triage

Turns "I have an idea, no ticket yet" into one well-shaped, implementation-ready
Linear ticket — fast enough to use before every ad hoc ask, thorough enough that
`/feature` can skip re-deriving the interface and constraints later.

This is the **Linear-only** v1 entry point for FLO-18's broader ticket-routing
question: every task still gets a ticket before code is written, but this skill
makes writing that ticket from a rough idea fast instead of a manual write-up.

## When to use

- The user describes something to build with no existing `FLO-N` reference.
- The user explicitly invokes `/linear-triage`.
- The user is chatting ad hoc (e.g. from VS Code) and hasn't said "let's build
  this now" — they want it captured properly first.

**Not for this:** resuming or sizing an *existing* ticket. That's `/feature`'s
own Step -1 and Step 0. This skill only ever creates brand-new tickets.

---

## Presenting decisions to the human

Same rule as every other skill in this pipeline: full context before asking,
plain 8th/9th-grade words (say the effect before naming the mechanism), and
leave the door open to ask before deciding. See `/design contract`'s own
section of the same name for the reasoning. Use `AskUserQuestion` for the
four-question interview below — each with a recommended answer — since these
are discrete choices with a natural default.

---

## Step 1 — Capture the rough ask

Take the ask as given — inline skill argument, or whatever the user just
described in the current conversation. Do not expand or reinterpret it yet;
that happens in the interview.

## Step 2 — Interview: the four design-contract questions

Ask through all four of `/design contract`'s questions, **every time** — not
only when something looks ambiguous. That's the whole point of pulling these
in: an implementing agent gets a real contract later, not prose it has to
guess around. Translate each into a plain question about what the user would
experience, exactly as `/design contract` itself instructs — never read the
category names verbatim at the human.

1. **Business need** — user problem, what breaks for Monica if it's missing,
   minimum useful version. Its answer folds into the ticket's "What to build"
   section rather than getting its own header — it's context for that section,
   not a separate contract line.
2. **Interface** — what triggers this, what shape the input/output is, what
   happens on missing or malformed input, who consumes the result.
3. **Constraints** — what this must never break, and any auth/security/tenant-
   scoping boundary it touches.
4. **State ownership** — does this own state, what triggers a change, who can
   read it. Only becomes its own ticket section if the answer is "yes, it owns
   state" — a stateless ask skips this section entirely rather than writing
   "N/A."

Provide a recommended answer for each question, same convention as
`/design contract`. Wait for confirmation before moving to Step 3.

## Step 3 — Grill pass (`/grill-with-docs`)

Once the draft answers exist, invoke the actual `/grill-with-docs` skill
against them — not a lighter reimplementation. Pass it the rough ask plus the
Step 2 answers. It will:

- Challenge vague terms against `CONTEXT.md`'s glossary
- Cross-check claims against the real code
- Update `CONTEXT.md` inline when a term resolves
- Offer an ADR if a decision found here is genuinely hard to reverse

Fold whatever it finds back into the draft before writing the ticket. This can
touch `CONTEXT.md` / `docs/adr/` before the ticket exists — that's expected
(Tanner confirmed this is fine given a ticket is always the end result).

## Step 4 — Assemble the ticket body

Fixed template — only include a section if it has real content:

```
## What to build
[The ask, with the business-need answer folded in: user problem, why it
matters, minimum useful version if that's smaller than the ask as stated.]

## Interface
[Trigger, input/output shape, error handling, consumer — from Step 2.]

## Constraints
[What this must never break; auth/security/tenant boundaries — from Step 2.]

## State
[Only if Step 2 established this owns state — what triggers a change, who
reads it. Omit this section entirely otherwise.]

## Done looks like
- [Specific, checkable output]

## Out of scope
- [Explicitly excluded thing and why]

## Design contract status
Completed via /linear-triage on [today's date] — the Interface, Constraints,
and State sections above were produced through /design contract's question set
and grilled with /grill-with-docs. /feature can skip its own Design step for
this ticket (see /feature's skip check).
```

The **"Design contract status"** section is the machine-checkable marker
`/feature` looks for — don't drop it, and don't reuse this exact heading for
anything else.

## Step 5 — Create the ticket

Team `Floral-software`, project `event-vendor` (same defaults as everything
else in this repo). Status **Backlog**. No labels, no priority, no assignee —
this skill never assigns the bot account or kicks off the pickup pipeline.

## Step 6 — Report and stop

Report the ticket link back to the user in one or two sentences. **Stop
here.** Do not size it, do not run `/feature` or `/queue`, do not set
priority or labels. What happens to the ticket next is a separate decision
the human makes each time.

---

## Done criteria

- Ticket created in Linear with the fixed template above, "Design contract
  status" section present and dated
- `/grill-with-docs` actually ran (not a paraphrased summary of what it would
  find) and its findings are folded into the ticket
- Any `CONTEXT.md` / `docs/adr/` updates from the grill pass are committed
- Ticket link reported back; no further action taken
