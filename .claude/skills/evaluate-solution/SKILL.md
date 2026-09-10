---
name: evaluate-solution
description: Build vs. buy analysis. Evaluates whether a capability should be
  built in-house or solved with a third-party library, service, or API. Produces
  a recommendation with financial cost, operational cost, lock-in risk, build
  cost estimate, and tradeoffs. Use when the user says "should we use X", "is
  there a library for", "what would it cost to use", "build or buy", or when
  /incident routes a third-party finding or capability gap here. Also invoked
  from /spike when feasibility involves a third-party option, and from /feature
  when a new capability could be served by an existing library or service.
  Spawns @solution-evaluator.
---

# /evaluate-solution — Build vs. buy. Research first. Recommend clearly.

This skill produces a recommendation, not a list of options. The agent
does the research — pricing pages, GitHub activity, changelog recency,
known issues, community health — and produces a structured evaluation
with a named recommendation and explicit reasoning. The human decides.

The financial cost is not optional. If a third-party solution has a
cost, that cost appears in the evaluation at current scale and at 10x
scale. An agent that omits pricing is not doing the analysis.

## What this is not

- Not a feature design — output feeds /design contract or /feature, not directly to code
- Not a list of options without a recommendation — agent names the best answer
- Not a quick gut check — the research is real and citable
- Not a one-time tool — re-run when scale changes, pricing changes, or a better
  library emerges

## When to invoke

| Trigger | Context |
|---|---|
| /incident routes third-party finding | Dependency is causing the incident; evaluate replace vs. work around |
| /incident routes capability-gap | No code handles this case; evaluate build vs. library |
| /spike finds a third-party option | Feasibility question involves an external solution |
| /feature touches a new capability | Before /design contract, check if a library already does this |
| Direct invocation | "Should we use X for Y?" or "is there a library that does Z?" |

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
anything the human needs to actually read before deciding — pricing data,
a build-cost estimate, the full Q1–Q7 evaluation document — present it as
prose or a document; a structured question can't hold that much content.

This applies to: the recommendation document (Q1–Q7) as presented under
Autonomy model, and any tie-break question asked when the evaluation is close.

## The evaluation

The agent researches and answers seven questions. All seven are required.
A recommendation without all seven is incomplete.

**Q1 — Does a third-party solution exist that fits?**
Not just "is there a library in this category" — does it specifically
handle the requirement as stated? Check: feature coverage, supported
platforms, TypeScript support if relevant, active maintenance.

**Q2 — What does it cost at current scale?**
Actual numbers from the pricing page, not estimates. Include:
- Free tier limits and what happens when exceeded
- Relevant pricing tier for current usage
- Per-unit costs (per request, per seat, per GB, per event)
- Any costs that compound non-linearly with growth

**Q3 — What does it cost at 10x scale?**
Project the same pricing model at 10x current usage. If 10x triggers
a tier change, model both the transition and the ongoing cost.

**Q4 — What is the operational cost of adopting it?**
- Integration complexity: how much work to wire it in correctly?
- Maintenance burden: upgrade cycle frequency, breaking change history
- Dependency surface: what does this bring in transitively?
- Vendor relationship: do we need a contract, a procurement process, SLA?

**Q5 — What is the lock-in risk?**
- How reversible is this choice? What does migrating away cost in effort?
- Does it own data we'd need to export?
- Is the API proprietary or based on open standards?
- What happens to us if they raise prices, change terms, or shut down?

**Q6 — What does building it ourselves actually cost?**
Not "we could do it" — a realistic estimate:
- Core implementation time
- Edge cases and error handling time
- Testing time
- Ongoing maintenance burden per quarter
- What we'd be giving up by spending this time instead of shipping features

**Q7 — What is the community and longevity health?**
- GitHub: stars trend, last commit date, open issues count and age
- Maintainer activity: are PRs being merged? Issues being responded to?
- Ecosystem: is this the community standard or a niche choice?
- Bus factor: is this one person's project?
- Alternatives: if this library died, what would we migrate to?

## Output — evaluation document

The agent writes `.claude/solution-eval-[slug].md`.

```
# Solution evaluation — [slug]
## Requirement
[One sentence — exactly what capability is being evaluated]
## Context
[Why this evaluation is happening — incident route, feature need, spike finding]
## Third-party option(s) evaluated
[List each option considered — typically 1–3; more is noise]
### [Option name]
**Q1 — Fit**
[Does it actually cover the requirement? What does it handle and what does it not?]
**Q2 — Cost at current scale**
[Exact numbers. Tier name. Per-unit cost. Free tier limit if relevant.]
**Q3 — Cost at 10x scale**
[Projected cost. Tier transition if applicable.]
**Q4 — Operational cost**
[Integration complexity. Maintenance burden. Dependency surface. Vendor overhead.]
**Q5 — Lock-in risk**
[Reversibility. Data ownership. Proprietary vs. open. Shutdown scenario.]
**Q6 — Build cost (alternative)**
[Implementation estimate. Edge case estimate. Maintenance per quarter. Opportunity cost.]
**Q7 — Community health**
[GitHub activity. Maintainer responsiveness. Ecosystem position. Bus factor.]
## Recommendation
[One sentence: build | use [option] | use [option] with conditions]
## Reasoning
[Two to four sentences: which factors drove the recommendation and which
factors were considered but outweighed]
## Conditions or risks
[If recommending third-party: what to watch for, what triggers re-evaluation]
[If recommending build: what scope must be resisted to keep cost bounded]
## Re-evaluation triggers
[Specific events that should cause this decision to be revisited:
	pricing tier change, scale milestone, library going unmaintained, etc.]
## Sources
[Pricing page URL + date checked. GitHub URL. Changelog URL. Any issue threads cited.]
```

## Recommendation format

The recommendation is always a single sentence with a named choice:
- "Use [library] — fit is complete, cost is acceptable, lock-in risk is low."
- "Build — no library covers the specific requirement; build cost is bounded."
- "Use [library] now, plan to replace at [scale milestone] when cost exceeds build."
- "Do not adopt [library] — [specific reason that outweighs fit]."

Never: "Here are the tradeoffs, it depends on your priorities."
That is not a recommendation. That is the research without the analysis.

## Autonomy model

The agent runs the full evaluation and produces the document. If the
recommendation is clear (one option significantly better across multiple
dimensions): agent presents it with full reasoning.

If the evaluation is genuinely close (reasonable case for both):
agent presents both cases, names a lean with reasoning, and asks
one question that would break the tie.

Either way, state the recommendation in plain, teachable language — not
just the Q1–Q7 labels — and invite the human to ask before deciding. That
invitation comes in addition to, not instead of, the tie-break question above.

The human makes the final call in all cases. The agent does not
proceed to /design contract or /feature until the human confirms.

## After the evaluation

The evaluation document travels with the next task that uses it:
- Feeds /design contract as a REFERENCES entry
- Feeds /feature TASK-TEMPLATE as context
- Feeds /spike decision record if invoked from /spike
- Stored in `docs/research/[topic].md` for future reference
  (with 30-day stale signal — pricing and health data ages)

**Spawns:** `@solution-evaluator`
**Output lives in:** `.claude/solution-eval-[slug].md`, then `docs/research/[topic].md`
**Feeds:** /design contract, /feature, /spike decision record

---

## Current limitations — human steps required

Some evaluation steps require human action because the agent can't
access gated content or internal context. The evaluation document
flags these explicitly with a **Human steps required** section.

| Step | Current state | What removes this step |
|---|---|---|
| Pricing behind login or sales call | Agent notes "pricing not publicly listed" as a lock-in signal; human must request a quote | Vendor contact or pricing MCP |
| Internal usage metrics for Q2/Q3 | Human must supply current-scale input; agent can't query production analytics | Analytics MCP or internal metrics access |
| Private GitHub repos or internal libraries | Agent evaluates public options only; human must assess internal alternatives | Internal repo access |
| Vendor SLA or contract terms | Agent notes "SLA not publicly documented"; human must review actual terms | N/A — always human |

**When supplying human steps:** paste the missing data directly into
the conversation. The agent re-runs the affected questions with the
real data before finalizing the recommendation. A recommendation
produced without Q2/Q3 cost data is marked **INCOMPLETE** and must
not be used to make a decision.