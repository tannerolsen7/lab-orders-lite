---
name: hotfix
description: Production is broken now. Triage first, then either ship a mitigation
  fast or run the full-fix path with blast-radius analysis. Use when a defect is
  causing active user impact in production. Use when the user says "production is
  down", "users can't", "critical bug", "hotfix", or the impact is P0/P1. Do not
  use for bugs that can wait — those go through /debug → /feature. Requires /debug
  to have produced a root cause first.
---

# /hotfix — Production is broken. Triage first. Fix right.

A hotfix is not a shortcut and it is not a race. The pressure to ship fast
is the exact pressure that causes the next incident. This skill enforces a
triage gate first — agent proposes, human confirms — because picking the
wrong fix path under outage pressure is worse than taking 60 seconds to
pick the right one.

Two modes. The skill names which mode it is in before any code is written.

**MODE: mitigation-only** — the fix that stops the bleeding is not the
real fix. Ship the mitigation (revert, flag-off, narrow guard) fast.
Create a correction task. Correction does the deep work.

**MODE: full-fix** — the fix that stops the bleeding IS the right fix.
Blast-radius analysis runs inline before code. Hotfix takes longer.
That is the correct tradeoff.

## What this is not

- Not a free pass to skip analysis — the blast-radius analysis is
  mandatory, either inline (full-fix) or in the correction task (mitigation-only)
- Not exempt from tests — a failing test proving the bug must exist before the fix
- Not post-mortem-optional — the task is written before merge, always
- Not the right tool if the cause is unknown — run /debug first
- Not always the right tool — if the damage is data corruption already
  in production, stop and route to /migrate or incident recovery

## Anti-rationalization

| Rationalization | Rebuttal |
|---|---|
| "We don't have time for triage, let's just fix it" | Triage takes 60 seconds. The wrong fix path takes hours to undo while production is still broken. |
| "The fix is obvious, skip blast-radius" | Obvious fixes in load-bearing code are how incidents cascade. The analysis exists because it's load-bearing. |
| "I'll write the post-mortem task after the fix ships" | After the fix ships, the post-mortem task doesn't get written. Write it now. |
| "Cause is a bit unclear but I think I know" | "Think I know" is not "know". Run /debug first. |
| "I'll expand scope while I'm in here" | Scope creep during a hotfix causes the next hotfix. Stay in mode. |

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

**Choosing how to ask.** For a small set of discrete choices — mode, approve
vs. reject, pick one of a few options — use `AskUserQuestion`; it renders as
clickable options and already has a built-in escape hatch (the human can
always answer "Other" with free text instead of picking a preset). For
anything the human needs to actually read before deciding — a stack trace,
a diff, a full incident report — present it as prose or a document; a
structured question can't hold that much content.

This applies to Phase 1 (Triage gate — the human confirms the mode) and
Phase 2 (Mitigation-options step — the human picks an option). Both happen
under production-down time pressure, which is exactly when unexplained terms
like "structural boundary crossed" or "Throwaway: yes/no" cost the most.

---

## Entry conditions

**You should not be invoking /hotfix directly.** Run `/incident` first.
`@incident-responder` classifies the problem, confirms it is code in our
codebase, and routes here. Invoking /hotfix without /incident means you
have already decided it's a code bug without evidence — which is exactly
the assumption that causes wrong fixes under pressure.

**The one exception:** if `/debug` has already run in this session and
produced a confirmed root cause in our code, the classification is done.
/hotfix is the correct direct entry.

Before proceeding, confirm both:
1. `/incident` has classified this as `our-code-narrow` or `our-code-structural`,
   OR `/debug` has confirmed a root cause in our code this session
2. Impact is active — users are affected right now

If the damage is data already corrupted in production: **stop**.
`/incident` should have caught this and routed to `/migrate`.
If it didn't, stop now and run `/incident`. A code deploy will not fix data.

---

## The loop

```
/debug → root cause confirmed
	↓
TRIAGE GATE (agent proposes, human confirms)
	↓
	┌─ not code-reversible ──────────────────────→ /migrate or incident recovery
	│
	├─ MODE: mitigation-only ──────────────────→ mitigation-options step
	│       Ship the mitigation (revert/flag/guard)      ↓
	│       Create [hotfix-correction] task [~]     /hotfix loop on mitigation only
	│       Create [hotfix-postmortem] task [~]          ↓
	│       [hotfix-postmortem] blocked until          merge
	│       correction merges, not mitigation               ↓
	│                                              correction task picks up
	│                                              (blast-radius analysis required)
	│
	└─ MODE: full-fix ─────────────────────────→ mitigation-options step
		Mitigation == correction                    ↓
		Blast-radius analysis runs inline    /hotfix loop with analysis
		Create [hotfix-postmortem] task [~]         ↓
			merge
				↓
			/post-mortem runs
```

---

## Phase 1 — Triage gate

The agent produces this document. The human confirms before anything
proceeds. This is one gate. It takes 60 seconds.

```
## Hotfix triage — [slug]
Root cause: [one sentence from /debug output]
Impact: [who is affected, how, since when]
Is this code-reversible?
[ ] Yes — a code deploy can restore correct behavior
[ ] No — data is already corrupted or lost → STOP: route to /migrate
Smallest change that stops the bleeding:
[one sentence — what the mitigation is]
Is that change hotfix-sized? (≤3 files, no structural boundary crossed)
[ ] Yes → candidate for full-fix MODE
[ ] No  → mitigation-only MODE; correction is a separate task
MODE: [ ] full-fix  [ ] mitigation-only
Reason: [one sentence explaining the mode decision]
```

Before asking for confirmation, walk through this in plain language — say
what "code-reversible" and "structural boundary crossed" mean for this
specific bug, not just the checkbox label — and invite the human to ask
before they confirm the mode.

**If the human changes the mode:** agent updates the triage doc and
confirms before proceeding. No silent overrides.

---

## Phase 2 — Mitigation-options step

Regardless of mode, before writing any code, the agent names 2–3 ways
to stop the bleeding. Not full design exploration — a fast options read.

```
## Mitigation options — [slug]
Option A: [what it is]
	Stops bleeding: [yes/no and how]
	Ships in: [time estimate]
	Leaves broken: [what this doesn't fix]
	Throwaway: [yes — correction needed / no — this is the right fix]
Option B: [what it is]
	Stops bleeding: [yes/no and how]
	Ships in: [time estimate]
	Leaves broken: [what this doesn't fix]
	Throwaway: [yes / no]
[Option C if materially different]
Recommendation: Option [X] — [one sentence reason]
```

If only one option exists and it's genuinely the only approach: agent
states that explicitly. The step still runs — it cannot be silently
skipped. One option presented is a collapsed step, not an absent one.

Before the human picks, explain each option in plain language — what
"Throwaway" means in practice for that option (does correction work still
need to happen after this ships, or is this the real fix) — and invite
questions before they choose.

Human picks. Agent proceeds with the chosen option.

---

## Phase 3 — TASKS.md entries (before any code)

Write all required task entries before touching the codebase.

**MODE: full-fix — one entry:**
```
## P0
- [~] [hotfix-postmortem] Post-mortem: [slug]
	blocked: pending hotfix merge
	hotfix-branch: hotfix/[slug]
	symptom: [one sentence]
	cause: [one sentence — root cause from /debug]
	run: /post-mortem after merge
```

**MODE: mitigation-only — two entries:**
```
## P0
- [~] [hotfix-correction] Correction: [slug]
	blocked: pending mitigation merge
	mitigation-branch: hotfix/[slug]-mit
	cause: [one sentence — root cause from /debug]
	note: blast-radius analysis required before correction code; run @reviewer
	run: /feature (Small) with blast-radius section pre-filled
- [~] [hotfix-postmortem] Post-mortem: [slug]
	blocked: pending correction merge (not mitigation merge)
	correction-task: [hotfix-correction] above
	run: /post-mortem after correction merges
```

`[~]` keeps both visible at every session start as active blockers.
The post-mortem in mitigation-only mode is blocked until the *correction*
merges — not the mitigation. The system is not actually fixed until then.

**@hotfix-guard will not pass without the required entries present.**

---

## Phase 4 — Blast-radius analysis

**Full-fix mode:** runs here, inline, before any code.
**Mitigation-only mode:** runs inside the `[hotfix-correction]` task before correction code.

Spawn `@reviewer` with the root cause and the proposed fix as input.
The reviewer runs two lenses:

**Impact lens — what does changing this affect?**
- Every callsite of the code being changed, and what each assumes about current behavior
- Downstream behavior that changes — intended and unintended
- Client-side vs. server-side: where the fix lives and what that choice leaves exposed
- What this fix makes harder or breaks elsewhere in the codebase
- Whether any existing tests now test the wrong thing (they pass but verify old incorrect behavior)

**Cascade lens — what could this fix break at runtime?**
- Edge cases introduced by the fix that weren't present in the bug
- Race conditions, ordering assumptions, or async behavior affected
- Auth, permissions/access policies, or security boundaries touched
- Any behavior that was accidentally depended on by callers

Output is a **blast-radius report**:
```
## Blast-radius report — [slug]
Callsites affected: [list with what each assumes]
Downstream behavior changes: [intended | unintended]
Fix location decision: [client | server | both — and why]
What this breaks: [list or "none found"]
Tests that now verify wrong behavior: [list or "none"]
Cascade risks: [list or "none found"]
Verdict: [Safe to proceed | Proceed with noted risks | Stop — scope must expand]
```

If verdict is **Stop**: the fix is not hotfix-sized even if it appeared
to be. Demote to mitigation-only. Write the correction task.

If verdict is **Proceed with noted risks**: risks are documented in the
TASKS.md correction entry and reviewed at `/cr` time.

---

## Phase 5 — The hotfix loop

```
git checkout -b hotfix/[slug]          (full-fix)
git checkout -b hotfix/[slug]-mit      (mitigation-only)
	↓
Write failing test → confirm red
	↓
Write minimum fix → confirm green
	↓
npx tsc --noEmit
	↓
/cr (correctness + scope + test + blast-radius consistency)
	↓
@hotfix-guard (gates: tasks exist, test exists, scope not exceeded)
	↓
merge to main
```

**The failing test** must:
1. Fail against the current (broken) code
2. Pass after the fix
3. Be specific to the root cause — not a broad integration test

Confirm red before writing any fix. If the test passes before the fix:
the test is wrong. Rewrite it.

**The fix** must stay within the chosen option's scope. If fixing
correctly requires more than declared scope: write BLOCKING to
`questions.md` and stop. Do not silently expand.

---

## Phase 6 — @hotfix-guard

Spawn `@hotfix-guard` before merging. Three gates:

1. **Required TASKS.md entries exist** — correct entries for the mode
2. **Failing test exists** — at least one new test added targeting root cause
3. **Scope not exceeded** — diff touches only files in declared scope

All three must pass. No partial passes.

Full agent: **Templates → agents/hotfix-guard.md**

---

## Final report format

```
## /hotfix complete
MODE: [full-fix | mitigation-only]
Fixed: <what the mitigation or fix does>
Cause: <root cause>
Branch: hotfix/<slug>
Test: <file:line — what it asserts>
Blast-radius: <key findings or "inline — clean">
Scope: <files changed>
Guard: PASS
TASKS.md entries:
	[hotfix-postmortem] — [~] blocked until [merge | correction merge]
	[hotfix-correction] — [~] blocked until mitigation merge  (mitigation-only only)
Merged: <commit hash>
```

---

## After merge

**Full-fix:**
1. `[hotfix-postmortem]` → `[ ]` (active)
2. Run `/post-mortem` next available session
3. Do not start new feature work until post-mortem runs

**Mitigation-only:**
1. `[hotfix-correction]` → `[ ]` (active) — correction task starts
2. Correction runs as `/feature` (Small) with blast-radius section pre-filled
3. `[hotfix-postmortem]` remains `[~]` until correction merges
4. After correction merges: post-mortem runs on the full arc

**Spawns:** `@hotfix-guard`, `@reviewer` (blast-radius)
**Feeds:** `/post-mortem` (after correction or full-fix merge)
**Creates:** `[hotfix-correction]` task (mitigation-only), `[hotfix-postmortem]` task (always)
**Output lives in:** `TASKS.md`, `.claude/hotfix-scope-[slug].md`