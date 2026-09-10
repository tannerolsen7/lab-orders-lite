---
name: setup-strategy
description: |
  Interviews the user to produce STRATEGY.md for a project. Reads existing
  codebase context to infer answers before asking questions. Outputs a filled
  STRATEGY.md at repo root and wires it into the session-start orient step.
  Use when the user says "set up our strategy", "define our direction",
  "let's think through our approach", "create a strategy doc", "what's our
  north star", or invokes /setup-strategy. Run once per project at setup, or
  when strategy shifts significantly. Follow with /review-strategy to
  stress-test the output.
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

**Choosing how to ask.** For a small set of discrete choices — confirm vs.
revise a tier's draft — use `AskUserQuestion`; it renders as clickable
options and already has a built-in escape hatch (the human can always answer
"Other" with free text instead of picking a preset). For anything the human
needs to actually read before deciding — the draft STRATEGY.md, the gap
list — present it as prose or a document; a structured question can't hold
that much content.

This skill already does #1 and #2 well — the draft STRATEGY.md and gap list
are already full-context, user-facing prose. The gap is narrower: none of the
three confirmation prompts (Step 2 Tier 1, Tier 2, Tier 3) close with an
invitation to ask before deciding. This applies to all three.

---

## Step 1 — Detect tier

Before asking anything, determine what context is available.

**Check in order:**
1. Does `CONTEXT.md` exist? If yes — **Tier 1**. Read it plus `AGENTS.md`, `CLAUDE.md`, any feature list or data model files.
2. No codebase — is there a URL in `CLAUDE.md`, `README.md`, or any project file? If yes — **Tier 2**. Web-fetch the landing page and any linked socials or App Store listing.
3. Neither — **Tier 3**. Structured interview mode.

---

## Step 2 — Tier 1: Infer from codebase

Read: `CONTEXT.md`, `AGENTS.md`, `CLAUDE.md`, `docs/TESTING.md` (if present), any `docs/specs/` files, data model definitions.

From these, infer:
- **Primary user** — who the data models and features are built for
- **Core problem** — what the product does at its simplest
- **Current stage** — what's built and tested vs. what's speculative
- **Decided constraints** — architectural decisions, explicit exclusions in AGENTS.md, NEVER rules
- **Out of scope** — things mentioned as excluded in specs or context docs

Produce a draft `STRATEGY.md` from inference. Then present it to the user with:

```
## Draft STRATEGY.md — inferred from codebase

[full draft]

---

## Gaps I couldn't infer — your input needed

1. [Specific gap with forced-choice options where possible]
2. [Specific gap]
...

Confirm what's right, correct what's wrong, answer the gaps.
I'll rewrite and write the file.

Ask me to explain any part of this before you decide.
```

Do not ask open-ended questions. For each gap, provide options where possible:
- "Primary user when organizer and vendor conflict: [optimize for organizer] [optimize for vendor] [depends on the feature — which?]"
- "North star in 12 months: I couldn't infer a measurable outcome — what does winning look like specifically?"

---

## Step 2 — Tier 2: Infer from public presence

Web-fetch: landing page URL, any linked social profiles, App Store or Play Store listing if present.

From these, infer positioning, target user, and product promise. Produce a draft with the same gap-flagging format as Tier 1 — including the closing invitation to ask before deciding. More gaps will exist — use forced-choice questions for all of them.

---

## Step 2 — Tier 3: Structured interview

No inference available. Ask one question at a time. Do not present the next question until the current one is answered.

Questions in order — forced-choice where possible:
1. **Primary user:** Who do you optimize for when their needs conflict?
   [Organizer / Event host] [Vendor / Service provider] [Both equally] [Depends — specify]
2. **Core problem:** Complete this sentence: "Without this product, [primary user] has to ___."
3. **Stage:** Where are you right now?
   [Pre-launch — building toward v1] [MVP live — finding PMF] [Post-launch — scaling what works] [Pivoting — changing direction]
4. **Validated vs. bet:** What's one thing you know is true about your users from evidence, and one thing you're betting on but haven't proven?
5. **Decided constraints:** What's one thing about this product that's not up for debate — a decision you've made that you'd defend even under pressure?
6. **North star:** What does winning look like in 12 months — specific enough that you could evaluate whether a feature moves toward it or away from it?
7. **Out of scope:** What's the most tempting adjacent thing this product will NOT do, and why?

After all answers, produce the draft and ask for confirmation before writing. Close the
ask with an invitation to question any part of the draft before confirming.

---

## Step 3 — Write the file

After user confirms the draft:
1. Write `STRATEGY.md` to repo root using the template format (see `STRATEGY.md`)
2. Add `context-meta` block with `review-frequency: monthly` and today's date as `last-reviewed`
3. Check if `CLAUDE.md` session-start block already includes a `STRATEGY.md` read instruction. If not, add:
   > At session start, read `STRATEGY.md` before any planning or design work.
4. Report: "STRATEGY.md written. Run `/review-strategy` to stress-test it before agents act on it."

---

## Hard rules

- Never write `STRATEGY.md` without user confirmation of the draft
- Never ask open-ended questions when forced-choice options are possible
- For Tier 1: infer first, ask second — don't ask what you can read
- The file is a grounding document for agents, not a business plan — keep it under 400 words
- If the user's answer to any question is too vague for an agent to act on, push back once: "Is that specific enough for an agent to evaluate a feature against it?"
