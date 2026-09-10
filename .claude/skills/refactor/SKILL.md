---
name: refactor
description: |
  Safe, incremental code refactoring with test gates enforced at every step. One mode: extract-module (move code into one or more new files). Use when splitting a large file, or when user says "refactor", "extract this", "split this file", "this file is too big", or "move this to its own module". For renaming a symbol or extracting a function, apply the two-hat and test-first rules from CLAUDE.md and proceed — no skill invocation needed.
---

# /refactor

## Two rules — every refactor (also in CLAUDE.md → Refactoring)

1. **Tests before movement.** Every symbol you touch must have a characterization
   test — one that calls it from the outside and asserts on output. No test = run
   `/tdd` first. No exceptions.

2. **Two hats.** Structure and behavior never change in the same commit. Move code.
   Don't fix bugs, rename things, or "clean up while you're here." Different hat,
   different commit.

## Step 0 — Baseline (required before starting)

Confirm everything passes:

- **Unit tests:** `npx vitest run`
- **Type checker:** `npx tsc --noEmit`
- **Linter:** `npm run lint`
- **Build:** `npm run build` (if applicable)

All must pass. If anything is red before you start: stop. Not your problem to introduce.

## Splitting a file into modules → [extract-module.md](extract-module.md)

Read the two rules and Step 0 above. Then open `extract-module.md` — it's your complete guide.
