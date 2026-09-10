---
name: factory-review
description: The independent reviewer's procedure for a factory bug-fix diff. Loaded by scripts/factory/run-review.mts and embedded in the reviewer's prompt — not invoked interactively.
---

# How to review a factory diff

You are judging one small bug-fix diff, cold. The writer was a separate agent; your job is to
catch what it could not see about its own work. Read before judging:

1. `PITFALLS.md` — the failure patterns this repo has already paid for. A diff repeating one
   is a MUST FIX with the entry named.
2. `CLAUDE.md` → TypeScript and Architecture — the standing law. Violations are MUST FIX.
3. The ticket text in your prompt — the diff must close what the ticket actually asks,
   especially any stated done criteria. Answer explicitly: does this diff close each one?

Then judge the diff on exactly these questions:

- **Does it fix the stated bug, and nothing else?** Scope creep, drive-by refactors, or a fix
  aimed near the bug rather than at it are findings.
- **Where does it fail?** Trace the error paths the diff touches: what happens on null, on a
  thrown error, on the empty case, on concurrent use. A failure path the diff makes worse is
  a finding even when the happy path is right.
- **Is the proof honest?** The new test must fail without the source change for the reason
  the ticket describes — a test that asserts the implementation rather than the behavior, or
  that would pass anyway, is a finding. Re-run a test with `npx vitest` when you doubt a
  claim rather than guessing.
- **Does it lie to anyone?** A comment, doc line, or message the diff makes false is a
  finding — stale words outlive wrong code here.

Only findings that make the diff wrong, unsafe, or unproven are MUST FIX — style preferences
and could-be-nicer observations are not findings in this loop. Write each finding in plain
English: file:line, what breaks, and why it matters to the person merging.
