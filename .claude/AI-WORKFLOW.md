# AI Workflow Guide

How to work with AI coding agents under this harness. Project-agnostic: it holds only
universal patterns — each project supplies its own stack, conventions, and adapters.

---

## Prerequisites

Before using scripts that automate push and PR creation:

- **`gh` CLI** — install with `brew install gh && gh auth login`. Required for `scripts/pr.sh`.
- **`npm install`** — run once so the husky git hooks (the pre-commit / pre-push gates) are installed.
- **Project env/credentials** — if this project's tests need env files (e.g. `.env.local`), they must
  exist at the repo root. Each worktree symlinks them in (see below). Projects that need none skip this.

---

## Parallel branch work with git worktrees

When working on multiple features simultaneously, use git worktrees — not multiple checkouts of the
same directory. Each agent window needs its own worktree to avoid branch conflicts. A worktree is a
second working directory pointing at a different branch; the `.git` repo is shared.

### Worktree convention (standardized)

All worktrees live under **`.claude/worktrees/<slug>`** (nested, inside the repo). This single
convention is what the machinery enforces:

- `scripts/worktree-add.sh` and the `WorktreeCreate` hook create worktrees here.
- `block-dangerous-git.sh` only permits `git worktree remove` of a `.claude/worktrees/*` path.
- `.claude/worktrees/` is gitignored (transient).

Do **not** use sibling paths like `../<repo>_<slug>` — the guards won't cover them and you get
un-removable orphans.

### Lifecycle

| Step | Command | When |
|---|---|---|
| 1. Create | `scripts/worktree-add.sh .claude/worktrees/<slug> <branch>` | Starting parallel work — use the script, not bare `git worktree add` |
| 2. Work | (use the new directory normally) | Throughout the feature |
| 3. Open PR | `scripts/pr.sh --title "..." --body "..."` | After /cr passes |
| 4. Merge | (a human merges the PR) | Feature complete |
| 5. Clean up | `git worktree remove .claude/worktrees/<slug>` | After merge — required |
| 6. Delete branch | `git branch -d <branch>` | After merge — confirm merged first: `gh pr view <n> --json state` |
| 7. Prune tracking ref | `git remote prune origin` | After deletion — or the stale `origin/<branch>` ref lingers |

`delete_branch_on_merge=true` removes only the **remote** ref. The **local** branch and the
**remote-tracking** ref persist on disk until explicitly removed — steps 6–7 are not optional.
`scripts/prune-branches.sh` does steps 5–7 in bulk for every `[gone]` branch.

`scripts/worktree-add.sh` symlinks any root env files into the new worktree so integration tests
have their credentials. Bare `git worktree add` skips this — tests that need env will fail.

There is no auto-delete. Worktree directories persist until explicitly removed (`git worktree list`).

### Rules

- One agent window per worktree directory (one session, one branch, one worktree).
- Never run `git checkout` in a shared directory — use worktrees instead.
- Remove the worktree after the PR merges (not before — review fixes may need it). `scripts/prune-branches.sh`
  is the mechanism: it removes each merged branch's worktree and then deletes the branch. Run it
  after a merge (or in a batch / via the stale-branch ritual); unmerged and WIP worktrees are never touched.
- If a new session starts in the repo root and the branch has uncommitted work from a prior session,
  create a worktree before writing any code. Two sessions must never share a branch.

---

## Choosing the right work state

Identify the work state before invoking any skill. When it's not explicit in the user's message,
name it and confirm before proceeding. When it's obvious, proceed directly.

| Signal | Work state | Entry point |
|---|---|---|
| Live breakage, data loss, security event, unexpected behavior | Incident | `/incident` (classify first) |
| Bug confirmed in our code, cause KNOWN, contained blast radius | Hotfix | `/hotfix` |
| Something broken/off/regressed, cause UNKNOWN ("seems off now", "used to work", a screenshot of wrong behavior) | Bug investigation | `/debug` (→ `/feature` Tiny or `/hotfix` with the failing test) |
| New capability, greenfield feature, UI work | Feature | `/feature` (→ `/design` first if scoped) |
| Multiple independent backlog tasks in parallel | Parallel execution | `/queue` |
| Schema change, data backfill, DB restructure | Migration | `/migrate` |
| Changing existing behavior intentionally | Behavior change | `/behavior-change` |
| Correct code that is too slow | Performance | `/perf` |
| Ambiguous between two states | Ambiguous | Name both, ask one question to decide |
| Session resumed mid-task | Resumption | Check `git branch --show-current` and TASKS.md first, then confirm |
| Exploratory ("what should we do") | Exploratory | 2–3 sentences with a recommendation + main tradeoff. No skill invoked. |

> The full universal roster is migrated in Step 0. If a reference points at a skill not yet present
> in this repo, skip it with a one-line note rather than blocking the work.

**Classify AND route — don't just classify.** Naming the work state is not enough: invoke its
entry-point skill instead of proceeding manually. In particular, **a bug whose cause is not yet
known → invoke `/debug` before any manual investigation** — and treat the regression / oblique /
screenshot signals in the table above as bug-cause-unknown signals (they don't read like literal
"this is broken", so they're easy to miss). Skip `/debug` only if the cause is already identified
→ `/feature` (Tiny) or `/hotfix`. (This closes the real-world miss where a "seems off now" report
was classified as a bugfix but never routed to `/debug`.)

Work state can shift during a session (e.g. `/incident` → `/hotfix` after triage). Re-classify at
each transition.

---

## Choosing the right research tool

Not all research needs the same depth. Use the tier that matches the question — not the one that feels safest.

| Tier | When to use | Tool | Cost |
|---|---|---|---|
| **Inline** | Quick factual question — an API signature, a version number, a definition. The answer fits in the current context and doesn't gate a build decision. | WebSearch + model reasoning, inline | Near-zero |
| **/deep-research** | Background knowledge or landscape survey — "what exists", "how is X typically done", "what are the tradeoffs between A and B". Building knowledge, not gating a build decision. | Web fan-out + cited report, runs in background | Moderate |
| **/spike** | Feasibility or approach that gates a build decision — "can we build this on X", "should we use Y for Z", "is this approach viable". The answer determines what you build next. | Full spike pipeline: research → synthesis → adversarial verify → TDD slice | High |

**Decision rule:** Does the answer determine what you build next? If yes → `/spike`. Building knowledge without a specific build decision? → `/deep-research`. Quick and factual? → inline.

---

## Choosing the right orchestration tool

Once you know the work state and entry point, choose how to structure the AI work itself.
Three tools exist; picking the wrong one wastes budget or loses overnight work with no recovery.

| Tool | Use when |
|---|---|
| **Skill** | Human is present and may decide mid-flow. The pipeline pauses for approval, a grill session, or a STOP question. 3–7 linear steps. |
| **Agent tool** | One specialist, one bounded task, one result. Recovery on failure is not needed. |
| **Workflow script** | Batch or list work (5+ items in parallel), overnight or background runs, typed results needed from each agent, or must resume after an API failure (`resumeFromRunId`). |

Quick test: *Will the human be present the whole time?* → Skill. *One specialist, one task?* → Agent tool. *Batch, list, or overnight?* → Workflow script.

Full decision rules, anti-patterns, and harness use cases: [`docs/engineering-system/15-orchestration-patterns.md`](../docs/engineering-system/15-orchestration-patterns.md)

---

## Skills in the harness

The full universal roster is migrated (Step 0). The table lists the most-used entry points; the
complete set is in `.claude/skills/`.

| Skill | When |
|---|---|
| `/queue` | Run multiple independent backlog tasks in parallel worktrees |
| `/feature` | Starting any feature — sized automatically |
| `/tdd` | Implementing a confirmed behavior (red-green-refactor) |
| `/refactor` | Restructuring without changing behavior |
| `/debug` | Investigate an unknown-cause bug → root cause + failing test |
| `/grill-with-docs` | Stress-test a plan against the project's domain language + decisions |
| `/compound` | After a feature that introduced a non-obvious pattern |
| `/cr` | Before pushing — the single pre-merge review gate |
| `/handoff` | Wrapping up / handing off / blocked on the human — emits the continue-from-here block |

`/to-issues` (plus the adopted `/prototype`, `/zoom-out`, `/triage`, `/to-prd`, `/write-a-skill`) are
vendored from Matt Pocock's repo, pinned to a reviewed SHA — see `.claude/skills/VENDORED.md`.
`/simplify` is a Claude Code built-in (no vendoring needed). `/feature` resolves both natively.

---

## Agent context files (conventions, created per project)

| File | What it covers |
|---|---|
| `CLAUDE.md` | Process rules, coding discipline, NEVER list (judgment-only) |
| `AGENTS.md` | Architecture, open decisions, golden exemplars |
| `CONTEXT.md` | Domain model, business rules, the why |
| `.claude/memory.md` | Corrected mistakes — read every session |
| `PITFALLS.md` | Codebase-specific traps — read before writing in any affected area |
| `docs/TESTING.md` | Confirmed behaviors, test infrastructure. Generated from `docs/testing/*.md` — edit shard files, not this file. |
| `docs/RECURRING-FINDINGS.md` | Review findings tracked toward enforcement (the learning ratchet) |

**New here? Read [`docs/engineering-system/`](../docs/engineering-system/README.md)** — the universal engineering
canon (the four layers, file structure, context docs, memory system, principles, anti-rationalization, model-capacity
audit, git discipline, skill ecosystems, and copy-paste templates). It's the "what to build and why" reference behind
the skills/agents/hooks; the patterns are universal, the specifics are per-project.

The harness does not require these to exist; skills create or read them as the project grows.

---

## Commit discipline

The unit of work is one behavior, not one feature.

- One behavior = one spec = one commit.
- Test and implementation go in the same commit.
- Conventional commits: `type(scope): short description`. Body explains *why*, not *what*.
- If a task spans multiple commits, each must leave tests green.

A commit that can't be reviewed in under a minute is too large.
