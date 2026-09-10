---
name: spike
description: Answers a question before committing to design or implementation.
  Use when the cause, approach, or feasibility of something is unknown and
  a decision is needed first. Use when the user says "can we use X for Y",
  "is this approach viable", "I'm not sure if", "should we", "what's the
  best way to", "research X", or invokes /spike. Do not use when the
  question is already answered and the work is known — go to /feature or
  /design contract instead. Spawns an orchestrator agent that runs the
  full spike pipeline autonomously.
---

# /spike — Answer the question before building the answer

A spike produces a decision, not a feature. The output is always
actionable: a recommendation with confidence, cited evidence, a
verification report, a user impact assessment, and a TDD slice
that confirms or kills the recommendation. All findings are filed
so future agents don't repeat the same investigation.

## What this is not

- Not a prototype (delete throwaway code — `/prototype-interface` owns that)
- Not a design (the decision feeds `/design contract`)
- Not a feature (/feature owns implementation)
- Not background research — if you're building knowledge without a specific build decision to gate, use `/deep-research` instead. Spike is for questions where the answer determines what you build next.

## Anti-rationalization

| Rationalization | Rebuttal |
|---|---|
| "I already know the answer" | Then write the decision record and the TDD slice. If you can't, you don't know it. |
| "This is too small for a spike" | If the answer is obvious, the orchestrator will say so in 5 minutes. Run it. |
| "We don't have time for research" | You don't have time to build the wrong thing. |
| "The spike is taking too long" | The question is too broad. The orchestrator will split it. |

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
anything the human needs to actually read before deciding — the research
dossier, cited sources, a full Decision Summary — present it as prose or a
document; a structured question can't hold that much content.

This applies to the question-confirmation gate (Entry) and, above all, the
Decision Summary — the primary artifact the human reads to decide whether
to hand off to `/feature`, `/prototype-interface`, or a split spike.

---

## Entry

State your question in one sentence. The question must name:
- What you're evaluating
- What decision it informs
- What "good enough" looks like

Examples:
- "Can our realtime provider handle 500 concurrent subscribers per channel without degradation, to decide if we build live availability on it?"
- "Is the data-fetching library's optimistic-update pattern compatible with our access-policy setup, to decide if we use it for the write flow?"

If you can't write the question in one sentence, the orchestrator will
help you sharpen it before anything runs. When it proposes a sharpened
version, it must say in plain terms why it changed the wording and invite
you to correct it before research starts — that's the "Confirm question
with human" gate below.

---

## The pipeline

This skill spawns `@spike-orchestrator`. It owns everything from here.
You interact with the orchestrator, not the specialist agents directly.

```
Orchestrator sharpens question
	↓
Confirm question with human (one gate — required)
	↓
Orchestrator decides research depth (1 or 3 passes)
	↓
Research agents run (parallel within each pass)
	↓
Synthesis agent writes dossier
	↓
Synthesis reflect pass (3 structured questions)
	↓
Adversarial verifier runs against post-reflect output
	↓
User verifier runs against post-reflect output
	↓
Slice agent writes TDD test (one retry with context)
	↓
Orchestrator assembles final output
	↓
Orchestrator files findings
```

---

## Research depth — orchestrator decides

**Single pass** — narrow, well-documented question. One source cluster
is sufficient to answer it. Examples: does library X support feature Y,
what is the rate limit on API Z.

**Three passes** — broad architectural or feasibility question where
the answer meaningfully changes based on depth. Each pass is informed
by the prior:
- Pass 1 — Understanding: what is this, how does it work, raw sources
- Pass 2 — Deeper understanding: what do the Pass 1 sources actually
  mean — contradictions, hidden limitations, what Pass 1 raised
- Pass 3 — Application: given this specific system and codebase, what
  does this mean — which patterns apply, which don't, what changes

The orchestrator states its depth decision and reason before spawning
research agents. If you disagree, say so.

---

## Confidence tiers

| Tier | Meaning | Next step |
|---|---|---|
| **Settled** | Multiple independent sources converge, no credible dissent, slice test passes | Hand TASK-TEMPLATE.md to `/feature` |
| **Leaning** | Evidence favors one direction, meaningful uncertainty remains | Proceed if slice test passes; note uncertainty in contract |
| **Open** | Evidence genuinely mixed; decision needs more context | Orchestrator proposes `/prototype-interface` or split spike |
| **Blocked** | Question cannot be answered without production data or a running system | Orchestrator proposes `/prototype-interface`; no decision doc produced |

---

## Output

### Decision Summary (read this first)
```
Question: [sharpened one-sentence question]
Recommendation: [one sentence]
Confidence: [Settled | Leaning | Open | Blocked]
Date: [YYYY-MM-DD]
## Engineering lens
[What this means for the people building and maintaining it.
	Cited sources inline.]
[Verifier challenge if any]
## Operations lens
[What this means for reliability, cost, and failure behavior.
	Cited sources inline.]
[Verifier challenge if any]
## User lens
[What this costs the end user if the recommendation is wrong.
	What failure they feel, not what the system logs.]
[User verifier challenge if any]
## Finance / scale lens
[What this looks like at 10× current load or budget.]
[Verifier challenge if any]
## Dissent
[The strongest credible argument against the recommendation.
	Why it was not adopted.]
## Sources
[Full citation list — title, author/org, URL, date]
```

Render each lens in plain language — what it means for the people
building it, running it, using it, and paying for it, not just the cited
finding — and close the summary with an invite to ask for more detail
before the human acts on the confidence tier.

### Research Dossier (full evidence trail)
```
### Pass 1 — Understanding
[Raw source summaries, citations, what each source says]
### Pass 2 — Deeper Understanding
[What Pass 1 actually means — contradictions found, gaps,
	questions Pass 1 raised that Pass 2 investigated]
(omitted for single-pass spikes)
### Pass 3 — Application to This System
[Given this codebase and architecture, what applies and what doesn't]
(omitted for single-pass spikes)
### Synthesis Reflect
What I assumed while writing that the research didn't confirm:
[answer]
Contradictions I smoothed over:
[answer]
What would most change this recommendation if I'm wrong:
[answer]
### Adversarial Verifier Report
[What the research assumed, what wasn't checked, what would
	invalidate the recommendation]
### User Verifier Report
[End-user cost if the recommendation is wrong. Failure the
	user feels, not the system logs.]
```

### TDD Slice
```
Assumption tested: [the single riskiest assumption in the recommendation]
Test: [file:line — what it asserts, what passing means, what failing means]
Result: [Passes | Fails | Blocked]
If Passes:
	→ Tracer bullet for /feature
	→ See filled TASK-TEMPLATE.md below
If Fails:
	→ Recommendation narrowed or invalidated
	→ Confidence drops one tier
	→ Failing test handed to /debug
	→ Revised question: [one sentence]
If Blocked:
	→ Question cannot be validated with a slice
	→ Proposed next step: /prototype-interface
	→ Blocking reason: [what production data or running system is needed]
```

### Filed Findings
```
docs/research/[topic].md — updated
PITFALLS.md candidate — [new entry proposed | none]
TESTING.md — [tracer bullet added | none]
TASK-TEMPLATE.md — [filled and ready | none]
```

---

## Done criteria

- Question sharpened and confirmed by human before research ran
- Research depth decided and stated by orchestrator
- Synthesis reflect pass completed (3 questions answered)
- Adversarial verifier ran against post-reflect output
- User verifier ran against post-reflect output
- TDD slice written, run, result recorded
- Confidence tier assigned
- Decision summary complete with citations
- `docs/research/[topic].md` updated
- `PITFALLS.md` candidate proposed if assumption failed
- Next step is unambiguous

---
**Spawns:** `@spike-orchestrator`
**Full agent:** Templates → agents/spike-orchestrator.md
**Output lives in:** `docs/research/[topic].md`
**Feeds:** `/feature` (if Settled/Leaning + slice passes), `/debug` (if slice fails), `/prototype-interface` (if Open/Blocked)