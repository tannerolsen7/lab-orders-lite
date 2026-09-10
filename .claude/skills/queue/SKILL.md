---
name: queue
description: Run multiple independent backlog tasks in parallel worktrees, then push and open PRs for each. Use when the user wants to work on several tasks at once, drain the backlog, or says "run tasks X through Y", "work on all of these", "do these in parallel", "knock out the backlog", "can we queue these up", "batch these tasks", "run the queue-execute workflow", or invokes /queue.
disable-model-invocation: true
---

# /queue — Multi-agent backlog runner

Orchestrates parallel agent work against independent tasks in `TASKS.md`.
Each task gets its own worktree, runs the full feature loop, and surfaces a push-ready
summary. Use this when you want to drain several independent tasks without sequential
hand-offs.

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

**Choosing how to ask.** For a small set of discrete choices — which issues
to run this batch — use `AskUserQuestion`; it renders as clickable options
and already has a built-in escape hatch (the human can always answer "Other"
with free text instead of picking a preset). For anything the human needs to
actually read before deciding — the candidate task list, a results report —
present it as prose or a document; a structured question can't hold that
much content.

This applies to: Step 1's candidate-batch ask ("Which issues should run in
this batch?") and Step 4's results report — the `needsHuman` items and any
blocked/failed task reasons surfaced there.

---

## Step 1 — Identify candidate tasks

`TASKS.md` is a tombstone — Linear is the canonical tracker. Query it directly: `list_issues`
with `team: "Floral-software"`, `project: "event-vendor"`, `state: "Backlog"`, then again with
`state: "Todo"`.

Filter to issues that meet all of:

- Status is `Backlog` or `Todo` right now — not already `In Progress`/`In Review`. This list
  can go stale between when you read it and when you launch the Workflow; the live re-check
  happens automatically in `queue-execute.js`'s Claim phase (Step 3), so treat this filter as
  a first pass, not the final word.
- No existing PR: `scripts/claim-check.sh FLO-N` reports CLEAR for the issue
- Does not touch a shared, high-conflict file as its primary change:
  `CLAUDE.md`, `AGENTS.md` — issues that modify these must be serialized, not parallelized

For each surviving candidate, read the full issue (`get_issue`) — its description maps to
the task object's `description`/`decisions`/`references` fields in Step 3. Determine
`filesAffected` from the issue body if it names specific files; otherwise leave it blank and
let `@explorer` determine it from the issue description.

Issues whose likely `filesAffected` overlap are allowed in the same batch. When two tasks
share a file, the workflow runs them one at a time so they do not edit the same file at the
same time. Each task still branches from `origin/main` by default — sharing a file does not
automatically stack one branch on top of another.

To opt into branch stacking, add `stacksOn: "<slug>"` to a task. That task will branch
from `feat/<slug>` instead of `main`, and its PR will target `feat/<slug>` so the diff
shows only that task's own changes. Add `stacksOn` when task B calls or imports code that
task A writes. Omit it when two tasks happen to edit different parts of the same file but
do not depend on each other's code.

If two tasks have a code dependency but list no shared file, you cannot add `stacksOn` —
the workflow will reject it. Fix: add the shared output file (e.g. the file task A creates
and task B imports) to both tasks' `filesAffected`. That puts them in the same serial group,
and then `stacksOn` will be accepted.

Present the candidates as a numbered list with each issue's FLO-N id, title, and status —
that list is the full context the human needs, so don't make them look anything up first.
Ask the user: "Which issues should run in this batch? Enter numbers, or 'all'." Invite
them to ask about any issue on the list before they answer.

Wait for confirmation before proceeding.

---

## Step 2 — Preflight check

### Design gate (MEDIUM / LARGE / FEATURE tasks)

For each confirmed task, read its TASKS.md entry and check its size/type field:

- **MEDIUM**, **LARGE**, or **FEATURE** tasks (entries with `Size: MEDIUM`, `Size: LARGE`,
  `Size: FEATURE`, `Type: MEDIUM`, `Type: LARGE`, or `Type: FEATURE`) must have a `design:`
  reference in the entry. Example:
  ```
  - [ ] Redesign user dashboard
    Size: LARGE
    design: docs/design/dashboard.md
  ```
  A MEDIUM, LARGE, or FEATURE task without a `design:` line is rejected — stop and tell the user to run
  `/design contract` and add the `design:` reference before queuing it. Rationale: `@spec-writer`
  cannot write a good spec for a large task without a human-validated design; the run wastes
  overnight compute and blocks in the questions.md protocol.

  The workflow enforces this gate automatically — it will throw before creating any worktrees
  if a gated task is missing a `design:` field or if the file at that path does not exist.

- **SMALL**, **BUG**, and **CHORE** tasks skip this check — their scope is narrow enough that
  `@spec-writer` can work from the task description alone.

- If a task has no size/type field, treat it as SMALL and proceed (no `design:` required).

### Tool and environment check

- `scripts/worktree-add.sh` exists and is executable
- `scripts/pr.sh` exists and is executable
- `scripts/prune-branches.sh` exists and is executable (Step 5 post-merge cleanup uses it)
- `gh` is installed (`command -v gh`)
- Any env/credential files this project's tests require exist in the repo root
  (e.g. `.env.local`) — skip this check for projects that need none

If any check fails, surface the missing prerequisite and stop. Do not proceed with
a partial setup — a worktree missing a required env file will fail integration tests.

---

## Step 3 — Run the Workflow

This step launches the `queue-execute` Workflow, which handles worktree setup, task execution,
and PR opening without requiring you to be present. The Workflow is resumable: if the session
drops or the API times out, relaunch with `resumeFromRunId` and completed tasks return cached
results — no re-running from scratch.

**Build the task list.** For each confirmed task, construct a JSON object:

```json
{
  "slug": "add-rate-limiter",
  "title": "Add rate limiter to the public API",
  "description": "Rate-limiting middleware is wired to all public routes, tests green, behavior in TESTING.md.",
  "filesAffected": "src/middleware/rate-limit.ts, src/routes/api.ts, tests/rate-limit.test.ts",
  "decisions": "N/A",
  "references": "AGENTS.md → Middleware layer; CLAUDE.md → API conventions",
  "tdd": "TDD required",
  "size": "SMALL",
  "design": "",
  "designContract": "",
  "stacksOn": "",
  "linearIssue": "FLO-42"
}
```

Field notes:
- `slug`: `flo-N-<title-slug>` — the lowercased Linear identifier, then the title lowercased with
  spaces → hyphens and special chars stripped (e.g. `flo-42-add-rate-limiter`). Becomes the
  `feat/<slug>` branch name per `.claude/agent-contract.md` → BRANCH convention, which is
  CLAUDE.md's `type/flo-N-slug`. **The id is not optional.** `scripts/claim-pr-check.sh` finds
  work already in flight by looking for the id in remote branch names, so a branch without one is
  invisible to every other pipeline and the ticket gets claimed twice (FLO-371).
- `description`: one sentence stating the done state — not "implement X" but "X is wired to Y, tests green."
- `decisions`: resolved decisions from AGENTS.md → Resolved Decisions, or "N/A"
- `tdd`: "TDD required" unless the task has no new behaviors ("TDD N/A (no new behaviors)")
- `size`: copy the issue's size/type (e.g. "LARGE", "MEDIUM", "SMALL") if it states one. Omit or set to `""` if unstated.
- `design`: copy the `design:` path if the issue references one (e.g. `"docs/features/my-task.md"`). Omit or set to `""` if none. The workflow will reject MEDIUM/LARGE/FEATURE tasks where this field is missing or points to a file that doesn't exist.
- `designContract`: if the Linear issue's body contains a `## Design contract status` section
  naming `/linear-triage`, copy the full `## Interface` / `## Constraints` / `## State`
  sections (verbatim, not summarized) into this field. This is what `description`'s
  one-sentence compression would otherwise silently drop — `/linear-triage` already ran a
  real design-contract interview and grill pass on this ticket, and the `explore`/`spec`/
  `implement` steps need the actual answers, not a summary of them. Omit or set to `""` for
  any ticket without the marker; this is the common case and behavior is unchanged when empty.
- `stacksOn`: the slug of another task in this batch whose branch this task should sit on top of. Leave empty (`""`) for most tasks — they will branch from `origin/main`. Set it only when this task calls or imports code that the other task writes. Both tasks must list at least one shared file in `filesAffected`; if they share no files the workflow will reject the value and explain how to fix it.
- `linearIssue`: the issue's FLO-N id. Required now that tasks are sourced from Linear — the
  Workflow's Claim phase uses it to live-check the issue is still unclaimed and has no PR,
  then sets it to In Progress immediately before setup. Also flows into the PR body's
  `Closes FLO-N` line. A task built with this field blank gets zero collision protection —
  the Claim phase silently skips it (nothing to claim) — so never omit it for a task sourced
  from Step 1.

**Launch the Workflow** with the task array as `args`:

```
Workflow({ scriptPath: ".claude/workflows/queue-execute.js", args: [<task objects>] })
```

The Workflow runs five phases automatically:
1. **Design gate** — rejects MEDIUM/LARGE/FEATURE tasks missing a `design:` reference, before
   anything else runs. Deliberately ordered first: it only validates the task objects
   themselves, so a bad batch fails immediately instead of after Claim has already marked an
   issue In Progress with nothing to release it.
2. **Claim** — for each task with a `linearIssue`, live-checks the issue is still
   Backlog/Todo and has no existing PR, then sets it to In Progress. Tasks that fail this
   check (already claimed, or a PR already exists) are dropped from the batch before any
   worktree is created — this is the mechanism that prevents a `/queue` run from silently
   duplicating work another session already started or shipped. It narrows that race, not
   closes it: the check-then-claim isn't atomic, so two `/queue` runs claiming the same issue
   within seconds of each other could still both succeed. Also depends on the Linear MCP
   connector being reachable from the sub-agent — confirmed to work for a `/queue` you run
   interactively; a genuinely unattended trigger (e.g. `/schedule`) is the narrower residual
   risk, and fails safe (the task gets dropped, not silently treated as claimed) if it can't
   reach Linear at all.
3. **Setup** — creates a `feat/<slug>` worktree per surviving task (idempotent: safe on resume)
4. **Execute** — calls `@explorer`, `@spec-writer`, `@implementer`, the four review lenses,
   `@security-reviewer`, and `@doc-updater` directly, per task, each in its own clean turn —
   `preflight → explore → spec → implement → reviewLoop → triage → securityReview → compound →
   finish`. No nested `@task-runner` call: that used to spawn one agent with no Task tool of
   its own, so it silently self-reviewed instead of getting independent review (FLO-137).
5. **Push** — pushes branches and opens PRs for tasks with a valid `.cr-ok` sentinel

Push is automatic for any task where `finish` wrote `.cr-ok` — the sentinel means the four
review lenses and (when triggered) `@security-reviewer` ran clean. Tasks that are blocked or
failed are excluded automatically. If a task ends blocked or failed, its Linear claim is
released (sets the issue back to Todo) so it can be re-queued rather than sitting falsely
"In Progress" forever.

**Resuming a failed run:** if the Workflow stops mid-run, relaunch with the run ID it reported:
```
Workflow({ scriptPath: ".claude/workflows/queue-execute.js", resumeFromRunId: "wf_<id>" })
```
Completed agent calls return instantly from cache; only the remaining calls/tasks re-execute.

---

## Step 4 — Report results

After the Workflow completes, it returns a structured summary — one entry per task **submitted**,
in submission order, including tasks that never ran. Give every entry its own row:

```
## Queue run complete

| Task | Branch | Status | Tests | PR |
|------|--------|--------|-------|----|
| add-rate-limiter | feat/add-rate-limiter | done | 8/8 | #42 |
| fix-null-check   | feat/fix-null-check   | blocked | — | — |
| catalog-cleanup  | —                     | not run — orphan branch ahead of main, no PR | — | — |
```

Whether a `summary` field is present is the discriminator. An entry **with** a `summary` field
executed — its outcome is `summary.status` (`done`/`blocked`/`skipped`/`failed`); take PR/URL
info from `pushResult` when status is `done`. An entry **without** a `summary` field never
started — it's a Claim-phase drop, `{ slug, status, detail }` with `status` one of
`ALREADY_CLAIMED`, `HAS_PR`, `HAS_ORPHAN_BRANCH`, `FAILED`, `DROPPED_CASCADE`, or `UNACCOUNTED`.
Either way, render every entry as a row in plain words, not as an omission. **Before presenting,
check the table has exactly as many rows as the batch had tasks** — a batch of three that
reports two rows means something was dropped silently, which is the FLO-304 defect this
accounting exists to prevent. `UNACCOUNTED` is never a normal outcome; report it as a bug in
`queue-execute.js`.

`HAS_PR` means a PR was actually found. `HAS_ORPHAN_BRANCH` means only a remote branch ahead of
`main` was found — likely stranded work from a run that died before opening a PR. Say which one it
was; the branch is reported, never deleted, and recovering it is the user's call.

Surface any `surfaceItems` from a `blocked` task's summary and any blocked/failed tasks with
their reason, so the user can act on them. The raw blocker text is written for an agent
audience — translate it into plain words before presenting (what actually went wrong, not the
internal step name), and invite the user to ask for more detail on any task before they act on it.

No `TASKS.md` update needed — completed issues move to Done automatically via the PR's
`Closes FLO-N` line on merge. For blocked/failed issues, confirm the claim was released
(`get_issue` should show `Todo`, not a stuck `In Progress`); if it didn't, set it back
by hand so the issue can be re-queued.

---

## Step 5 — Worktree cleanup (after merge)

Task worktrees persist until their PRs **merge** — you may still need them for review fixes, so do
**not** remove a worktree while its PR is open. Once the PRs merge, run `scripts/prune-branches.sh`: it removes
each merged branch's `.claude/worktrees/<slug>` worktree and then deletes the branch (the worktree
must go first — git refuses to delete a branch that is still checked out in a worktree). Run it after
a merge batch, or rely on the session-start hook (`.claude/hooks/session-start.sh`), which runs it
automatically each session. WIP worktrees (live remote) are
never touched.
