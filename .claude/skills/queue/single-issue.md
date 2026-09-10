# /queue — single-issue (non-interactive) path

The unattended agent-pickup routine uses this procedure to run **one** Linear
issue through the same `/queue` pipeline a human runs interactively — with no
candidate list and no confirmation prompt.

This is a sibling to `SKILL.md`, not an edit to it. `SKILL.md` describes the
interactive, multi-task path (present candidates, ask which to run, launch a
batch). This file describes the single-issue path for a caller that already
knows exactly which issue to work — the webhook fire or the schedule backstop
in the agent-pickup pipeline (see `docs/design/agent-pickup-pipeline.md`,
Edge A).

**When to use this.** You were handed exactly one Linear issue identifier
(`FLO-N`) and you are unattended — there is no human in the loop to answer a
prompt. If you are a human running `/queue` interactively, use `SKILL.md`
instead.

---

## Why no code change was needed

`queue-execute.js` is already non-interactive. It accepts a JSON array of task
objects and runs its five phases (Design gate → Claim → Setup → Execute → Push)
with no prompt anywhere. A one-element array is a first-class input — the same
input shape a full batch uses, just with one entry.

The only place the human is asked "which issues should run?" is `SKILL.md`
Step 1 — that question is prose in the skill doc, not a gate inside the
Workflow. Skipping it means simply not running that step: build the one task
object yourself and launch the Workflow directly.

---

## Procedure

### 1. Fetch the issue

Read the issue with the Linear MCP connector: `get_issue` for the `FLO-N` you
were handed. You need its title, description, and size/type (and a `design:`
reference if one exists).

### 2. Build exactly one task object

Construct a single task object using the field rules in `SKILL.md` → Step 3
("Build the task list" — field notes). Do not re-derive the rules here; that
doc is the source of truth for the object's shape. Map the issue's fields
honestly:

- `slug`: `flo-N-<title-slug>` — the lowercased issue identifier, then the
  slugified title (lowercase, spaces → hyphens, strip special characters).
  Becomes the `feat/<slug>` branch name, which is CLAUDE.md's `type/flo-N-slug`.
  The id is not optional: `scripts/claim-pr-check.sh` finds work in flight by
  looking for it in remote branch names (FLO-371).
- `title`: the issue title.
- `description`: **one** sentence stating the done state — "X is wired to Y,
  tests green" — not "implement X".
- `size`: the issue's size/type (`SMALL`, `BUG`, `CHORE`, `MEDIUM`, `LARGE`,
  `FEATURE`) if it states one; `""` if not.
- `design`: the `design:` path from the issue if present; `""` if none.
- `tdd`: `"TDD required"` unless the issue has no new testable behavior.
- `linearIssue`: **`FLO-N`. This is the one hard requirement — see below.**
- `filesAffected`, `decisions`, `references`, `stacksOn`: fill from the issue
  where stated, otherwise leave blank / `"N/A"` / `""` per `SKILL.md`.

### 3. `linearIssue` is mandatory — it is your only duplicate-work protection

The Claim phase inside `queue-execute.js` uses `linearIssue` to live-check the
issue is still Backlog/Todo and has no open PR, then sets it to In Progress
before any worktree is created. A task built with this field blank gets **zero**
collision protection — the Claim phase silently skips it (there is nothing to
claim). Never leave it blank on the single-issue path. With it set, an issue the
webhook and the backstop both fire on is claimed once and dropped the second
time — the shared net that makes overlapping triggers safe.

### 4. Launch the Workflow with `unattended: true`

```
Workflow({
  scriptPath: ".claude/workflows/queue-execute.js",
  args: {
    tasks: [ <the single task object> ],
    unattended: true,
    controlIssue: "FLO-250",
    pauseLabel: "pipeline-paused"
  }
})
```

**`unattended: true` is mandatory here** (FLO-236) — it arms the Pipeline gate,
the pipeline's kill switch. Without it, a paused pipeline would not be
respected. This is different from `args` being a bare array (what `SKILL.md`'s
interactive path uses) — that shape always skips the gate, since a human
running `/queue` themselves is a different risk profile and was never what
this switch is for.

**`controlIssue` and `pauseLabel` are required alongside `unattended: true`** —
`queue-execute.js` throws immediately if either is missing. They're supplied
here, not hardcoded inside the shared engine, so that file stays generic and
usable by any caller; `FLO-250` / `pipeline-paused` are this project's actual
values (see `docs/design/agent-pickup-pipeline-pause-switch.md`).

Do **not** present a candidate list. Do **not** ask for confirmation. You are
unattended — there is no one to answer. The Workflow runs Pipeline gate →
Design gate → Claim → Setup → Execute → Push and opens a PR (or drops the task
at Claim if it was already taken, aborts everything at the Pipeline gate if the
pipeline is paused, or hard-fails at the Design gate — see next).

---

## What can stop a single-issue run

- **Pipeline gate (FLO-236).** Before anything else, the Workflow checks a
  dedicated Linear control issue (`FLO-250`) for a `pipeline-paused` label. If
  present, the entire run aborts — no Design gate, no Claim, nothing. It also
  fails closed (treats it as paused) if that control issue can't be fetched at
  all, rather than guessing it's fine. Either way you get a Slack message and a
  comment on the issue you were handed, so it's never silently dropped. This
  only applies because you passed `unattended: true` above — it never affects
  a human's interactive `/queue` run.
- **Design gate.** `queue-execute.js` rejects a `MEDIUM` / `LARGE` / `FEATURE`
  task that has no `design:` path to a real file — it throws before Claim. So an
  assigned issue that is MEDIUM+ with no design doc hard-fails the batch.
  Auto-pickup therefore works end-to-end today only for **SMALL / BUG / CHORE**
  issues, or MEDIUM+ issues that already carry a `design:` reference. This is a
  real scope boundary, not a bug — see the design doc's Edge A and open
  question Q4.
- **No ticket-type routing yet.** The single-issue path drives the one fixed
  Execute-phase sequence (explore → spec → implement → review) regardless of
  ticket shape. A genuine bug with no confirmed root cause will be built like a
  feature rather than diagnosed (`/debug`'s root-cause-first process is
  human-triggered only). Until real routing exists, only assign
  already-well-specified, feature-shaped work — see the design doc's Edge A
  "Known limitation".

---

## Relationship to the routine prompt

The unattended routine's own prompt (`docs/routines/agent-pickup-routine-prompt.md`)
tells the routine to follow this file. This file is the procedure; that prompt
is the caller. Keep the two in sync if either changes.
