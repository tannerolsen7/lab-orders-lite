---
name: cr
description: |
  Runs a structured multi-agent code review across 9 analytical passes
  plus an adversarial review against the full branch diff. Fixes must-fix items
  automatically and surfaces the rest. Use before merging any branch to main.
  Use when the user says "/cr", "run a code review", "review this branch",
  "pre-merge review", "is this ready to merge", "let's push", "open a PR",
  "ship this", "push this up", "let's merge this", or "prep for a PR". Also
  use when a push is blocked because .cr-ok is missing — that error is the
  direct prompt to run /cr. Run /cr before pr.sh — the push sentinel must exist
  before the PR script will proceed.
---

# /cr — Full pre-merge review
**cr = code review.** Full branch diff review across all commits on the branch, run once before merging to main.

## Anti-rationalization (read before proceeding)

| Rationalization | Rebuttal |
|---|---|
| "This is a small branch, /cr isn't needed" | Branch size doesn't determine what /cr catches. Architectural drift and doc contradictions don't scale with PR size. |
| "The deadline is today, I'll run /cr after" | There is no after merge. Run /cr before. If it finds something, you want to know now. |
| "The change is trivial / already reviewed — I'll write `.cr-ok` directly" | `.cr-ok` certifies that /cr ran at this exact HEAD. Writing it directly means no certificate, regardless of how small the change is. A commit not reviewed by /cr is unreviewed. Run /cr. |

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
anything the human needs to actually read before deciding — a schema, a
mockup, migration SQL, a full report — present it as prose or a document; a
structured question can't hold that much content.

This applies to: the REJECT block (Step 3c), the NEEDS HUMAN blocks (Step 4's
fix-loop ceiling and guard-file routing), and the Disposition report (Step 5).
The pass findings that feed these (TypeScript discipline, architectural
drift, domain safety, etc.) are written for an engineering audience —
translate each one before it reaches the human.

---

## Pre-flight — Merge readiness

Before running any review passes, verify the branch merges cleanly into the remote
base branch. The sentinel certifies a specific sha. If conflicts exist, what
actually merges will differ from what was reviewed — the certificate would be for
a sha that never ships. Resolve conflicts first so the review and the merge cover
the same code. **If conflicts are detected, stop here. Do not run any passes. Do
not write the sentinel.**

1. **Detect the base branch** (network call; `2>/dev/null` handles offline gracefully):
   ```bash
   BASE=$(git remote show origin 2>/dev/null | awk '/HEAD branch/{print $NF}')
   [ -z "$BASE" ] || [ "$BASE" = "(unknown)" ] && BASE="main"
   ```

2. **Fetch the latest state of the base branch** (best-effort — if offline, the check
   runs against the locally-cached remote ref):
   ```bash
   git fetch origin "$BASE" --quiet 2>/dev/null || true
   ```

3. **Find the common ancestor:**
   ```bash
   MERGE_BASE=$(git merge-base HEAD "origin/$BASE" 2>/dev/null || true)
   ```
   If `MERGE_BASE` is empty (no shared history, or `origin/$BASE` does not exist locally),
   skip the merge-tree check and proceed to Step 0 with a one-line warning.

4. **Dry-run the three-way merge:**
   ```bash
   CONFLICTS=$(git merge-tree "$MERGE_BASE" HEAD "origin/$BASE" 2>/dev/null \
     | grep -c '^+<<<<<<< ' || true)
   ```

5. **If `$CONFLICTS` is greater than 0 — attempt auto-merge:**

   ```bash
   git merge "origin/$BASE"
   ```

   - **If the merge succeeds** (exit 0, no conflict markers): proceed to Step 0. Note: this adds a merge commit to the branch.
   - **If the merge fails** (conflict markers remain in working tree): abort (`git merge --abort`) and emit this message, then stop:
     ```
     /cr blocked: branch has merge conflicts with '<BASE>' that need human resolution.

     Run:
       git fetch origin
       git merge origin/<BASE>
     Resolve the conflicts, then re-run /cr.
     ```

6. **If no conflicts** — proceed to Step 0.

---

## Step 0 — Docs-only check

If every changed file in `git diff origin/main...HEAD` is `.md`, under `.claude/`, or non-code config:

Run a single Haiku doc-review pass instead of the full review:
- Check every doc change is accurate relative to the code it describes
- Check for broken references, outdated paths, contradictions with other docs
- Return findings in MUST FIX / Nice to Have format
- Write the sentinel (Step 7 — `bash "$(git rev-parse --show-toplevel)/scripts/cr-ok.sh"`) if no MUST FIX items remain
- Evaluate `/compound` (same criteria as Step 8) — invoke if any condition is met; state "No compound-worthy findings" if none apply

**Skill-structure meta-check** — when the diff includes `.claude/skills/**/*.md`, additionally scan for user-input-wait instructions (`"Wait for user response"`, `"ask the user"`, `"(y/n)"`, `"confirm before proceeding"`, or equivalents). For each match, check position: is the wait at a natural checkpoint (end of a tier, before a destructive/irreversible action, before a sentinel write)? Or does it appear mid-pipeline, blocking later critical-path steps on a non-critical question? A user-input wait that blocks critical-path steps on a non-critical question is a MUST FIX structural bug. Example: `/cr` Step 3b promotion-candidates prompt appears before Step 4 (MUST FIX fixes) — a docs-curation question gates a correctness enforcement step.

If the diff is not docs-only: proceed to Step 1.

---

## Step 1 — Gather context

- Run `git log --oneline origin/main..HEAD`
- Run `git diff origin/main...HEAD` — capture the full output
- Check `.claude/plans/` for any plan file — read it if found
- Note the working directory / worktree path

---

## Step 1b — Token lint (UI diffs only)

If the diff contains any `.css`, `.scss`, `.less`, `.jsx`, `.tsx`, `.vue`, or `.svelte` file, OR any `.html` file inside a component directory (`src/`, `app/`, `pages/`, `components/`, `templates/`):

Run the token linter against the changed files:

```bash
bash "$(git rev-parse --show-toplevel)/scripts/token-lint.sh" --diff
```

This checks for:
- Hardcoded hex colors (`#rgb`, `#rrggbb`) and raw color functions (`rgb()`, `rgba()`, `hsl()`)
- Raw pixel values in spacing properties where design tokens should be used
- Six absolute bans: gradient text, glassmorphism, side-stripe borders, hero-metric template, identical card grids, eyebrow-on-every-section

**If the script returns exit code 1 (errors found):** add a Must Fix item for each error. Warnings are Nice to Have.

**If `docs/design/DESIGN.md` does not exist** (the script exits 0 with "skipped"), note it in the review as an advisory: "No design token file found — token linting skipped. Run @design-synthesizer to define the project's design system."

**If the diff has no UI files:** skip this step entirely.

---

## Step 1c — Spec coverage check (docs/testing/*.md diffs only)

If the diff contains any `docs/testing/*.md` shard file:

Run the spec coverage checker against the diff:

```bash
bash "$(git rev-parse --show-toplevel)/scripts/spec-coverage-check.sh" --diff
```

This checks every behavior bullet touched by the diff for a `<!-- test: <path> -->`
annotation on the line right after it, verifies the referenced file exists, and (for
unit tests only — never `src/data/` integration tests) runs it and checks it passes.
See `docs/specs/spec-coverage-check.md` for the full design.

**If the script returns exit code 1 (violations found):** add a Must Fix item
`[Pspec]` for each `MUST FIX:` line in its output (missing annotation, dangling
reference, or a failing unit test). Add a Nice to Have for each `NICE TO HAVE:`
line (an acknowledged gap — `<!-- test: none -->`).

**If the script returns exit code 2 (setup error):** do not treat this as a Must
Fix — a crashed or misconfigured test run is an environment problem, not a
behavior-level defect. Note it as an advisory and move on; do not block the
review on it.

**If the diff touches no `docs/testing/*.md` file:** skip this step entirely.

---

## Step 2 — Spawn the analytical passes IN PARALLEL

Pass the full diff and plan content directly in each prompt.

Each agent returns findings sorted into three tiers:
- **Must Fix** — bugs, spec drift, broken backwards compat, unsafe failure modes
- **Nice to Have** — improvements that would meaningfully improve the code
- **Something to Think About** — architectural observations, future considerations

### Pass 1 — Correctness & Spec (Sonnet)
Does the code do what the plan says and handle domain constraints?

Review focus:
- Does the implementation match the plan/spec exactly?
- Logic bugs, off-by-one errors, incorrect conditions
- Codebase-specific footguns — read PITFALLS.md before reviewing
- Backwards compat: optional fields guarded with optional chaining?

### Pass 2 — Domain Safety (Sonnet)
Critical failure modes for this codebase. Read PITFALLS.md and AGENTS.md → domain rules first. If the diff
touches the database, auth, or payments, apply this project's database-safety rules (its backend-adapter
safety skill) — do not assume a specific backend.
- Every external/backend/data-store call: what happens on error? Error surfaced or swallowed?
- Mutations: is the ownership/authorization guard present (tenant/user/owner scoping)?
- State transitions: do the correct side effects fire (timestamps, audit events, triggers, notifications)?
- Numeric/money calculations: null/NaN/overflow handled? Integer-exact where money requires it?
- Public/unauthenticated entry points: within the documented security allowlist? No sensitive fields exposed?

### Pass 3 — TypeScript Discipline (Sonnet)
- No implicit `any`
- No non-null assertions without type narrowing
- No `as` casts without narrowing
- Types derived from Zod schemas via z.infer<> — no duplicate hand-written interfaces
- Props as named interfaces, not inline object types
- Discriminated union `switch` statements: `never` type guard on default?
- No loose comparisons where strict equality is required

### Pass 4 — Layer Boundaries (Sonnet)
Read AGENTS.md → Architecture before reviewing. The project's own architecture doc defines the layer names
and the one-way import rule — review against those, not a hardcoded stack.
- No backend / data-store calls outside the project's data-access layer
- No business logic in components, pages, layouts
- UI / server entry points call the data-access layer directly (no bypass)
- Shared data fetched once / cached per the project's data-fetching convention
- Store/state exports are readonly where applicable

### Pass 5 — Readability & Naming (Sonnet)
Write for a tired engineer five years from now.

- Would every changed file be understood without reading the PR description?
- Naming consistency across layers
- Magic numbers or strings should be named constants
- Comments explain WHY — never WHAT
- Is any function doing more than one thing?

### Pass 6 — Test Quality (Sonnet)
- New behavior → test exists
- Transcription test check: if you deleted the implementation and left only the types, would any new test fail? If not, it's a transcription.
- Tests assert behavior, not implementation
- Edge cases covered
- No database mocks
- New behaviors in the per-feature shard (`docs/testing/<slug>.md`)?

### Pass 7 — Doc Drift & Footprint (Haiku)
**Part A — Mechanical (MUST FIX):** console.log outside tests, TODO/FIXME/HACK, commented-out code, unused imports, @ts-ignore, any type, as without narrowing, it.only.

**Part B — Doc drift (MUST FIX if contradiction):**
- Does the diff change a module's responsibility? Does AGENTS.md reflect it?
- Does the diff add/remove a data path? Does AGENTS.md reflect it?
- Does the diff add/change domain vocabulary? Does CONTEXT.md reflect it?
- New confirmed behaviors in docs/testing/<slug>.md (the per-feature shard)?
- Does any sentence in CLAUDE.md, AGENTS.md, or CONTEXT.md now contradict the code?
- Are there any specs in `docs/specs/` whose `status:` is not `complete`? List each one. If the feature it describes is shipped, flag it as MUST FIX with the spec path and current status.

### Pass 8 — Architectural Drift (Sonnet)
Before reviewing the diff, search the codebase for existing patterns relevant to what changed. Then evaluate:
- Does this introduce a second way to do something the codebase already does one way?
- Different approach to state, data fetching, or error handling than what exists?
- Naming inconsistent with existing conventions?
- Dependency that duplicates something already in the codebase?
- Five years from now: will a new engineer find two ways and not know which to follow?

Flag silent new standards as MUST FIX. Inconsistencies as SUGGESTION.

### Pass 9 — Devil's Advocate (Sonnet)
Stress-test the reasoning. For each meaningful choice:
- Why this approach and not the simpler/more obvious one?
- What does this decision make harder in the future?
- Is this abstraction earning its complexity?
- If you had to revert this in six months, how painful?
- Is the scope right, or doing more/less than it should?

Mark unjustified decisions as MUST FIX. Over-engineering as SUGGESTION.

### Governance & Canon (Sonnet)
Check the change against the project's **documented decisions** — not generic best practice
(applicability is judged against what THIS project decided; R4-D14). Read first, skipping any
that don't exist: `docs/adr/` (architecture decisions), the project's Rejected Patterns list
(e.g. `AGENTS.md → Rejected Patterns`), and `PITFALLS.md`.
- Does the diff contradict an accepted ADR, or re-introduce an explicitly rejected pattern?
- Does it repeat a known pitfall recorded in `PITFALLS.md`?
- Does it establish a NEW convention that should be an ADR but isn't recorded yet?

A contradiction with an accepted decision is **MUST FIX** (cite the ADR / entry). An unrecorded
new convention is a SUGGESTION (propose the ADR). If the project has no canon files yet, say so
and skip — never invent a rule the project has not decided.

Tag findings [Pgov].

---

### Pass 10 — Adversarial Review (@reviewer, four parallel lens agents)

Spawn `@reviewer` in implementation mode with the full diff. @reviewer spawns four specialist lens agents in parallel — assumption violation, composition failures, cascade construction, and abuse cases — and consolidates their findings.

This pass runs after all analytical passes but before synthesis. Its findings fold into the Must Fix / Nice to Have / Something to Think About tiers alongside the other passes. High findings from any lens are Must Fix.

Full agent: **Templates → agents/reviewer.md**

Tag findings with [P10-assumption], [P10-composition], [P10-cascade], or [P10-abuse].

---

## Step 3 — Synthesize + update RECURRING-FINDINGS.md

Collect all findings from all passes. Deduplicate overlapping findings.

Produce tiered report:

```
## Must Fix
- [P#] [label] Description
## Nice to Have
- [P#] [label] Description
## Something to Think About
- [P#] [label] Description
```

Tag each item: [P1] correctness · [P2] domain safety · [P3] TS discipline ·
[P4] layers · [P5] readability · [P6] test quality · [P7] doc drift/footprint ·
[P8] architectural drift · [P9] devil's advocate · [Pgov] governance & canon ·
[P10] adversarial review · [Pspec] spec coverage

### Step 3b — Recurring findings update

After producing the tiered report, read `docs/RECURRING-FINDINGS.md`.

For each finding in the report:
- Generate a normalized signature: short, stable, lowercased, hyphen-separated
- Match against Active findings or append new entry with Occurrences: 1
- Update Last seen, increment Occurrences, append file:line (cap at 5)

Identify promotion candidates:
- Auto-flag: any active finding with Occurrences ≥3
- Judgment-flag: any finding assessed as high-impact at lower count

Collect promotion candidates but do NOT surface them here. Proceed to Step 3c.
Present candidates at Step 5 alongside Nice-to-Have and Something to Think About items.

Write the updated `docs/RECURRING-FINDINGS.md` back to disk before proceeding. An in-memory update that is never written is no update.

---

## Step 3c — REJECT check (F7)

Before entering the fix loop, evaluate whether the **REJECT** terminal state applies.

**REJECT when the approach itself is wrong** — not the implementation of a sound approach:
- The Must Fix items collectively indicate the *direction* is wrong: fixing every single one would still leave the PR solving the wrong problem, or require reconceiving the core design.
- The diff contradicts a locked ADR or PITFALLS entry *at its core* — not a peripheral detail, but the central mechanism.
- The scope of changes required to make this approach correct exceeds the scope of the diff itself (patching costs more than starting over).

**REJECT does NOT apply when:**
- There are many Must Fix items on an otherwise sound approach (those get fixed in Step 4 — this is normal).
- A single architectural drift finding exists (MUST FIX, not REJECT).
- Issues can be fixed without reconceiving the fundamental approach.

**If REJECT applies**, emit and halt — do not proceed to Step 4. Write the
Reason in plain words a non-engineer could follow — what's wrong and why
patching it won't work — before naming the technical finding underneath it.
Close with an invitation to ask before acting on the close/redirect
commands:

```
## ⛔ REJECT — approach cannot be fixed in-place

**Reason:** [specific: which decision is contradicted at its core, or why fixing everything
still leaves the approach wrong]

**The right path:**
1. Close this PR:
   `gh pr close $(gh pr view --json number -q .number) --comment "Closing: [reason]. Redoing with [new approach]."`
2. Delete the branch (if no useful commits to salvage):
   `git push origin --delete $(git rev-parse --abbrev-ref HEAD)`
3. [Specific redirect: what the new approach should be and why]

Patching a wrong approach wastes time. Do not fix the Must Fix items listed above.
```

Do not write the sentinel. Stop.

If REJECT does not apply, proceed to Step 4.

---

## Step 4 — Fix Must Fix items (Opus)

If there are Must Fix items, spawn one Opus agent:

> You are a staff engineer. Fix only what's listed. Do not refactor beyond
> the finding. For each fix, note what changed and which finding it resolves.
> Flag as NEEDS HUMAN if the fix requires >~15 lines of new code, an
> architectural decision, or the intended behavior is ambiguous.

**Guard-file escape hatch:** if a Must Fix lives in a guard file (`.claude/hooks/**`,
`.claude/agents/**`, or `settings.json`), do NOT route it to the Opus fix agent — the
`settings.json` deny on `Edit/Write` of those paths blocks that agent too. Route it to NEEDS
HUMAN and surface a paste-ready command; explain in plain words why an agent can't make this
edit itself (these are the files that control what agents are allowed to do — an agent
editing its own permissions is the exact thing the deny rule exists to stop). The human is
the only one allowed to change a guard file. Do not write the sentinel (Step 7) until the
human confirms the fix is applied.

After fixes: run the test suite. **Attempt ceiling: 2 (initial run + one retry).** If still failing after attempt 2 → stop; do NOT attempt a third time. Emit NEEDS HUMAN and halt. State in plain words what's still broken and what was already tried before the raw test output — a human deciding what to do next needs the summary first, the log second:

```
## NEEDS HUMAN — fix-loop ceiling reached (F7)

The test suite is still failing after 2 fix attempts.

**What was fixed:** [list]
**Still failing:** [exact test output]
**Run tests with:** `npm run test`
**Suggested next step:** [what the agent tried, what might be wrong]
```

Ask if anything above needs more explanation before the human digs in.

Do not write the sentinel.

If no Must Fix items, skip and say so.

---

## Step 5 — Triage the rest (fix-now / backlog / drop) + disposition report

Must Fix was handled in Step 4 and is non-negotiable. The Nice-to-Have and Something-to-Think-About
findings are **not** reflexively logged to a backlog, nor punted with "do not implement without
confirmation." **You (the parent agent) decide, per finding,** whether it earns a fix *now* — and if
so, you fix it now. If it doesn't, you decide **backlog** vs **drop**. Then you report the
disposition. Never dump raw findings and walk away; never ask the user to confirm each one (that
friction is what this step removes — you are trusted to exercise taste and show it).

Per-finding decision:
- **Fix now** when it's cheap, safe, in or adjacent to the diff, and clearly worthwhile — e.g. a
  latent fail-open, a one-line correctness/clarity win, hardening a guard you just touched. Fix it
  under the same constraints as the Step 4 agent: don't refactor beyond the finding; route to
  **NEEDS HUMAN** if it needs >~15 new lines, an architectural decision, ambiguous intent, or lives
  in a guard file (`.claude/hooks/**`, `.claude/agents/**`, `settings.json`).
- **Backlog** when it's real but genuinely separate scope, or needs its own design/PR.
- **Drop** when the cost outweighs the value or it's speculative — an explicit, reasoned decision,
  not silence.

Use taste, not a quota — fixing nothing is right if nothing earns it; fixing several is right if they
do. (Appropriate effort, not minimal: don't skip a worthwhile fix to save tokens, don't gold-plate.)

After fixing any "fix now" items, re-run the test suite (one retry on failure, then surface).

### Disposition report (always emit this shape; omit a bucket only if empty)

Passes like TypeScript Discipline or Architectural Drift hand you findings
in engineering shorthand. Before they go in `<what changed>` / `<why>`,
restate each in plain words — what would actually go wrong and why it
mattered enough to fix, backlog, or drop — before the technical label.
Close the report by inviting the human to ask about any line before they
move on.

```
## Disposition
**Fixed — MUST FIX**
- [P#] <what changed> — <which finding it resolved>
**Fixed now — judged worthwhile**
- [P#] <what changed> — <why it earned the fix now>
**Backlogged**
- [P#] <what> — recorded in <where> — <why it's separate scope>
**Dropped / accepted**
- [P#] <what> — <why it isn't worth doing>
```

**Backlog target:** record backlogged items in the project's real backlog — GitHub/GitLab issues if
the repo has a remote (`gh issue create` / `glab issue create`), else append to `BACKLOG.md`.
"Backlogged" means *recorded*, never "mentioned and forgotten." (The harness's standing backlog
mechanism is still being finalized; until then, `BACKLOG.md` is the floor.)

### Promotion candidates (the recurring-findings ratchet)

If Step 3b flagged promotion candidates, act by judgment here — do **not** gate on a y/n:
- **Auto-flagged** (Occurrences ≥3): promote — write the `PITFALLS.md` entry (or the named `/cr`
  pass-prompt) and move it to Promoted in `RECURRING-FINDINGS.md`.
- **Judgment-flagged** (high-impact, lower count): promote if you'd want every future PR checked for
  it; otherwise leave it Active with a one-line reason.

List each promotion in the disposition report (under "Fixed now" — it's a canon change) so it's visible.

Then commit all cr-driven changes before the sentinel. Any commit after the sentinel invalidates it, so this must run before Step 7:
```bash
SLUG=$(bash scripts/derive-slug.sh)
git add -u
git commit -m "fix($SLUG): apply cr findings" || echo "nothing to commit — skipping"
```

---

## Step 6 — Manual test checklist

Specific checklist from the actual diff. Sections: backwards compat, the affected user/feature flows, failure modes, regression risks.

Conclude: "Run through this checklist before opening a PR. Anything that fails is a regression."

---

## Step 7 — Write push sentinel

After the final report + disposition are presented and there are no unresolved Must Fix items, write the sentinel via the helper script:

```bash
bash "$(git rev-parse --show-toplevel)/scripts/cr-ok.sh"
```

`cr-ok.sh` self-resolves `branch:sha`, **refuses a dirty tree** (so the sentinel can't certify a sha that differs from what you'd push), appends an audit line, and **runs no checks** — the un-forgeable gate is the server-side CI re-run (F6); the sentinel is a soft, local, one-shot certificate. Running it as a script (not a Write-tool call) sidesteps the sub-agent path-allowlist friction the old inline `printf > .claude/.cr-ok` hit.

If `cr-ok.sh` refuses because the tree is dirty, commit first, then re-run `/cr` (a new commit changes the sha and would invalidate the sentinel anyway). If the script is somehow unavailable, the fallback is the Write tool to `<repo-root>/.claude/.cr-ok` with exactly `branch:sha` (no trailing newline).

**The sentinel encodes `branch:sha`. Any commit after this point invalidates it — re-run `/cr` before opening a PR.**

Then push, then open the PR (this order matters — `scripts/pr.sh` validates the branch is on the remote before it consumes the sentinel):

```bash
git push -u origin "$(git rev-parse --abbrev-ref HEAD)"
scripts/pr.sh --title "..." --body "..."
```

`pr.sh` polls CI automatically after the PR is created and exits 1 if any check fails. You do not need to run `gh pr view` separately.

**If `pr.sh` exits 1 (CI failed):**

1. Get the failure detail: `gh run view --log-failed`
2. Invoke `/debug` with the PR URL and that failure output. `/debug` investigates the root cause and either applies a fix or surfaces the failure to the human.
3. If `/debug` commits a fix: the `.cr-ok` sentinel is now stale (the new commit changed the sha). Re-run `/cr` to get a new sentinel, push, then run `scripts/pr.sh` again.

Do not merge while CI is red.

---

## Step 8 — Evaluate /compound (required)

After the sentinel is written, evaluate these conditions:

- A non-obvious architectural or process decision was made
- A recurring problem class was solved (future problems of this type should reference this solution)
- A new pattern was established that agents should replicate
- The compound questions surfaced something surprising that got resolved

If **any** condition is true: invoke `/compound` before declaring done. Do not wait to be asked.

If none apply: state explicitly "No compound-worthy findings — no new pattern, no recurring problem solved, no non-obvious decision."

**This evaluation is not optional.** The step always runs; only the outcome varies.
