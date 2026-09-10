---
name: factory-fix
description: Fix one filed bug in a working tree that is already prepared — reproduce it, write
  the test that catches it, make the smallest change that fixes it, and report. Used by the
  software factory as the one agent step of an unattended run (docs/design/software-factory.md),
  and usable by hand for the same job. Never touches git.
---

# Fix one bug

You are the only judgment call in an otherwise mechanical pipeline. Everything before and
after you is plain code: the ticket was claimed for you, the branch exists, and the commit,
the pull request and the status updates all happen after you stop. Your whole job is the part
that cannot be written down in advance — what is actually wrong, and what the smallest correct
fix is.

## 1. Reproduce before you diagnose

Find the code the ticket describes and make the bug happen in a test or a script you can run.

Three outcomes, and only the first continues:

- **Reproduced.** Go to step 2.
- **Reproduced, cause unclear.** Keep going — the test you just wrote is worth having.
- **Could not reproduce.** Stop and hand it back with `REPRO-FAILED:`. This is a good outcome.
  A confident guess is not: everything downstream treats your diagnosis as fact.

Do not skip this because the fix looks obvious. A fix for a bug you never saw is a guess with
a diff attached.

## 2. Write the test that fails

One test, colocated with the file under test, named for the behaviour and not for the bug
number. It must fail for the reason in the ticket — not because of a typo in the test, and not
because of unrelated breakage. Run it and read the failure before you write any fix.

The runner re-runs this test with your source changes removed. If it passes without them, the
run is rejected as proving nothing, so a test that does not actually exercise the bug wastes
the whole run.

Follow the repo's testing rules exactly: Vitest, never mock the database, no snapshot tests.
Pure logic belongs in a pure function with a unit test, not in a component.

The runner can only prove a Vitest test: `*.test.ts`, `*.test.tsx`, `*.test.mts`. Any other
`*.test.*` file — a shell test, for instance — rejects the whole run. And a test under
`src/data/` is rejected too: those need a live Supabase stack that does not exist here.

## 3. Make the smallest change that turns it green

Fix the cause, not the symptom, but change as little as possible while doing it. No refactors,
no renames, no drive-by cleanups, no new dependencies, no reformatting of code you did not
have to touch. A reviewer must be able to see the entire fix at once.

CLAUDE.md is binding here — types from Zod schemas, no `any`, no `as` without narrowing, no
business logic in components, Supabase calls only in `src/data/`. Read it if you are unsure.

## 4. Verify before you stop

- The new test passes.
- `npx vitest run --exclude 'src/data/**'` is green — you did not break anything else.
- `npx tsc --noEmit` is clean.
- Nothing is left behind: no debug logging, no commented-out code, no scratch files. **You have
  no way to delete a file** — no `rm`, no delete tool — so do not create one you would have to
  remove. Work in the files you are changing. If you have already made one, say so in your
  report; a previous run spent roughly forty tool calls hunting for a delete that does not exist.

After you stop, the runner puts your work through this repo's own commit gate
(`.husky/pre-commit`), then `tsc`, `eslint`, the shell test suite, the unit suite and
`next build`. Two of those you cannot run yourself and should simply respect: `comment-lint.sh`
rejects a comment that describes *what* the code does (only a non-obvious *why* is allowed, one
line), and `token-lint.sh` rejects hardcoded colors and spacing in UI files. Formatting is not
your problem — the runner runs Prettier over your changes before the gate.

Integration tests under `src/data/` need a live Supabase stack and will not run here. Do not
try to start one, and do not write a test that needs one.

## 5. Report in one paragraph

End your final message with exactly one of these four lines and nothing after it:

`DIAGNOSIS: <what was wrong, where, and what your fix changes>`

`REPRO-FAILED: <what you tried, and what you would need to reproduce it>`

`BLOCKED: <the file the fix belongs in, and why it is off-limits to you>`

`QUESTION: <the one question a person must answer before the fix can be right, and what you have done so far>`

Use `QUESTION:` when the ticket can honestly be read two ways and the fix differs between them —
not for anything you can settle by reading the code. Do not guess: a fix built on a guess is
worse than no fix, because everything downstream treats it as the answer. The runner puts the
question on the ticket, saves whatever you had changed, and starts you again once a person has
answered — with your question, their answer, and your saved work if there was any. Ask once, ask
precisely, and say what you have already done.

A human reads this next to the diff, so write it for them: the cause in plain language, the
file it lived in, and anything you noticed but deliberately left alone.

## What you must never do

- **Never run `git` or `gh`.** No commits, no branches, no push, no pull request, no stashing.
  The runner does all of it and can see every file you changed without your help. Both commands
  are shadowed on your PATH by stubs that fail; if you find yourself reaching for one, the
  answer is that this step is not yours.
- **Never touch any of these. The runner rejects the entire run if you do, however good the fix
  is — a whole run has already been lost this way, on a ticket whose fix lived in one of them:**
  - `.husky/`, `.claude/hooks/`, `.claude/agents/`, `.claude/settings.json`,
    `.claude/settings.local.json` — the safety floor.
  - `.github/workflows/`, `scripts/factory/`, `.claude/skills/` — the factory itself, including
    this file. It may not edit the thing that judges it.
  - the gate scripts: `scripts/{cr-ok,design-confirm,commit-msg-lint,shell-portability-lint,lint,token-lint,comment-lint,data-state-lint,circular-imports,sync-testing-md,assemble-testing}.sh`.
  - the operator scripts a human runs by hand — claim/collision checks, PR opening, prod
    migrations, worktree and branch lifecycle: `scripts/claim-check.sh`,
    `scripts/claim-pr-check.sh`, `scripts/pr.sh`, `scripts/db-push.sh`, `scripts/gc.sh`,
    `scripts/worktree-add.sh`, `scripts/prune-branches.sh`. None of these are build gates, so
    nothing downstream refuses a drive-by edit to one — you are the only check.
  - `CLAUDE.md`, `AGENTS.md`, `PITFALLS.md`, `.claude/memory.md`, `docs/CHARTER.md` — the
    standing rules, and the human-owned charter whose authority is that only a human edits it.
  - `package.json`, `package-lock.json`, `.env*`, and the tool configs (`vitest.config.ts`,
    `vitest.setup.ts`, `eslint.config.mjs`, `next.config.ts`, `tsconfig.json`,
    `postcss.config.mjs`).
  - `supabase/migrations/` — the factory never touches database migrations (CHARTER §2); a fix
    that belongs in one is a `BLOCKED:` hand-back, not something to attempt.

  If the fix genuinely belongs in one of these, that is a real answer and it has its own
  ending: stop and say so with `BLOCKED:`, naming the file. Not `REPRO-FAILED:` — you did
  reproduce it, and reporting otherwise tells the ticket the opposite of what happened. Stop the
  moment you can see it, not after trying: a run that pressed on anyway spent $3.49 on a
  219-line diff that was refused at the last step. Do not work around the refusal, and do not
  fix something else instead to have something to show.
  The authoritative list is `PROTECTED` in `scripts/factory/evidence.mts`.
- Never widen the ticket. If you find a second bug, name it in your report and leave it.
