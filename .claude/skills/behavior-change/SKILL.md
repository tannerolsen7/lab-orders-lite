---
name: behavior-change
description: Intentionally changing what the system does in an existing situation —
  not fixing a bug, not refactoring internals, not adding a new capability. Use when
  the requirement is "the system currently does X, it should now do Y" and X was
  correct behavior at the time. Use when the user says "change how this works",
  "the behavior needs to change", "update the logic so that", "we want this to
  behave differently". Do not use for new capabilities (/feature), internal
  restructuring (/refactor), or defect correction (/hotfix).
---

# /behavior-change — Change what the system does. Don't break what depends on it.

A behavior change is not a feature and it is not a bug fix. It is a deliberate
redefinition of what correct means for an existing code path. That distinction
matters because existing callers were written assuming the old behavior was
correct — and some of them were right to assume that.

The risk profile is different from /feature in three specific ways:

1. **Existing tests may now assert the wrong thing.** They pass but verify
   old behavior. A green test suite after a behavior change is not a safe
   signal — it might mean the old tests were never updated.

2. **Callers had intent, not just existence.** You can find callsites. You
   cannot grep for what they assumed. Every caller must be read, not just
   located.

3. **External systems are invisible.** Webhooks, event consumers, and API
   clients don't appear in the codebase. They break silently after deploy.

This skill runs a mandatory pre-phase before any implementation. The pre-phase
is not optional based on implementation size — a "Tiny" behavior change still
has callers, still has existing tests, still needs a rollback plan.

## What this is not

- Not a bug fix — if X was always supposed to be Y and there was a defect,
  route to /debug → /hotfix. The spec did not change; the code did not match it.
- Not a refactor — if the observable behavior stays identical and only
  internal structure changes, route to /refactor. Two hats: structure and
  behavior never change together.
- Not a feature — if the situation S did not previously exist and you are
  adding handling for it, route to /feature. No callers depend on old behavior
  because old behavior didn't exist.
- Not always clear-cut — if you're unsure which this is, run the entry
  gate below before proceeding. The gate exists to flush out misclassification.

## Anti-rationalization

| Rationalization | Rebuttal |
|---|---|
| "The test failures are expected — the behavior changed" | Expected test failures still need to be classified. Delete the wrong ones, update the valid ones, surface the gaps. Don't just delete all red tests. |
| "I know all the callers — they're all internal" | Knowing they're internal doesn't mean you know their intent. Read each caller. |
| "The external API hasn't changed, just the behavior" | External consumers depend on observable behavior, not the API surface. If the output changes, they break. |
| "I'll update the docs after it ships" | Docs updated after ship never match the behavior. Update before /cr. |
| "Rollback is easy — just revert the commit" | If users acted on the new behavior, reverting puts the system in an inconsistent state. Think about this before writing a line of code. |
| "This is basically a feature, I'll just use /feature" | /feature assumes no existing callers. If callers exist, the caller impact analysis and test inversion are not optional. |

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
anything the human needs to actually read before deciding — a caller-impact
summary, a test inversion list, a rollback plan — present it as prose or a
document; a structured question can't hold that much content.

This applies to Phase 1 (the caller-impact summary), Phase 2 (surfacing
external exposure), Phase 3 (the test inversion list, before any test is
deleted or changed), and Phase 4 (the rollback plan's state-safe /
state-unsafe verdict).

---

## Entry gate — classify before proceeding

Answer all four questions before running any phase. If you cannot answer
confidently, surface the uncertainty as a BLOCKING question to `questions.md`.

```
## Behavior change classification — [slug]
1. What is the current behavior?
	[one sentence — specific, observable]
2. What is the new behavior?
	[one sentence — specific, observable]
3. Was the current behavior intentionally correct, or was it a defect?
	[ ] Intentionally correct — proceed with /behavior-change
	[ ] Defect (code never matched spec) → STOP: route to /debug → /hotfix
	[ ] Uncertain → surface as BLOCKING before proceeding
4. Does the implementation require changing the public interface (inputs,
	outputs, types) or only the internal logic?
	[ ] Internal logic only — proceed
	[ ] Interface changes required → run /design contract before Phase 1
```

If Q3 is "defect": stop here. The wrong skill is running. Route correctly.
If Q4 is "interface changes": stop here. Run /design contract. The new
contract is the input to Phase 1.

---

## The loop

```
Entry gate (classify — not a bug, not a refactor)
	↓
[if interface changes] /design contract first
	↓
Phase 1 — Caller impact analysis
	↓
Phase 2 — External caller check
	↓
Phase 3 — Test inversion analysis
	↓
Phase 4 — Rollback plan
	↓
Phase 5 — Implementation
	(uses /tdd with behavior-change-specific test writing rules)
		↓
Phase 6 — Doc sync (required before /cr)
	↓
/cr → merge
```

---

## Phase 1 — Caller impact analysis

Spawn `@explorer` with the function, method, or module being changed.
Find every internal callsite.

For each callsite, the agent must document:

```
## Caller impact — [slug]
Callsite: [file:line]
	What it calls: [function/method name]
	What it assumes about current behavior:
		[read the callsite code — what does it do with the result or side effect?]
	Impact of behavior change:
		[ ] Not affected — this callsite's assumptions still hold under new behavior
		[ ] Affected — [specific: what breaks or changes]
		[ ] Uncertain — [what is unclear; surface as BLOCKING if it blocks correct behavior]
	Action required:
		[ ] None
		[ ] Update callsite
		[ ] Update test at this callsite
		[ ] Investigate further
```

Complete this document for every internal callsite before Phase 2.
If the callsite count exceeds 10, surface a summary to the human:
"[N] callsites found. [N affected, N uncertain]. Review before Phase 2?"
Translate before you show it — a "callsite" is just "a place in the code
that calls this." For each affected one, say in plain words what would
actually break, and invite the human to ask about any entry before you
move on.

**The signal the analysis is done:** every callsite has a verdict and an
action. No callsite has a blank impact field.

---

## Phase 2 — External caller check

Ask explicitly — do not skip because the answer seems obvious.

```
## External caller check — [slug]
1. Does this behavior surface in any API response?
	[ ] Yes — [which endpoint, what changes in the response]
	[ ] No
2. Does this behavior trigger any webhooks or emit any events?
	[ ] Yes — [which webhook/event, what changes in the payload]
	[ ] No
3. Does this behavior affect any data consumed by external systems,
	analytics pipelines, or third-party integrations?
	[ ] Yes — [describe]
	[ ] No
4. Are there any documented API consumers or integrations that depend
	on this behavior? (Check CONTEXT.md, AGENTS.md, docs/)
	[ ] Yes — [list them]
	[ ] No
External exposure verdict:
	[ ] None — behavior change is fully internal
	[ ] Exists — coordination required before deploy
```

If any external exposure exists: surface to human before Phase 3. State
what's exposed and why it matters in plain words before naming the
mechanism (webhook, endpoint, payload) — e.g. "the invoice email a client
gets will show a different total" rather than "the webhook payload
changes" — and invite the human to ask about it before you plan
coordination. External coordination (communication, versioning,
deprecation period) must be planned before implementation. Do not build
the change and figure out communication later — that is the ordering that
causes incidents.

---

## Phase 3 — Test inversion analysis

This is the phase that doesn't exist in any other skill.

Find every test that exercises the behavior being changed. For each test,
classify it into one of three categories:

```
## Test inversion — [slug]
Test: [file:line or test name]
	Currently asserts: [what behavior the test verifies]
	Under new behavior, this test:
		[ ] OUTDATED — asserts old behavior that is now wrong. Action: delete or replace.
			Reason: [why this assertion no longer represents correct behavior]
		[ ] VALID — still asserts something that must be true under new behavior.
			Action: update the assertion to match new expected output.
			What changes: [specifically what the assert value becomes]
		[ ] COVERAGE GAP — this test verified a case that the new behavior
			intentionally does NOT cover. The case is not gone — it needs new handling.
			Action: new test required.
			What case: [describe the scenario now missing coverage]
		[ ] UNAFFECTED — this test exercises the code path but its assertion
			is not sensitive to this specific change.
			Action: none.
```

Produce the complete classified list. Before showing it to the human,
translate each verdict into one plain sentence — what OUTDATED, VALID, or
COVERAGE GAP actually means for that specific test (e.g. "this test checks
something that's no longer true, so it gets deleted" or "this test still
matters but the expected answer changes"). Surface the translated list to
the human before any code is written, and invite them to ask about any
entry before they sign off on deleting or changing a test.

**The rule:** Do not delete a test without classifying it first. A deleted
test with no replacement and no documented reason is coverage debt that
won't be noticed until production.

**If the test suite has no tests covering this behavior:** that is itself
a finding. Surface it explicitly:
"No existing tests cover this behavior. The test for the old behavior was
never written. Proceeding means the change has no regression safety net.
Write characterization tests for the old behavior first, classify them,
then proceed."

---

## Phase 4 — Rollback plan

Answer before any code is written.

```
## Rollback plan — [slug]
1. Is this change state-safe to revert?
	A revert is state-safe when no user action taken under the new behavior
	would leave the system inconsistent if behavior reverts to old.
	[ ] Yes — a git revert restores correct behavior cleanly
	[ ] No — [describe what state would be inconsistent after revert]
		Required: a migration or compensation plan before deploy
	[ ] Depends on timing — [describe the window; what makes it state-unsafe]
2. If a rollback is required within 24h of deploy, what is the procedure?
	[one paragraph — specific steps, not "revert the commit"]
3. Does the deploy require a feature flag or phased rollout?
	[ ] No — atomic switch is safe
	[ ] Yes — [describe the flag strategy or rollout plan]
```

If the verdict is state-unsafe or depends-on-timing, surface it to the
human in plain words before any code is written — describe what could go
wrong in a sentence a colleague could picture (e.g. "if we undo this after
someone's already booked at the new price, some bookings won't match
either price") — and invite them to ask about it before accepting the
rollback plan.

If state-unsafe and no migration plan exists: write BLOCKING to
`questions.md`. Do not proceed. The implementation that ships without
a rollback plan is a ticking incident.

---

## Phase 5 — Implementation

Only begins after all four pre-phases are complete and any BLOCKING
questions are answered.

```
git checkout -b behavior-change/[slug]
	↓
[Execute test inversion plan from Phase 3]
	— Delete OUTDATED tests (with reason in commit message)
	— Note VALID and COVERAGE GAP tests — do not touch yet
		↓
Write new failing test for new behavior
	— Must fail against current code
	— Must reflect what Phase 3 said about new expected behavior
		↓
Confirm red for the right reason
	↓
Write minimum implementation
	↓
Update VALID tests — adjust assertions to new expected output
Write COVERAGE GAP tests — new tests for cases now needing new coverage
	↓
Confirm green
	↓
npx tsc --noEmit
	↓
Update caller sites identified in Phase 1 as "Affected"
	↓
Run full test suite — confirm nothing regressed
```

**The TDD sequence for behavior change differs from /feature in one way:**
the test inversion executes before the new test is written. You are not
writing into a clean slate — you are reshaping existing coverage. The
order is:
1. Dispose of outdated coverage cleanly (with documented reason)
2. Write the new assertion
3. Implement
4. Restore valid coverage with updated assertions
5. Fill coverage gaps

**The "no surprise regressions" bar:** after Phase 5 completes, the test
suite should cover the new behavior at least as well as it covered the
old behavior. If Phase 3 found gaps, those gaps must be closed before
/cr. A behavior change that reduces net test coverage is not
shippable.

---

## Phase 6 — Doc sync (required before /cr)

Every context file that described the old behavior must be updated.
This is not optional and is not a /cr finding — it gates /cr.

```
## Doc sync checklist — [slug]
[ ] TESTING.md — old behavior entries updated or removed; new behavior added
[ ] CONTEXT.md — any domain description referencing old behavior updated
[ ] AGENTS.md — any architecture notes, open decisions, or patterns updated
[ ] docs/specs/[slug].md — if a spec exists for this feature area, updated
[ ] PITFALLS.md — if old behavior was documented as correct, remove or note
[ ] API documentation — if behavior is externally facing
Doc sync verdict:
	[ ] Complete — all affected files updated
	[ ] Gaps — [list what's missing; these must be filled before /cr]
```

**The signal the sync is done:** a future agent reading CONTEXT.md, TESTING.md,
and AGENTS.md would understand the new behavior as the intended behavior,
with no traces of the old behavior presented as current truth.

---

## Pre-/cr gate (behavior-change specific)

Before invoking `/cr`, verify these two conditions manually:

**Gate 1 — Caller impact verified:**
Every callsite marked "Affected" in Phase 1 has been updated. No affected
callsite was left unchanged without a documented reason.

**Gate 2 — Doc sync complete:**
The doc sync checklist from Phase 6 is present and all items checked.
Do not invoke `/cr` with an empty or partial checklist.

The compound questions block (Q1–Q4) is still required before invoking `/cr`.

---

## Final report format

```
## /behavior-change complete
Changed: <one sentence — what the system now does that it didn't before>
Old behavior: <one sentence>
New behavior: <one sentence>
Branch: behavior-change/<slug>
Caller impact:
	Internal callsites: <N total, N affected, N updated>
	External exposure: <none | described>
Test inversion:
	Outdated (deleted/replaced): <N>
	Valid (updated assertions): <N>
	Coverage gaps (new tests added): <N>
	Net coverage: <improved | same | [explain if reduced with reason]>
Rollback: <state-safe | state-unsafe — plan: described>
Doc sync: <complete | gaps: list>
Compound questions: <complete>
Merged: <commit hash>
```

---

**No agents required.** @explorer is spawned in Phase 1 for callsite search.
@reviewer is available for caller impact review on large changes (5+ affected
callsites) but is not mandatory.

**Feeds:** /cr, /compound
**Creates:** caller impact doc, test inversion list, rollback plan, doc sync checklist
**Output lives in:** `.claude/behavior-change-[slug].md` (pre-phase artifacts)