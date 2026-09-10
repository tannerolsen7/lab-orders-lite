---
name: debug
description: |
  Investigates an observed symptom, finds the root cause, writes
  a failing test that confirms it, and produces a filled TASK-TEMPLATE.md
  ready to hand to /feature. Use when something is broken, behaving
  unexpectedly, or throwing an error — and the cause is unknown. Use when
  the user says "something's wrong", "this is broken", "why is X happening",
  "track down this bug", or invokes /debug — OR reports a symptom more
  obliquely: "X seems off/wrong now", "this used to work", "X tends to
  [do Y]", "is this a regression", or attaches a screenshot/URL of wrong
  behavior. Treat "now"/"used to work" regression language and
  symptom-with-screenshot reports as STRONG triggers whenever the cause is
  not already known. Do not use when the cause is already known — go
  directly to /feature (Tiny) instead.
---

# /debug — Investigate, confirm, hand off

The output of /debug is not a fix. It is a root cause + failing test +
task spec. The fix goes through /feature like everything else.

## Anti-rationalization

| Rationalization | Rebuttal |
|---|---|
| "I can see what's wrong, I'll just fix it" | You haven't confirmed it yet. A fix without a failing test is a guess with extra steps. Run the loop. |
| "The fix is one line, /feature is overkill" | Tiny tasks in /feature take 5 minutes. Unreviewed one-liners become PITFALLS.md entries. |
| "I'll write the test after the fix" | The test written after the fix tests what you did, not what was broken. Wrong order. |
| "The root cause is obvious" | Surface it in the report anyway. "Obvious" root causes that skip confirmation are the ones that come back. |

---

## Step 0 — Orient

Before investigating anything:

1. Read `memory.md` — any entries about this area of the codebase?
2. Read `PITFALLS.md` — is this a documented footgun?
3. Search `docs/solutions/` for patterns touching the reported area
4. Search `docs/research/` for relevant external dependency notes

If PITFALLS.md already documents this failure mode: surface the entry,
confirm the symptom matches, skip to Step 3.

Report what you found before proceeding.

---

## Step 1 — Reproduce

Reproduce the symptom from the description alone. Do not ask for
reproduction steps unless the description is genuinely insufficient
to form a hypothesis.

1. Form a hypothesis from the symptom description
2. Identify the smallest code path that should trigger it
3. Run it — via test, via the dev server, or via direct invocation
4. Confirm the symptom appears as described

**If you cannot reproduce after two attempts:** stop. Write a
BLOCKING question in `.claude/questions.md`:
- What symptom did you observe
- What you tried
- What additional reproduction context you need

Do not proceed to Step 2 without confirmed reproduction.

---

## Step 2 — Bisect

With reproduction confirmed, find the root cause layer by layer.

1. **Identify the failure boundary** — which layer first produces
   incorrect output? (data fetch, transform, state, render, network)
2. **Read the relevant files** — use @investigator when the bug crosses
   a layer boundary (regardless of file count) or spans 3+ files in the
   same layer; grep directly for single-layer targeted lookups
3. **Trace the data** — follow the value from source to symptom.
   Where does it diverge from expected?
4. **Confirm causality** — the root cause must explain the symptom
   fully. If it explains it partially, keep bisecting.

**STOP AND SURFACE if:**
- Root cause touches auth, permissions/access policies, or the data-access layer —
  surface before proceeding; do not attempt a fix hypothesis
- Root cause is ambiguous between two locations —
  surface both candidates; do not pick one unilaterally
- Root cause requires a schema migration to fix —
  surface immediately; this is not a Tiny task
- The symptom appears in a file outside the initial search scope —
  surface the expanded scope before reading further

---

## Step 3 — Write the failing test

Before forming any fix hypothesis:

1. Write a test that reproduces the confirmed root cause
2. Run it — it must fail, for the right reason
3. If the test passes before any fix: the test is wrong. Rewrite it.
   The test must fail against the current broken state.

The failing test is the contract. It defines what "fixed" means.
Nothing proceeds without it.

Add the failing test to `docs/testing/<slug>.md` under "Known gaps" (run `bash scripts/derive-slug.sh` to get the slug; do not write to `docs/TESTING.md` directly — that file is generated) with a note: `[BUG] confirmed failing — awaiting fix via /feature`.

---

## Step 4 — Produce the task spec

Fill TASK-TEMPLATE.md as a Tiny task:

```
## TASK
One sentence: what the fix makes true that is currently false.
## SUCCESS CRITERIA
- [ ] Failing test from /debug now passes
- [ ] No other tests broken
- [ ] npx tsc --noEmit exits zero
## SCOPE
In scope:
- [exact files root cause lives in]
Out of scope (do not touch):
- [anything outside the confirmed root cause layer]
## CONSTRAINTS
- Do not change the public interface unless the bug is in the interface
- Do not refactor while fixing — one behavior, one commit
## ROOT CAUSE
[One paragraph. What is broken, where it lives, why it produces
the observed symptom. Cite file:line.]
## OPEN QUESTIONS
[Any ambiguity that emerged during bisect. Surface — do not resolve.]
## REFERENCES
- Root cause: [file:line]
- Failing test: [file:line]
- PITFALLS.md: [§ if relevant]
## SIZE ESTIMATE
[x] Tiny
## PRE-GRILL
1. What does this need to do, and why is it structured this way?
   [Filled by /debug based on root cause findings]
2. Where could this fail?
   [Filled by /debug based on bisect observations]
3. What would you change, and why?
   [Filled by /debug based on fix hypothesis]
```

---

## Final report

```
## /debug complete
Symptom: <one sentence>
Reproduced: <yes | no — if no, see questions.md>
Root cause: <file:line — one sentence>
Layer: <data | transform | state | render | network | infra>
Failing test: <file:line>
PITFALLS.md: <new entry warranted | existing entry matched | none>
Task spec: <filled TASK-TEMPLATE.md ready for /feature (Tiny)>
STOP AND SURFACE: <any items that need human decision before fix proceeds>
```

---

## Done criteria

- Symptom reproduced from description
- Root cause confirmed (not hypothesized)
- Failing test written and confirmed red for the right reason
- TASK-TEMPLATE.md filled as Tiny task
- `docs/testing/<slug>.md` shard updated with `[BUG]` entry under Known gaps
- PITFALLS.md checked — new entry proposed if this is a recurring trap
- Final report delivered
- Fix has NOT been written — /feature owns the fix
