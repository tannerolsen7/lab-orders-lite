---
name: tdd
description: Implements a confirmed behavior using red-green-refactor with
  vertical slices. Use when the user says "/tdd", "implement this", "write
  the code for", "build this slice", or "make this test pass". Requires a
  confirmed behavior in docs/TESTING.md before starting. One behavior = one
  test = one implementation = one commit. Never batches multiple behaviors.
---

# TDD — Vertical Slice Red-Green-Refactor

## The loop — Canon TDD (specify → encode → fulfill)

This skill is the Canon TDD loop. Every slice moves through three named moves, in order:

1. **Specify** — state the one behavior you are about to build, drawn from docs/TESTING.md or the user (never from the implementation).
2. **Encode** — write that behavior as a single failing test (red). Run it; confirm it fails for the right reason.
3. **Fulfill** — write the minimum code to make the test pass (green). Run it; confirm it passes. Refactor only if genuinely needed.

Hold to this named loop. The behavioral rules below serve the loop — they are not a substitute for it.

---

## Anti-rationalization (read before proceeding)

| Rationalization | Rebuttal |
|---|---|
| "I'll write the test after the implementation" | There is no after. A test written after implementation is a transcription, not a spec. Write the failing test first. |
| "This function is too simple to need a test" | Simple functions break in simple ways. One edge case, one null, one wrong type. Write the test. |
| "I can't write the test first because I don't know the interface yet" | Then you're not ready to implement. Stop and design the interface first. |
| "Tests pass, so it's correct" | Passing tests prove the behaviors you tested. Did you test the right behaviors? |

---

## Presenting decisions to the human

The one place below where the human is asked to decide something must do
three things. The goal is not to dumb the information down — it's to make
it as easy as possible to read, understand, and decide on:

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

**Choosing how to ask.** This skill only has one decision point (below), and
it's naturally a yes/no — good fit for `AskUserQuestion`, which renders as
clickable options and already has a built-in escape hatch (the human can
always answer "Other" with free text instead of picking a preset).

This applies to Step 1 — the one point in this skill where the agent asks
the user anything (a behavior not yet confirmed in `docs/TESTING.md`).

---

## Step 0 — The rule that prevents the most common failure

**No transcription tests.** Expected behavior comes from `docs/TESTING.md`
or from the user — never from reading the implementation. Reading the code
to derive expected values produces tests that pass even when behavior is wrong.

---

## Step 1 — Confirm the behavior before touching code

- Find the target behavior in `docs/TESTING.md` or its shard files under `docs/testing/` → confirmed behaviors
- If not there: **stop and ask the user** before proceeding — say in plain words why
  it needs a decision now (e.g. "this behavior isn't confirmed yet, so if I guess at
  it the test would lock in something nobody's actually agreed to")
- Add the confirmed behavior to `docs/testing/<slug>.md` (run `bash scripts/derive-slug.sh` to get the slug) before writing any test
- If this is a bug fix: write the behavior as it SHOULD work, not as it does

---

## Step 2 — Design the interface

Before writing the first test, confirm the public interface (function signature,
server action, data function, schema, etc.).

Read the target source file and adjacent tests to understand:
- The existing interface shape
- Test infrastructure already in place (see `docs/TESTING.md` → Mock infrastructure)
- `PITFALLS.md` entries that apply to this area
- Relevant `docs/solutions/` entries

Tests written through the wrong interface have to be rewritten from scratch.

---

## Step 3 — Decompose into vertical slices

Break the feature into the smallest independently-shippable behaviors.
One behavior = one slice = one commit.

Each slice must be completable in one loop iteration and provable by a single test.

**Examples of correctly-sized slices:**

| Too large | Right size |
|---|---|
| "Add the user-profile feature" | "Return null from getUser when the id is not found" |
| "Fix all validation edge cases" | "Reject an access token shorter than 8 characters" |
| "Refactor the orders data layer" | "Extract computeOrderTotal into a standalone pure function" |

---

## Step 4 — Loop: one vertical slice at a time

**Repeat until the feature is complete. Do not batch tests. Do not batch code.**

For each slice:
1. Pick the next slice from the decomposition
2. Write the confirmed expected behavior as a comment before the test
3. Write the test for this ONE slice (it should fail — red)
4. Run `npx vitest run <test-file>` — confirm it fails for the right reason
5. Write minimum code to make this test pass (green) — nothing more
6. Run again — confirm it passes
7. Refactor only if genuinely unclear or obvious duplication from this slice
8. Commit test + implementation together as one atomic commit
9. → Next slice

**Key discipline:** do not write the next test until the previous slice is committed.

---

## Step 5 — Test patterns for this codebase

- **Never mock the database / backend.** Integration tests for the data-access layer hit a real test database, per the project's test setup — not a mock.
- **Seed rows via the project's admin/seed client** in `beforeAll` when no app-level write function exists yet for the table.
- **Spy sparingly.** Error paths that cannot be triggered organically (e.g. an auth-service failure) may use a narrow `vi.spyOn` on that one boundary — the only accepted spy pattern. Never spy to fake the behavior under test.
- **Pure functions** (utils, schemas, domain logic) need no infrastructure — test directly with inputs and expected outputs.
- See `docs/TESTING.md` → Mock infrastructure for established patterns before inventing new ones.

---

## Step 6 — Update the shard file after each slice

After the slice's test passes:
1. Add the behavior to `docs/testing/<slug>.md` (the per-feature shard, not `docs/TESTING.md` directly — that file is generated)
2. Remove it from "Known test gaps" if fully covered
3. If previously unconfirmed, move from "Code-observed" to "Confirmed behaviors"
4. Append `<!-- test: <path> -->` on the line immediately below the exact behavior
   bullet this slice confirms — locate the same bullet text used in Step 1, do not
   create a duplicate. `<path>` is the test file just written in this slice's Step
   4. If the behavior was already annotated (e.g. re-confirming an existing bullet),
   overwrite the annotation rather than appending a second one. If a slice
   intentionally ships without an automated test (rare — state why), write
   `<!-- test: none -->` instead of a path. `/cr`'s spec coverage check
   (`scripts/spec-coverage-check.sh`) reads this annotation to verify every
   behavior touched by a diff is backed by a passing test. The annotation
   must be the literal next line, exact format, no blank line in between —
   copy this shape and fill in the path:
   ```
   - <the confirmed behavior bullet, unchanged>
   <!-- test: <path/to/file.test.ts> -->
   ```