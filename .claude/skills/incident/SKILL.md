---
name: incident
description: |
  Something is wrong and the type of problem is not yet known. Runs
  before any fix, debug, or hotfix. Classifies the incident through structured
  evidence gathering and routes to the correct resolution path. Use when the user
  says "something is broken", "a user reported", "production issue", "bug report",
  "users can't", "something seems wrong", or any report of unexpected behavior.
  Do not invoke /debug, /hotfix, or /feature before running this. The exception:
  if /debug has already confirmed a root cause in our code, classification is done
  and /hotfix is the correct direct entry.
---

# /incident — Classify first. Route second. Fix third.

The most expensive mistake in incident response is acting on the wrong
classification. An hour spent fixing code when the problem was data. A
hotfix that patches our code when the bug was in a dependency. A feature
built when the user just needed clarification.

This skill runs before you know what you have. Its output is a single
**triage packet** — a named incident type, the evidence behind it, a
proposed route, a proposed immediate action, and an ordered checklist
of what the human must do next. The agent does the classification. The
human confirms the route. The packet is complete and copy-pasteable: a
human acts on it without re-deriving anything.

## Incident types

| Type | What it is | Route |
|---|---|---|
| **user-error** | Expected behavior the user didn't anticipate | Communication draft |
| **data-problem** | Wrong or corrupt state in the database | /migrate or data correction |
| **third-party** | Dependency, API, or service behaving incorrectly | /evaluate-solution or vendor contact |
| **config-infra** | Environment variable, deployment, or infrastructure issue | Config/ops correction |
| **our-code-narrow** | Defect in our code, contained blast radius | /debug → /hotfix |
| **our-code-structural** | Defect revealing a deeper architectural problem | /debug → /hotfix (mitigation) + /refactor or /feature |
| **capability-gap** | Behavior was never built | /feature, possibly /evaluate-solution first |
| **security** | Unauthorized access, data exposure, privilege escalation, abuse | Isolate immediately → security incident path |

## What this is not

- Not a fix — no code is written here
- Not a guess — every classification requires evidence
- Not a debate — agent classifies, human confirms or redirects
- Not skippable — do not invoke /hotfix, /debug, or /feature without running this first
  (unless /debug has already confirmed root cause in our code)

## Anti-rationalization

| Rationalization | Rebuttal |
|---|---|
| "It's obviously a code bug, skip triage" | Obvious classifications are wrong often enough to justify 5 minutes of evidence. |
| "We don't have time to classify, just fix it" | Acting on the wrong classification costs more time than classification takes. |
| "The user said it's broken so it must be broken" | User reports describe symptoms, not root causes. Reproduce before classifying. |
| "I couldn't reproduce it but I'll investigate anyway" | Non-reproducible = do not proceed. Surface it and get more context first. |
| "It's intermittent, probably a fluke" | Intermittent is a classification signal, not a reason to dismiss. |

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
anything the human needs to actually read before deciding — the full triage
packet, a query result, evidence from a check, a proposed route with its
reasoning — present it as prose or a document; a structured question can't
hold that much content.

This applies to Phase 3, the triage packet — specifically the Classification
type (e.g. "our-code-structural", "config-infra") and the Proposed route,
which the human confirms before the route's own skill takes over.

---

## The loop

```
Report received
	↓
Phase 0 — Reproduce
	↓
	├─ Not reproducible → STOP: surface to human, request context
	├─ Intermittent → proceed with confidence: Low, flag pattern
	└─ Reproduced → proceed to evidence gathering
		↓
Phase 1 — Evidence gathering (parallel where possible)
	↓
Phase 2 — Classify
	↓
Phase 3 — Assemble triage packet
	↓
	├─ Confidence: High → route + immediate action + human checklist
	├─ Confidence: Low/Split → most likely route + one question + human checklist
	└─ Security signal → isolation action ONLY, full stop, no route
		↓
Human confirms route (or runs the human checklist and pastes back)
	↓
Route's own skill takes over
```

---

## Phase 0 — Reproduce

Before any investigation, reproduce the symptom using the reported steps.

**Attempt reproduction:**
1. Use the exact steps the reporter described
2. Match the environment (production data state if accessible, or staging if not)
3. Note any data dependencies — does the symptom require specific records?

**Three outcomes:**

**Reproduced consistently** — record the exact reproduction steps and proceed.

**Not reproducible after two attempts** — stop. Do not classify. Write to the
triage packet:
```
Reproduction: FAILED
Attempts: 2
Steps tried: [exact steps]
Result: [what happened instead of the reported symptom]
Needed: [what additional context would help reproduce — specific user,
	specific data, specific time window, browser/device, etc.]
```
Surface to human and wait. Do not proceed until reproduced.

**Intermittent** — record the pattern and proceed with confidence: Low.
```
Reproduction: INTERMITTENT
Successes: [N of M attempts]
Pattern: [any timing, data, or sequence pattern noticed]
Likely category: race condition | async timing | environment-specific | unknown
```

---

## Phase 1 — Evidence gathering

Run these checks in parallel where possible. Collect evidence before
forming a classification. Do not classify mid-gathering.

**Check 1 — Behavior vs. spec**
Read TESTING.md and CONTEXT.md. Does the reported behavior contradict
any documented expected behavior?
- If behavior matches spec → evidence for user-error or capability-gap
- If behavior contradicts spec → evidence for our-code or data-problem

**Check 2 — Recent changes**
Read git log for the last 7 days. Any recent commits touch files
related to the symptom?
- Recent commit in relevant area → evidence for our-code
- Recent dependency version bump → evidence for third-party
- Recent migration → evidence for data-problem
- Recent config change → evidence for config-infra

**Check 3 — Dependency health**
Check package.json and lock file. Are there recent version changes in
dependencies related to the symptom area?
- If yes: check the dependency's changelog and open issues for this behavior
- Status page if it's a service dependency
- If confirmed third-party issue → strong evidence for third-party

**Check 4 — Data state**
Produce a query that would reveal whether the data related to the
symptom is in expected state. Do not execute it — surface it.

If `incident-db-query-enabled: true` is set in `.claude/settings.json`:
the agent may execute read-only queries directly. Otherwise produce
the query for the human to run and interpret the result.

Signs of data-problem: records in impossible states, missing required
relations, values outside expected ranges, timestamps in wrong order.

**Check 5 — Security signals**
Scan for any of: access to records by users who shouldn't have access,
unexpected privilege in logs or auth state, rate-limit abuse patterns,
data visible across tenant boundaries. If any signal present → flag
immediately as security regardless of other evidence.

**Check 6 — PITFALLS.md**
Read PITFALLS.md. Does the symptom match any documented known trap?
If yes → surface the match and skip directly to classification.

---

## Phase 2 — Classify

Using the evidence from Phase 1, assign the most likely incident type.
Evidence does not have to be conclusive — it has to be sufficient to
justify a route with stated confidence.

**Confidence: High** — two or more independent evidence checks point
to the same type, and no evidence contradicts it.

**Confidence: Low** — evidence points one direction but is incomplete,
or two checks point to different types.

**Confidence: Split** — evidence genuinely supports two types equally.
Pick the safer route (the one less likely to waste time if wrong) and
surface both in the triage packet.

---

## Phase 3 — Assemble the triage packet

Write the full packet to `.claude/incident-[slug].md` before surfacing
anything to the human. The packet is the single artifact the human acts
on — it must be complete and self-contained. Every section below is
required; if a section is empty, write why it is empty, never delete it.

Goal for the packet: a human reads it top to bottom, knows what happened,
knows how confident the agent is and on what basis, knows the proposed
route and immediate action, and knows the exact ordered steps to take —
without re-deriving anything or re-reading the codebase.

The Classification type is a label for the record (e.g. "our-code-structural"),
but "At a glance" and "Classification" must also say in plain words what that
label means here and why the evidence points there — never leave a raw
label for the human to decode on their own.

```
# Incident — [slug]
## At a glance
Reported symptom: [one sentence — exactly what was reported]
Environment: [production | staging | dev]
Reporter: [user | internal | automated alert]
Detected: [timestamp or "unknown"]
Reproduction: [Reproduced | Intermittent | Failed]
Classification: [incident type] — Confidence: [High | Low | Split]
Proposed route: [named skill or path, or "ISOLATION ONLY — security"]
Immediate action: [one line, or "none"]
Human action required: [Yes — see checklist | No]

## Reproduction
Status: [Reproduced | Intermittent | Failed]
[If reproduced: exact steps that reproduce it — copy-pasteable]
[If intermittent: pattern observed, N of M attempts, likely category]
[If failed: steps tried, what was observed instead, context needed]

## Evidence
Each check records what was checked, what was found, and a one-line
Finding. The Finding line is mandatory on every check.
### Check 1 — Behavior vs. spec
Checked: [TESTING.md / CONTEXT.md sections read]
Found: [what they say about this behavior]
Finding: [supports <type> | contradicts <type> | neutral]
### Check 2 — Recent changes
Checked: [git log window and paths]
Found: [relevant commits in last 7 days, or "none relevant"]
Finding: [supports <type> | neutral]
### Check 3 — Dependency health
Checked: [packages / status pages / changelogs reviewed]
Found: [version changes, status-page findings, changelog entries]
Finding: [supports <type> | neutral]
### Check 4 — Data state
Checked: [what the query targets]
Found: [result if executed; otherwise "pending human execution"]
Query (for human to run, read-only):
  SELECT ... ;
Finding: [supports <type> | neutral | pending human execution]
### Check 5 — Security signals
Checked: [auth/permission/tenant/abuse surfaces scanned]
Found: [what was found]
Finding: [no signals | SECURITY SIGNAL DETECTED]
### Check 6 — PITFALLS.md match
Checked: [PITFALLS.md]
Found: [matching entry, or "no match"]
Finding: [match found — <entry title> | no match]

## Classification
Type: [incident type]
Confidence: [High | Low | Split]
Reasoning: [one paragraph — which checks point here and how decisively]
Ruled out: [types considered and the evidence that eliminated each, or
  "none — single dominant signal"]

## Proposed route
[Specific next step — named skill or path. For a security signal: write
"ISOLATION ONLY — no route proposed. Security incident path runs
separately after isolation."]

## Proposed immediate action
[Anything that should happen before the route runs: feature flag off,
pin a dependency version, isolate an endpoint — or "none". For a
security signal this is the isolation action and it is the ONLY action.]

## Open question
[One question if Confidence is Low or Split. Empty if High. Never more
than one — everything else is resolved through evidence.]

## Human action checklist
Ordered. For each step: what to do, where to do it, and exactly what to
paste back. Mark each step [BLOCKING] (classification or route cannot
proceed until pasted back) or [INFO] (confirms the picture but does not
block). Order BLOCKING steps first.
1. [BLOCKING] Run this query in your database SQL console and paste the
   full result back here:
   SELECT id, status, user_id FROM bookings WHERE id = '[affected-id]';
2. [BLOCKING] Check the Vercel deployment log for the last deploy and
   paste any errors from the Build Output section.
3. [INFO] Open [service] status page (status.[service].com) and paste
   whether an incident is active.
After pasting back: [what the agent does next — re-classify, hand the
packet to the proposed route, or confirm isolation held].
If no human steps are required: write
"None — agent completed all checks; confirm the route to proceed."
```

A High-confidence packet with no blocking steps is the strongest output:
the human reads it, confirms the route, and the route skill takes over.
A Low or Split packet ends on a single question plus the checklist that
will resolve it.

Every packet, at any confidence level, closes with an invitation to ask
before confirming the route — a packet the human can't question is a
rubber stamp, not a confirmation.

---

## Autonomy model

**High confidence + narrow path** (user-error, config-infra, our-code-narrow):
Agent proposes full resolution path. Human confirms. Agent or route skill executes.

**High confidence + broader path** (third-party, our-code-structural, capability-gap):
Agent proposes route and first step. Human confirms route. Route's own skill takes over.

**Low or Split confidence:**
Agent surfaces the triage packet with one question. Human answers.
Agent re-classifies and proposes.

**Security signal — any confidence:**
Agent proposes isolation action only. Full stop. No route proposed.
The packet's Proposed route reads "ISOLATION ONLY"; the immediate action
is the isolation step and the only action. Human decides next step.
Security incident path runs separately.

**Non-reproducible:**
Agent surfaces what it tried and what it needs. Full stop.
No classification. No route. Wait for human context.

---

## Route handoff

When the human confirms a route, the triage packet travels with it.
The receiving skill reads it at entry — it is the context that replaces
the normal orient step for incident-originated tasks.

| Route | What receives the triage packet |
|---|---|
| /debug → /hotfix | /debug reads it as the starting context; root cause location field pre-seeded |
| /migrate | Migration plan uses data-state findings as input |
| /evaluate-solution | Third-party evidence section feeds directly into evaluation |
| /feature | Capability-gap finding seeds the TASK-TEMPLATE |
| Communication draft | Packet is the brief; agent drafts, human sends |
| Config/ops correction | Agent proposes specific change; human applies |
| Security path | Packet handed to security reviewer |

**Spawns:** `@incident-responder`
**Output lives in:** `.claude/incident-[slug].md`
**Feeds:** /debug, /hotfix, /migrate, /evaluate-solution, /feature, security path

---

## Current limitations — human steps required

Several evidence checks require human action because the infrastructure
to automate them doesn't exist yet. The triage packet's **Human action
checklist** lists exactly what to do, where, and what to paste back.

| Check | Current state | What removes this step |
|---|---|---|
| Check 4 — Data state | Agent produces query; human runs it in DB console | DB MCP with read-only incident access |
| Check 5 — Security signals (logs) | Agent scans code; human checks auth logs manually | Log streaming MCP or observability integration |
| Check 5 — Security signals (runtime) | Agent can't see live request patterns | APM or monitoring MCP (Datadog, Sentry, etc.) |
| Phase 0 — Production reproduction | Agent reproduces on staging; production data state requires human | Production read-only DB access or data snapshot tooling |
| Check 3 — Service status pages | Agent web_searches; some status pages require auth | Status page MCP or webhook integration |

**When adding infrastructure:** update `.claude/settings.json` with the
enabled flags and remove the corresponding rows from this table. The
human checklist in the triage packet will shrink automatically as checks
become agent-executable.

Flags to add to `.claude/settings.json` as capabilities are wired:
```
{
	"incident-db-query-enabled": false,
	"incident-log-access-enabled": false,
	"incident-monitoring-mcp": null
}
```

Note: these flags cannot currently be added to `.claude/settings.json` —
Claude Code's schema validation rejects unrecognized top-level keys.
Until this is resolved upstream, these flags are documented here for
reference only. The incident skill will always prompt humans for DB
query execution (the safer default).