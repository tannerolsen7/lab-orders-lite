---
name: dev
description: Full TDD + pipeline review loop for a single task. Runs Phase 0 (scope
check), Phase 1 (write failing tests), Phase 2 (implement), Phase 3 (pipeline review +
auto-fix), Phase 4 (doc update), Phase 5 (tsc + commit). Use /dev <task description>.
---

# TDD Development Workflow

Task: $ARGUMENTS

You are the **development orchestrator**. Your job is to take this task through test-driven
development, a full multi-stage review with auto-fix, and land clean committed code.

Do not skip any phase. Do not proceed to the next phase if the current phase fails.
Do not write or modify code outside of the phases below.

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
anything the human needs to actually read before deciding — a schema, test
output, a full report — present it as prose or a document; a structured
question can't hold that much content.

This applies to Phase 0 steps 3 and 5 (stopping to ask about an open
decision or a new package) and the final report's "NEEDS HUMAN" list.

---

## Phase 0 — Scope and clarity check

Before writing anything:

1. Read `CLAUDE.md` and `AGENTS.md` to confirm the task fits MVP scope
2. Identify which pure functions in `src/data/`, `src/schemas/`, or `src/utils/` need to be
   written or modified — list them explicitly
3. If the task touches an open decision listed in `AGENTS.md`, stop and ask before
   continuing — give the full context (what the decision is and why it matters here)
   in plain words, and invite the user to ask before they decide
4. If the task description is ambiguous, ask one clarifying question before continuing
5. If the task requires a new npm package, stop and ask — provide name, purpose, weekly
   downloads, last publish date, and whether it ships its own types, stated in plain
   words, and invite the user to ask before they approve it

---

## Phase 1 — Test Writer Agent

Spawn an Agent sub-agent with this exact framing:

> You are a staff engineer practicing strict TDD. No implementation exists yet.
> The task is: $ARGUMENTS
>
> Write tests for all pure functions this task requires. Constraints:
> - Vitest + Testing Library only (if not yet configured, confirm with the user before setup)
> - Colocate test files next to the file under test (e.g. `getProposal.test.ts`)
> - Cover the happy path and at least two failure or edge cases per function
> - For data access functions in `src/data/`: tests MUST run against a real Supabase test
>   instance — NEVER mock the database
> - No snapshot tests
>
> Write ONLY test files. Write zero implementation code. The tests must fail when run —
> if they pass before implementation exists, they are wrong.

After this agent completes, run `npx vitest run` and confirm the new tests fail.
If the new tests pass without implementation, something is wrong — stop and fix the tests
before continuing.

---

## Phase 2 — Implementation Writer Agent

Spawn an Agent sub-agent with this exact framing:

> You are a staff engineer. Tests have been written and are currently failing.
> The task is: $ARGUMENTS
>
> Write the minimum implementation to make all failing tests pass. Rules:
> - No `any`, no `as` without a preceding narrowing check, no `// @ts-ignore`
> - Zod schemas for all data that crosses a system boundary
> - TypeScript types derived from Zod schemas using `z.infer<>` — no hand-written duplicates
> - Props defined as named interfaces, not inline object types
> - Business logic in pure functions, never inside components
> - Supabase queries only in `src/data/` — never inline in a component, page, or layout
> - If a function does two distinct things, split it
> - Named exports everywhere except `page.tsx`, `layout.tsx`, `loading.tsx`
>
> Write only what's needed to make the tests pass. Do not add speculative features.
> Do not clean up code outside the task scope.

After this agent completes, run `npx vitest run`. All tests must pass before moving on.
If tests fail, spawn a second implementation agent with the failure output and repeat until
all tests are green.

---

## Phase 3 — Multi-Stage Review and Auto-Fix

Invoke the `/cr` skill and follow its instructions exactly.

The diff to review is all changes made so far in this session (`git diff HEAD`).

Let the review run all passes. Wait for it to complete before proceeding.

After the pipeline finishes, run `npx vitest run` one final time to confirm the auto-fixes
did not break anything.

---

## Phase 4 — Doc Updater Agent

Spawn an Agent sub-agent with this exact framing:

> You are responsible for keeping project documentation accurate. Review all changes made
> in this session and check whether any of the following need updating:
>
> - `CLAUDE.md` → File conventions, Architecture, TypeScript, Code style, or Development
>   workflow — update in place if a new pattern was introduced that isn't already documented
> - `AGENTS.md` → Product scope, open decisions, or architectural context — update if a
>   decision was made or scope changed during this task
> - `docs/design/tokens.md` or `docs/design/components.md` — only if a new design token
>   or component pattern was introduced
>
> Rules:
> - Edit in place — do not add new sections unless the existing structure cannot accommodate
>   the change
> - Keep entries terse, one rule per line
> - If nothing needs updating, say so explicitly — do not invent updates

---

## Phase 5 — Type check and commit

Run `npx tsc --noEmit`. It must exit with zero errors before committing.

Commit all changes with a conventional commit message following the format in `CLAUDE.md`:

```
type(scope): short description

Why this change was made and what it addresses.
```

---

## Final report to user

After the commit, report in this format:

```
## /dev complete

**Built:** <what was implemented, one sentence>
**Tests:** <N tests written, covering X, Y, Z>
**Review:** <N must-fix items auto-fixed, N flagged for human review>
**Docs:** <what was updated in CLAUDE.md / AGENTS.md, or "no changes needed">
**Commit:** <commit hash and message>
```

If any phase produced a **NEEDS HUMAN** flag, list those items clearly — full context
first, plain words, and an invitation to ask before they decide — so the user can
address them.
