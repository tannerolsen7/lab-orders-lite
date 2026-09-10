---
name: feature
description: |
  Guides the user through a complete feature development workflow,
  orchestrating discovery, planning, implementation, and review steps sized to
  feature complexity. Use when adding any new capability — net-new or incremental.
  Use when the user says "new feature", "build X", "implement X", "plan a feature",
  "add X", "wire up X to Y", "hook up X", "I want the app to do Y", "can you also
  add", "let's work on [task]", "let's tackle [task]", "get X working", or
  invokes /feature. Also use when /debug has produced a confirmed root cause and
  the user says "fix it", "fix the bug", or "make it work" — that is the Tiny path:
  root cause known, fix is code-only. Enter at Tiny: confirm behavior, record it
  in TESTING.md, implement, review. Skip the design contract and discovery phases.
---

# Feature Pipeline

> **Upstream skills:** `/grill-with-docs` and `/tdd` are vendored in this harness
> (`.claude/skills/`). `/to-issues` and `/simplify` are from Matt Pocock's skills repo
> and are still external — install globally until they are vendored (a later harness phase):
> `npx skills@latest add mattpocock/skills`. A step that calls a not-yet-installed skill
> should be skipped with a one-line note rather than blocking the pipeline.

## Tracer bullets (read before proceeding)

When building features, build a tiny, end-to-end slice of the feature first,
seek feedback, then expand out from there.

Tracer bullets come from The Pragmatic Programmer. When building systems, you
want to write code that gets you feedback as quickly as possible. Tracer bullets
are small slices of functionality that go through all layers of the system,
allowing you to test and validate your approach early. This helps identify
potential issues and ensures the overall architecture is sound before investing
significant time in development.

This is why /tdd enforces vertical slices and this skill enforces sizing.
AI's natural inclination is to build horizontal layers in isolation. You are
here to enforce the opposite.

## Anti-rationalization (read before proceeding)

| Rationalization | Rebuttal |
|---|---|
| "This is too small to need /grill-with-docs" | Tiny features still have hidden assumptions. /grill-with-docs takes 5 minutes. Fixing a wrong assumption takes hours. Run it. |
| "The task is clear, sizing isn't needed" | Sizing exists because tasks are never as clear as they appear. Stating the estimate takes 2 minutes. |
| "I'll write the TESTING.md entry after" | There is no after. The spec is written before the test. The test is written before the code. This is the order. |
| "This is a refactor, not a feature, so /feature doesn't apply" | If it changes behavior or touches more than one file, /feature applies. |
| "The plan is obvious, I don't need approval before writing code" | The plan phase exists because what seems obvious to you may be wrong in ways you haven't considered. It rides the approval packet — it costs no extra round-trip. Get approval. |
| "Drafting the design before the human approves anything wastes work" | Agent drafting is cheap; human round-trips are the scarce resource. If the human rejects a draft at the packet, revising it costs minutes. Three separate waits cost more than one rejected draft. |
| "We're already mid-implementation, /to-issues would interrupt the flow" | The human asking "did you use /to-issues?" is the interrupt. Stop. Run /to-issues. A process question from the human is not rhetorical — it is a direct instruction. Momentum is not a reason to skip a step; it is how steps get skipped. Observed in production. |

---

## Presenting decisions to the human

Every step below that asks the human to size, approve, or confirm something
must do three things. The goal is not to dumb the information down — it's to
make it as easy as possible to read, understand, and decide on:

1. **Full context first.** State what's being decided and why it matters, in
   one message. Don't make the human scroll back through the conversation to
   piece it together.
2. **Plain words — teachable, not dumbed down.** 8th/9th-grade English. If a
   technical term really is the clearest word, say the plain-English effect
   *before* using the term — see `~/.claude/CLAUDE.md` → "Communication
   voice." The bar: could the human explain this back to a colleague and
   answer a follow-up question about it, confidently? If not, simplify the
   language further — never cut real information to get there. This applies
   to the size estimate (Step 0), spec approval, the Plan step, the
   `/to-issues` list, and the final report — every decision point in this
   pipeline.
3. **Leave the door open.** Close with something like "ask me to explain any
   part of this before you decide." A summary the human can't question is a
   rubber stamp, not a decision.

**Choosing how to ask.** For a small set of discrete choices — size, approve
vs. reject, pick one of a few options — use `AskUserQuestion`; it renders as
clickable options and already has a built-in escape hatch (the human can
always answer "Other" with free text instead of picking a preset). For
anything the human needs to actually read before deciding — a spec, an
interface, a full report — present it as prose or a document; a structured
question can't hold that much content.

See `/design contract`'s own "Presenting decisions to the human" section for
the same rule applied to the Design Questions sheet and sign-off gate.

---

## Step -1 — Claim the Linear issue

Before sizing or estimating anything, resolve the Linear side first:

1. If the user's request isn't already tracked as a Linear issue (team `Floral-software`,
   project `event-vendor`), create it now — do not wait until the task is done to log it.
2. If it IS an existing issue, run `scripts/claim-check.sh FLO-N` to check for an existing PR.
   Exit 1 (FOUND) or exit 2 (couldn't confirm) both mean stop — only exit 0 (CLEAR) continues,
   and CLEAR only covers this check, not the issue's own Linear status. If the issue is already
   In Progress/In Review, or a PR already exists, **stop** — do not duplicate the work someone
   else has already claimed.
3. Set the issue's status to In Progress.
4. Note the issue number — it goes in the branch name (`type/flo-N-slug`) and the eventual PR
   body (`Closes FLO-N`), per CLAUDE.md's Linear integration section.

If you stop work on a claimed issue without shipping (blocked, descoped, superseded), set it
back to Todo so the claim doesn't block a future session.

As work progresses, update the issue's checklist/description to reflect what's actually being
built — not only at the very end. This applies throughout every size tier below, not just at
Step -1.

---

## Skip check — pre-completed design contract (`/linear-triage`)

Some tickets already arrive with a design contract built in. `/linear-triage` interviews
through all four of `/design contract`'s questions and runs a real `/grill-with-docs` pass
*before the ticket exists* — look for a `## Design contract status` section in the ticket
body naming `/linear-triage` and a date.

If present, the ticket's Interface, Constraints, and (if included) State sections are
already-confirmed, already-grilled content — not something to re-derive from scratch:

1. **Skip re-interviewing and re-grilling.** For Small, skip Step 3 (Design contract) and
   Step 4 (Grill); for Medium, skip Step 4 (Design) and Step 5 (Grill). Read the existing
   sections directly into the handoff document format (`TASK-TEMPLATE.md`) instead of asking
   the four questions again.
2. **Confirm nothing has changed.** One line to the human: "this ticket already has a design
   contract from triage — still accurate, or has the ask changed since it was filed?" If it's
   changed, fall back to running Design contract + Grill normally for whatever changed —
   don't patch a stale contract silently.
3. **The DB and UI sub-steps still apply as normal.** The skip only covers the four-question
   interview and the general grill pass — schema approval and mockup approval
   (`/design contract`'s Step 3 and Step 4) are conditional on the feature touching the
   database or having a screen, independent of whether triage already ran. `/linear-triage`
   never does schema or mockup work, so if either applies, invoke `/design contract` normally
   for its Step 3 (schema) / Step 4 (mockup) / Step 5 (sentinel) — the triage answers already
   satisfy its Step 1 (Design Questions sheet) and Step 2 (grill), so start from Step 3.
4. **Still write the sentinel.** Once the "What to build" section is confirmed accurate, proceed
   straight to `bash scripts/design-confirm.sh` — the sentinel gates coding the same as any
   other Small+ feature; skipping the interview doesn't skip the gate.

If the marker is absent, run Design contract and Grill as normal — most tickets, including
ones written by hand, won't have it.

---

## Step 0 — Size the feature first

Estimate scope before doing anything else:

| Size | Behaviors | Pipeline |
|---|---|---|
| Tiny | 1 | Confirm → TESTING.md → /tdd → /simplify → /cr |
| Small | 2–5 | /design contract → /grill-with-docs → TESTING.md → plan → /tdd → /simplify → /cr |
| Medium | 6–15 | /design [explore →] contract → /grill-with-docs → TESTING.md → /to-issues → decompose → /tdd → /simplify → /cr |
| Large | 16+ | /design [explore →] contract → /grill-with-docs → TESTING.md → /to-issues → decompose → /feature on each issue |

Before proceeding to any size tier, fill a contract for each sub-agent
this feature will spawn. Use .claude/agent-contract.md as the template.
A contract must exist before a sub-agent is invoked — never spawn without one.

Tell the user your estimate and ask if the size is wrong before proceeding.
Say what the size actually changes for them, not just the label — e.g. "this
is Small, so I'll write up the design first and check it with you before I
touch any code" — and invite them to ask if the size or what it means is
unclear.

After the size is confirmed, create a dedicated worktree for all implementation work:

```bash
bash scripts/worktree-add.sh .claude/worktrees/<slug> feat/<slug>
```

Replace `<slug>` with a short kebab-case name for the feature. All work from this point on runs inside that worktree — never in the main worktree. The main worktree switching branches mid-feature breaks background processes and other concurrent agents.

---

## Step 0.5 — Create a dedicated worktree

Before writing any spec, test, or code, create an isolated git worktree for this
feature. Working in the main worktree risks branch conflicts with concurrent workflow
agents and background hooks that may switch the main worktree's branch mid-session.

Determine the slug for this task from its name — lower-case, hyphens instead of
spaces, e.g. `rate-limiter` for a feature called "Add Rate Limiter". If you are
already on `feat/<slug>`, `bash scripts/derive-slug.sh` reads it from the branch.
Otherwise, set it directly from the task name.

```sh
SLUG=<slug>   # e.g. "rate-limiter" — not "main" or the name of another branch
bash scripts/worktree-add.sh .claude/worktrees/"$SLUG" feat/"$SLUG"
```

Then `cd .claude/worktrees/"$SLUG"` and do all subsequent work from there — every
commit, file edit, and gate check must happen inside the worktree, not in the main
worktree.

The script is idempotent: if the worktree already exists (e.g. on resume), it exits 0
and skips creation.

---

## Implementation gate — design-confirmed sentinel (R4-D4)

**Before any feature code is written, the implement step checks the
`design-confirmed` sentinel and refuses to start if it is absent or stale.** This
is the hard stop that makes the before-coding gate real: `/design contract`'s
before-coding gate (Design Questions sheet → adversarial grill → schema approval
→ mockup approval → human sign-off) writes `.claude/.design-confirmed`; this step
reads it. Same pattern as the `/cr` push sentinel — no sentinel, coding stops.

**Applies to Small+.** Tiny features are exempt (one obvious behavior, no new data
shape, no new screen — they skip `/design contract`). If a "Tiny" task turns out to
touch the database or add a UI screen, it is not Tiny: escalate it to Small and run
the design gate before coding.

At the **top of the implement step** (Small step 8, Medium step 10), run this check
before the first line of code. The sentinel records the `branch:sha` at design
confirmation; the check passes if the current branch matches and the sentinel sha is
an ancestor of HEAD — tolerating intermediate pre-coding commits (spec, plan, grill
docs) without requiring a re-confirmation.

```bash
ROOT=$(git rev-parse --show-toplevel)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "HEAD" ]; then
  echo "feature: detached HEAD — check out a branch before coding." >&2; exit 1
fi
ACTUAL=$(cat "$ROOT/.claude/.design-confirmed" 2>/dev/null || true)
if [ -z "$ACTUAL" ]; then
  echo "feature: no design-confirmed sentinel found. Coding refuses to start." >&2
  echo "         Run /design contract's before-coding gate and get human sign-off first." >&2
  exit 1
fi
SENTINEL_BRANCH="${ACTUAL%%:*}"
SENTINEL_SHA="${ACTUAL##*:}"
if [ "$SENTINEL_BRANCH" != "$BRANCH" ]; then
  echo "feature: design-confirmed sentinel is for branch '${SENTINEL_BRANCH}', currently on '${BRANCH}'." >&2
  echo "         Re-confirm the design on this branch: bash scripts/design-confirm.sh" >&2
  exit 1
fi
if ! git merge-base --is-ancestor "$SENTINEL_SHA" HEAD 2>/dev/null; then
  echo "feature: design-confirmed sentinel (${SENTINEL_SHA}) is not an ancestor of HEAD." >&2
  echo "         Design was confirmed before current branch history — re-run: bash scripts/design-confirm.sh" >&2
  exit 1
fi
```

This check runs **once**, at the very top of the implement step, before the first `/tdd` call. It is not re-evaluated between issues. The `.design-confirmed` sentinel is **not consumed** (unlike `.cr-ok`, which pr.sh deletes after reading) — it persists until overwritten by the next `design-confirm.sh` run.

If the gate fires, **stop and surface the paste-ready remediation** — do not write
code, and do not write the sentinel yourself to get past the gate (writing
`.claude/.design-confirmed` directly to unblock coding is the same violation as
hand-writing `.cr-ok`; a design not confirmed through the gate is unconfirmed). The
fix is to run the design gate: `bash scripts/design-confirm.sh` only after the human
has signed off on the sheet, schema, and mockup.

---

## Tiny (1 behavior)

1. Confirm the expected behavior with the user
   - **If this touches the database or adds a UI screen, it is not Tiny** — escalate to Small and run the design gate. Tiny is exempt from the design-confirmed sentinel only because it has no new data shape and no new screen.
2. Record it in `docs/testing/<slug>.md` under confirmed behaviors before writing any code (run `bash scripts/derive-slug.sh` to get the slug from the current branch). Then commit the spec file before `/tdd` starts — stop if the file is missing:
   ```bash
   bash scripts/spec-commit.sh
   ```
3. Invoke `/tdd` for the single slice (contract required)
4. Invoke `/simplify` on the changed code
5. Invoke `/cr`. If the change touched auth/permissions/data boundary,
   also invoke `/cr-security`.
6. Run `npx tsc --noEmit` — must exit zero
7. Commit with conventional commit format
8. **Checklist** — spawn a fresh agent (not the one that wrote the code) to write `tests/manual-checklist.sh`. See [Manual checklist rule](#manual-checklist-rule) below.
9. Report

---

## Small (2–5 behaviors)

1. **Orient** — read .claude/memory.md, skim docs/solutions/README.md, check AGENTS.md open decisions. Report: any open decisions touching this task? Any relevant solutions already documented?
2. **Research check** — search `docs/research/` for files relevant to this feature's external dependencies. If a relevant file exists, read it before the design contract. If a gap exists and the feature touches an external API or new framework pattern, create a research file in `docs/research/[topic].md` before proceeding.
3. **Design contract** — invoke `/design contract`. If uncertain about the design, run `/design explore` first. Contract output goes into TASK-TEMPLATE.md before proceeding.
4. **Grill** — invoke `/grill-with-docs` (contract required). Confirm scope, surface hidden assumptions, challenge design against `CONTEXT.md`. Doc updates get written here.
5. **Solutions check** — search `docs/solutions/` for relevant patterns before designing the interface.
6. **Spec** — invoke `@spec-writer`. Include the design contract text and a summary of grill
   findings directly in the `@spec-writer` prompt — it cannot read the parent conversation.
   `@spec-writer` writes confirmed behavior entries to `docs/testing/<slug>.md` before touching code.
   Do not write TESTING.md entries inline — `@spec-writer` owns the format and the "never invent
   behaviors" rule. Wait for its summary (entries written + open questions) before proceeding.
   Then commit the spec file before moving to Plan — stop if the file is missing:
   ```bash
   bash scripts/spec-commit.sh
   ```
7. **Plan** — read relevant source files and existing tests. Design the public interface. Get user approval before writing code — explain in plain terms what goes in, what comes back, and what happens when something goes wrong, and invite questions before they approve.
8. **Implement** — **pass the Implementation gate first** (read `.claude/.design-confirmed`; refuse if absent or stale). Then invoke `/tdd` (contract required). Tracer bullet slice first.
9. **Simplify** — invoke `/simplify` on all changed files. Then commit before `/cr`:
   ```bash
   SLUG=$(bash scripts/derive-slug.sh)
   git add -u
   git commit -m "style($SLUG): simplify" || echo "nothing to commit — skipping"
   ```
10. **Review** — invoke `/cr`. If touched auth/permissions/data boundary, also invoke `/cr-security`.
11. **Type check** — `npx tsc --noEmit` must exit zero
12. **Commit** — conventional commit format
13. **Compound questions** — ask the agent:
    - What was the hardest decision you made here?
    - What alternatives did you reject, and why?
    - What are you least confident about?
14. **Compound** — if non-obvious pattern introduced, invoke `/compound`
15. **Checklist** — spawn a fresh agent (not the one that wrote the code) to write `tests/manual-checklist.sh`. See [Manual checklist rule](#manual-checklist-rule) below.
16. **Report**

---

## Medium (6–15 behaviors)

1. **Orient** — read .claude/memory.md, skim docs/solutions/README.md, check AGENTS.md open decisions
2. **Research check** — search `docs/research/` for files relevant to external dependencies. Create a research file if a gap exists before designing anything.
3. **Spec** — create `docs/specs/[task-slug].md` from the Medium+ spec template. Fill the user goal, user journey, edge cases, and DMMT audit section. Set `human-approved: false`. Surface to the human for review and approval before proceeding — state the user goal and journey in plain terms first, and invite them to ask about any edge case before approving. Do not proceed to /design until `human-approved: true`.
4. **Design** — invoke `/design explore` (if uncertain about the approach), then `/design contract`. Contract output goes into TASK-TEMPLATE.md.
5. **Grill** — invoke `/grill-with-docs` (contract required)
6. **Solutions check** — search `docs/solutions/` before designing anything
7. **Spec** — invoke `@spec-writer`. Include the design contract text and a summary of grill
   findings directly in the `@spec-writer` prompt — it cannot read the parent conversation.
   `@spec-writer` writes confirmed behavior entries to `docs/testing/<slug>.md`. Do not write entries
   inline. Wait for its summary before proceeding to decomposition.
   Then commit the spec file before Decompose — stop if the file is missing:
   ```bash
   bash scripts/spec-commit.sh
   ```
8. **Decompose** — invoke `/to-issues`. Apply decomposition checklist: tracer bullet first, label parallel vs. sequential, verify each slice independently shippable.
   **STOP. Do not proceed to Step 9 until the user has confirmed the issue list.** This is a hard gate. Implementation does not begin until /to-issues has run and the output is approved. Present each issue as what it delivers for the user, not just a technical label, and invite questions before asking for confirmation. If the user asks "did you use /to-issues?" mid-implementation, that question is the instruction — stop, run /to-issues, get confirmation, then resume.
   After confirmation: identify which issues are independent. Spawn sub-agents for independent issues simultaneously — do not work sequentially through the list if issues have no shared dependency. State the parallel groupings explicitly before spawning.
9. **Plan** — read CONTEXT.md, AGENTS.md, existing tests. Design interface. Get user approval — explain in plain terms what goes in, what comes back, and what happens when something goes wrong, and invite questions before they approve.
10. **Implement** — **pass the Implementation gate first** (read `.claude/.design-confirmed`; refuse if absent or stale). Then invoke `/tdd` for each issue in order. Tracer bullet slice first. (contract required)
11. **Simplify** — invoke `/simplify` on all changed files. Then commit before `/cr`:
    ```bash
    SLUG=$(bash scripts/derive-slug.sh)
    git add -u
    git commit -m "style($SLUG): simplify" || echo "nothing to commit — skipping"
    ```
12. **Review** — `/cr`, `/cr-security` if triggered
13. **Type check** — `npx tsc --noEmit` must exit zero
14. **Commit**
15. **Compound questions**
16. **Compound** — invoke `/compound` if non-obvious pattern introduced
17. **Checklist** — spawn a fresh agent (not the one that wrote the code) to write `tests/manual-checklist.sh`. See [Manual checklist rule](#manual-checklist-rule) below.
18. **Report**

---

## Large (16+ behaviors)

1. **Research check** — search `docs/research/` for relevant external dependencies. Create research files for any gaps before proceeding.
2. **Spec** — create `docs/specs/[task-slug].md`. Must be human-approved before decomposition begins — state the user goal and journey in plain terms first, and invite questions before approval (same rule as the Medium spec step above).
3. **Grill** — invoke `/grill-with-docs`
4. **Spec** — invoke `@spec-writer`. Include the design contract text and a summary of grill
   findings directly in the `@spec-writer` prompt — it cannot read the parent conversation.
   `@spec-writer` writes confirmed behavior entries to `docs/testing/<slug>.md`. Do not write entries
   inline. Wait for its summary before decomposition.
5. **Decompose** — invoke `/to-issues`. Each issue maps to Small or Medium. The spec.md user journey is the reference for tracing issues back to user intent. Same gate as Medium's Decompose step: present each issue as what it delivers for the user, invite questions, and get explicit confirmation of the list before proceeding.

   **Continuing-ticket exception.** If this Large-tier work is *continuing an already-claimed, already In Progress ticket* (not starting fresh) — e.g. finishing the remaining slices of a ticket that already has its own branch and PR — check that ticket's own history first: has it been tracking its remaining work as a checklist inside its own description (one branch, one PR), rather than spawning separate tracked issues per slice? If so, match that pattern instead of publishing new issues: turn the decomposed slices into a checklist in the existing ticket's description (via a comment/edit, not a new issue), and execute them as sequential in-branch chunks. Still quiz the user on the breakdown first — same gate, different publish target. Reserve `/to-issues`'s normal new-issue publishing for genuinely new tickets or Large-tier work starting from scratch. (Observed FLO-186, 2026-07-23 — a continuing ticket that had already been running this way for two sessions; splitting its last 4 slices into new issues would have fragmented an established one-ticket-one-PR pattern.)
6. **Execute** — run `/feature` on each issue in dependency order (or, under the continuing-ticket exception above, implement each checklist item as a sequential TDD chunk on the existing branch — do not recurse into a fresh `/feature` call per item). Sub-`/feature` calls do **not** run their own per-issue Implementation gate — `.design-confirmed` is gitignored and does not propagate into sub-worktrees. The top-level design (step 3 above) covers all issues; the gate fired once there.

---

## Delegating a TDD slice to a subagent

When Implement hands a slice to an `implementer`/general agent (rather than driving `/tdd`
inline), two things separate a slice that lands clean from one that needs a follow-up fix:

1. **Resolve architecture forks yourself, before delegating — don't let the agent guess.** If
   a design mockup implies more technical scope than the codebase currently supports (e.g. a
   visual that implies a schema change, or touching surfaces outside this slice), that is a
   real fork the human should pick, not something to hand to the subagent as an open question —
   it can't ask a follow-up mid-task. Surface it, get the call, then write the resolved decision
   directly into the subagent's prompt as a constraint ("do not re-derive or second-guess this").
   A prompt that front-loads every already-resolved decision lets the agent move fast and land
   correctly on the first pass, instead of inventing its own answer or stalling on ambiguity.
   (Observed FLO-186 Surface 1, 2026-07-23 — the mockup showed a signature field landing
   mid-paragraph at the cursor; the actual schema only supports plain text with no position
   markers, and the other three surfaces already render signatures after the text, not inline.
   Resolving "keep it after the text, simplify under the hood" with the human before delegating
   avoided the agent either inventing a schema change or building something two other surfaces
   would need to be rebuilt to match.)

2. **A green test suite is not the same as compliance with this repo's MUST rules — check the
   diff, not just the test output.** Read the actual diff for anything that reads like business
   logic sitting in a component (a `.some()`/`.filter()` deciding real state, not just array
   splicing) before accepting a slice as done — this repo's "components are I/O only" rule is a
   MUST, and an agent optimizing for "tests pass" will happily satisfy it with logic in the wrong
   layer. If found, don't just note it — extend the existing tested pure function and repoint the
   component at it, same pass, before moving to the next slice. (Observed FLO-186 Surface 2,
   2026-07-23 — a subagent computed "is this signature stale" inline in the component with an
   untested `.some()`, duplicating what the already-tested `getSignEligibility` pure function
   was one export away from covering.) Same scrutiny applies to any new Tailwind/CSS class name
   introduced by you or an agent — check it against the project's actual token source (e.g.
   `app/globals.css`'s `--color-*` custom properties) before trusting it; an invented class name
   compiles fine and fails completely silently at runtime (no error, just unstyled output).

Save each slice's commit immediately once green — don't batch verified work waiting for a later
"finish up" pass. A long Large-tier session can span a context compaction; anything uncommitted
at that point is at risk, and there's no cost to committing a genuinely green slice early.

---

## Manual checklist rule

After every feature (all size tiers), spawn a **fresh agent** — not the one that wrote the code — to produce the manual verification output. The implementing agent must not write the checklist itself; it hands off context and waits.

**What to pass the fresh agent:**
- The git diff for the branch (`git diff main...HEAD`)
- The confirmed behavior entries from `docs/testing/<slug>.md`
- The path to any existing `tests/manual-checklist.sh` (so it can see the established style)

**What the fresh agent produces:**
- `tests/manual-checklist.sh` — a runnable shell script that checks every behavior it can check automatically. Each item should be one `ok`/`no` assertion (follow the style in any existing checklist). Only include checks that genuinely require running the code or inspecting file state; do not pad with trivial checks.
- A short bulleted list (in its reply, not in the script) for anything it cannot automate — visual confirmation, subjective UX, external service calls, etc.

**Do not commit the script.** It is a one-time verification artifact for the human to run after the feature lands, not a permanent test. If the project already has a permanent test suite entry for the behavior, the checklist item should still exist as a quick sanity check, but the source of truth is the test suite.

---

## Final report format

Fill every slot in plain terms — a fellow engineer should be able to read this
once and know what shipped and what still needs a decision from them. End
with an open invitation to ask about anything above.

```
## /feature complete
Built: <one sentence>
Size: <Tiny | Small | Medium | Large>
Linear: <FLO-N> claimed at start, PR body includes "Closes FLO-N"
Behaviors: <N confirmed behaviors added to docs/testing/<slug>.md>
Tests: <N tests written, what they cover>
Review: <code review ran; N issues found and already fixed>
Commit: <hash and short message>
Security tier: <ran | not required>
Checklist: tests/manual-checklist.sh (run to verify); manual-only steps: <list or "None">
Needs human: <list or "None">

Ask me to explain anything above in more detail.
```

---

## PR splitting (Small+)

Split the feature branch into **2 stacked PRs** for human review. The goal is
reviewable diffs that tell a story — not a single 500-line dump. This also makes
the AI-assisted workflow transparent: the reviewer sees the engineering process
(spec → TDD → UI → review), not just output.

### The split

| PR | Contains | Base branch |
|---|---|---|
| **PR 1 — Foundation** | Spec + service layer + tests | `main` |
| **PR 2 — UI + polish** | Actions, pages, components, /simplify, /cr fixes, checklist | PR 1's branch |

### How to execute

1. After all commits are on `feat/<slug>`, create a branch at the last
   service-layer commit:
   ```bash
   SLUG=$(bash scripts/derive-slug.sh)
   # Find the last service commit (the one before any UI/action commits)
   SERVICE_SHA=$(git log --oneline origin/main..HEAD --reverse | grep -m1 'service\|tests' | tail -1 | awk '{print $1}')
   git branch feat/${SLUG}-service ${SERVICE_SHA}
   ```

2. Push both branches:
   ```bash
   git push -u origin feat/${SLUG}-service feat/${SLUG}
   ```

3. Create PR 1 targeting `main`, PR 2 targeting PR 1's branch:
   ```bash
   gh pr create --head feat/${SLUG}-service --base main --title "..." --body "..." --draft
   gh pr create --head feat/${SLUG} --base feat/${SLUG}-service --title "..." --body "..." --draft
   ```

### PR description rules

- **PR 1** describes the business logic, design decisions, and test coverage.
  Opens with "This is the foundation the UI composes on." Ends with a note that
  PR 2 follows.
- **PR 2** opens with "Stacked on #N — review that first." Describes UI
  decisions and includes a table of code review findings addressed.
- Both end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

### Why this split

- **For the reviewer:** PR 1 is pure logic + tests (~300 lines). Easy to verify
  correctness without UI noise. PR 2 is the composition layer (~400 lines).
  Neither is overwhelming.
- **For the interviewer (take-home context):** the split shows the candidate
  directed the work in stages, not "asked AI to build everything at once."
  The /cr fixes commit in PR 2 shows the review process is real.
- **For AI transparency:** commits within each PR show the TDD and review
  workflow. The structure is honest about the process.

### Tiny features

Tiny features (1 behavior) ship as a single PR — the split adds friction that
isn't worth it for a 50-line change.

---

## Done criteria

- Linear issue claimed (In Progress) before any code was written; PR body includes `Closes FLO-N`
- (Small+) Design was confirmed before coding — `.claude/.design-confirmed` was written via `scripts/design-confirm.sh` and the Implementation gate passed
- All confirmed behaviors in `docs/testing/<slug>.md` (assembled into `docs/TESTING.md` automatically)
- All slices committed (test + implementation in same commit)
- All /to-issues issues closed — via `closes #N` in commit body (auto-closed on merge) or manually if the issue was partially addressed
- `/simplify` has run
- `/cr` clean (and `/cr-security` if security-sensitive code touched)
- CI passed — `scripts/pr.sh` polls checks after PR creation and exits non-zero on failure. If `/debug` commits a fix, re-run `/cr` to get a fresh sentinel, push, and re-run `scripts/pr.sh`.
- `npx tsc --noEmit` exits zero
- `tests/manual-checklist.sh` written by a fresh agent (not the implementation agent); not committed
- Final report delivered
- If non-obvious pattern introduced: `/compound` has run
- If feature changed a documented pattern: affected solution doc updated
- PITFALLS.md checked: if feature revealed new footgun, entry proposed
- Spec sync: if any spec assumption changed during build, TESTING.md and CONTEXT.md updated to reflect what was actually learned

---

## Worktree cleanup (after merge)

If this feature ran in a dedicated worktree (`.claude/worktrees/<slug>`), leave it in place while the
PR is open — review fixes may need it. After the PR **merges**, `scripts/prune-branches.sh` removes the worktree
and deletes the branch (it removes the worktree before the branch, since git won't delete a branch
that is still checked out). Run `prune-branches.sh` after merging, or rely on the session-start hook
(`.claude/hooks/session-start.sh`), which runs it each session. Never remove the worktree before the PR merges.
