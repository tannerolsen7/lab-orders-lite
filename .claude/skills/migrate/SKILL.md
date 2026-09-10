---
name: migrate
description: Moving stored state from one form to another — schema changes,
  data transformations, infrastructure moves, or service migrations. Use when
  the primary artifact is a mutation to the database, file system, or external
  service state, not just a code change. Use when /incident routes a
  data-problem here, or when a feature requires a schema or data change that
  cannot be reversed by a code revert alone. Do not use for pure code changes
  that happen to touch migration files — those go through /feature. Requires
  a confirmed migration plan before any execution.
disable-model-invocation: true
---

# /migrate — Move state safely. Pre-flight first. Execute once.

A migration is not a deploy. A code deploy is atomic — revert the commit
and behavior reverts. A migration is not atomic in the same way. Once rows
are written, once a column is dropped, once a bucket is deleted, the world
has changed independently of what the codebase says. The code can be
reverted; the state change cannot always be undone.

This skill enforces mandatory pre-flight before any execution. The pre-flight
gate is not a checklist to skim — it is the work. Missing any gate means the
execution step does not run.

This skill owns the state-mutation PRs only. Code PRs that expand or contract
around a migration go through /feature normally. This skill produces a
sequencing plan that names which PRs are needed and in what order — it does
not own the /feature PRs.

## What this is not

- Not a shortcut for schema changes that could go through /feature — if the
  change can be reversed by a code revert and touches no stored state, use
  /feature
- Not a substitute for /hotfix when production data is actively corrupted —
  /incident routes data-problem here; if the corruption is active and causing
  immediate user impact, that context travels with the triage doc
- Not a single-PR skill by default — many migrations require expand/contract
  sequencing across multiple PRs
- Not exempt from dry-run — every migration type has a dry-run strategy;
  skipping it is not an option

## Anti-rationalization

| Rationalization | Rebuttal |
|---|---|
| "It's just adding a column, no need for pre-flight" | Adding a NOT NULL column on a hot table acquires a lock that can take down the app. Pre-flight catches this. |
| "I'll take a backup after the migration runs" | The backup must exist before execution. A backup taken after a failed migration cannot restore pre-migration state. |
| "Dry-run passed on staging, production will be fine" | Staging has different row counts. Scale behavior, lock duration, and timeout risk are production-specific. Dry-run on production data estimates this. |
| "The rollback is just reverting the commit" | If users acted on data in its new form, reverting the code leaves the system inconsistent. Rollback must address the state, not just the code. |
| "I'll batch it later if it's slow" | Batching is a pre-flight decision, not a mid-execution improvisation. Decide before you run. |
| "This is a small data fix, I'll just run it manually" | Manual execution with no dry-run, no backup, and no verification is how data loss happens. Run the skill. |

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
   understood (see `~/.claude/CLAUDE.md` → "Communication voice"). "This will
   lock the events table for about 30 seconds while it runs — anyone trying
   to save a proposal during that window will see an error and need to
   retry" beats "ACCESS EXCLUSIVE lock during ALTER TABLE." The bar: could
   the human explain this back to a colleague and answer a follow-up
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

This applies to every human sign-off point below: the Entry gate's Q3
permanent-tier sign-off, Phase 1's pre-flight checklist confirmation, Phase
2's permanent-tier rollback sign-off, Phase 3's dry-run "Proceed"
confirmation, and Phase 5's post-migration sign-off. These are often
irreversible operations — a raw dry-run SQL dump or a lock-risk table is not
a decision the human can act on until it's translated into what actually
happens to the app and its users.

---

## Migration types

Classify before proceeding. The type determines the dry-run strategy,
lock risk, and rollback complexity.

| Type | What it is | Example | Irreversibility risk |
|---|---|---|---|
| **schema** | DDL changes: columns, tables, indexes, constraints, enums | Add column, drop table, rename field | Medium — additive is safe; destructive is permanent |
| **data** | Transforming existing rows without DDL | Backfill column, normalize values, split field | Medium-High — depends on whether original values are preserved |
| **infrastructure** | Storage, environment, deployment config | Bucket reorganization, secrets rotation | Low-High — varies by operation |
| **service** | Moving between third-party providers | Auth provider, payment processor | High — external state often cannot be migrated back |
| **combined** | Schema + data in the same operation | Add column + backfill + add constraint | High — partial completion risk is compounded |

**Combined migrations are the most dangerous.** A failed data migration
mid-stream leaves a schema in a state that may break the running app.
Whenever possible, decompose combined migrations into separate schema and
data PRs with an expand/contract plan.

---

## Irreversibility tiers

Every migration must be assigned a tier before execution.

| Tier | Definition | Examples |
|---|---|---|
| **clean-revert** | A script can restore pre-migration state with no data loss | Add nullable column (drop it to revert) |
| **compensate** | Revert requires a compensation script; some manual work | Backfill with original values preserved in a shadow column |
| **window** | Reversible only within a time window before downstream systems process the data | Behavioral flag change that triggers downstream events |
| **permanent** | Cannot be undone | DROP TABLE with data, service migration with no export |

Tier = **permanent** requires explicit human sign-off before Phase 3.
Tier = **window** requires the window duration documented explicitly.

---

## The loop

```
Entry gate — classify type + irreversibility tier
	↓
Phase 0 — Sequencing plan
	(single PR vs. expand/contract multi-PR; names all PRs in order)
	↓
Phase 1 — Pre-flight checklist
	(backup, lock safety, batch strategy, dry-run strategy)
	↓
Phase 2 — Rollback plan
	(operationally concrete — commands, not intentions)
	↓
	├─ tier = permanent → human sign-off required before Phase 3
	└─ tier = window → window duration documented
	↓
Phase 3 — Dry-run
	(agent runs; human reviews output before proceeding)
	↓
Phase 4 — Execution
	(backup taken immediately before; migration runs; errors monitored)
	↓
Phase 5 — Post-migration verification
	(row counts, spot-checks, constraint validation, smoke test)
	Human signs off — migration complete
```

---

## Entry gate — classify before proceeding

```
## Migration classification — [slug]
1. What is moving?
	[one sentence — what state is changing and how]
2. Migration type:
	[ ] schema
	[ ] data
	[ ] infrastructure
	[ ] service
	[ ] combined — decompose into separate PRs if possible
3. Irreversibility tier:
	[ ] clean-revert
	[ ] compensate — compensation script will be: [describe]
	[ ] window — window duration: [N hours/days; what closes the window]
	[ ] permanent — requires explicit human sign-off
4. Does this migration require code changes that must deploy before or
	after the state change? (expand/contract)
	[ ] No — state change is self-contained
	[ ] Yes — sequencing plan required (Phase 0)
5. Estimated rows or resources affected:
	[number or range — used for batch and timing estimates]
```

If Q4 is "Yes" and the answer is not already known: Phase 0 runs first.
If Q3 is "permanent": surface to human and wait for explicit sign-off
before any phase runs. State plainly what "permanent" means for this
specific migration — what data or state disappears for good and what that
breaks if it turns out to be wrong — before asking for sign-off, and invite
questions before they confirm.

---

## Phase 0 — Sequencing plan

Required when the migration involves code changes that must deploy in
a specific order relative to the state change.

The expand/contract pattern:
- **Expand PR** — code that tolerates both old and new state. Deploys first.
  Goes through /feature. This skill does not own it.
- **Migrate PR** — the state change itself. This skill owns this PR.
- **Contract PR** — code cleanup that removes the old path. Deploys after
  migration verifies clean. Goes through /feature. This skill does not own it.

```
## Sequencing plan — [slug]
PR 1 — Expand [optional; required if app would break during migration]
	What: [code change that makes app tolerate both states]
	Skill: /feature
	Must deploy before: migration
PR 2 — Migrate [this skill]
	What: [the state change]
	Branch: migrate/[slug]
	Dry-run required: yes
PR 3 — Contract [optional; required if expand PR added temporary paths]
	What: [cleanup that removes old path]
	Skill: /feature
	Must deploy after: migration verifies clean
Note: PRs 1 and 3 are /feature PRs. This skill owns PR 2 only.
If migration fails or is rolled back: PR 3 does not run until PR 2 succeeds.
```

---

## Phase 1 — Pre-flight checklist

Agent runs each check. Human confirms all four before Phase 2. Before
asking for that confirmation, summarize what each check found in plain
terms — the lock risk in terms of what a user would see and for how long,
the batch plan in terms of how long the migration will take, not just the
filled-in table — and invite questions before the human confirms.

**Check A — Backup**
```
Backup required: [ ] yes  [ ] no (explain why not)
If yes:
	Who takes it: [human | automated process | specific command]
	When: immediately before Phase 4 execution (not before dry-run)
	How to restore: [specific commands or procedure — not "restore from backup"]
	Backup verification: [how to confirm backup is valid before proceeding]
```

**Check B — Lock safety (schema migrations only)**

Skip for data and infrastructure migrations.

Dangerous DDL operations (acquire ACCESS EXCLUSIVE lock on Postgres):
- Adding a NOT NULL column without a default
- Adding a constraint that must validate existing rows
- Renaming a column or table
- Changing a column type

```
DDL operations in this migration:
	[list each operation]
Lock risk for each:
	[safe (no lock) | brief lock (acceptable) | long lock (requires safe strategy)]
Safe strategy for long-lock operations:
	[ ] Add as nullable first, backfill, then add constraint
	[ ] Use CREATE INDEX CONCURRENTLY
	[ ] Use ALTER TABLE ... SET DEFAULT instead of NOT NULL initially
	[ ] Maintenance window required: [describe]
```

If lock risk is HIGH and no safe strategy exists: write BLOCKING to
`questions.md`. Do not proceed to Phase 2.

**Check C — Batch strategy (data migrations)**

Skip for pure schema and infrastructure migrations.

```
Row count estimate: [N rows]
Batch required: [ ] yes (>10,000 rows)  [ ] no
If yes:
	Batch size: [N rows per batch — start conservative: 1,000]
	Cursor strategy: [field used for cursor pagination, e.g. id > last_id]
	Retry behavior: [what happens if a batch fails mid-stream]
	Progress tracking: [how to confirm how far the migration got if interrupted]
	Estimated total duration at batch size: [calculation]
```

**Check D — Dry-run strategy**

Dry-run means per migration type:

| Type | Dry-run method |
|---|---|
| schema | `BEGIN; [DDL]; ROLLBACK;` — verifies SQL validity without committing. Note: does not simulate lock duration under production load. |
| data | `SELECT` version of the transformation query with `LIMIT 100` — verify transform logic on a sample before running on all rows. Also: run with `COUNT(*)` to confirm row count matches expectation. |
| infrastructure | `terraform plan`, `pulumi preview`, or equivalent — shows what changes without applying. |
| service | No true dry-run possible — test in parallel (shadow traffic or staging with production data snapshot). Document limitations explicitly. |
| combined | Run schema dry-run first, then data dry-run. Do not combine. |

```
Dry-run method for this migration: [describe specifically — not just "dry-run"]
Expected dry-run output: [what success looks like]
Scale note: [dry-run does not prove production timing — estimated duration
	under production load based on row count and batch size]
```

---

## Phase 2 — Rollback plan

Required before any code is written or executed. Operationally concrete —
not intentions, not "restore from backup".

```
## Rollback plan — [slug]
Irreversibility tier: [clean-revert | compensate | window | permanent]
1. Is a code revert sufficient to restore correct behavior?
	[ ] Yes — code revert restores behavior; state change is compatible
	[ ] No — [describe what state would be inconsistent after code revert]
2. Rollback procedure (specific commands):
	Step 1: [exact command or action]
	Step 2: [exact command or action]
	[...]
	Note: if tier = compensate, the compensation script is: [path or inline]
3. If tier = window:
	Window closes when: [specific event or time]
	After window closes: rollback requires [describe increased complexity]
4. If tier = permanent:
	Rollback is not possible. Confirmed by: [human name/handle]
	Mitigation if migration fails mid-stream: [describe]
5. What is the procedure if the migration fails at 50% completion?
	[describe — what state is the system in, what is the recovery path]
```

Tier = **permanent** requires human explicit sign-off before Phase 3. Before
asking for it, state plainly what happens if this migration fails halfway
through — what state the app is left in, what a user would experience, and
that there is no undo — and invite questions before they sign off:
```
Sign-off: [ ] [handle] confirms this migration is permanent and
	has reviewed the mid-stream failure recovery plan.
```

---

## Phase 3 — Dry-run

Agent runs the dry-run using the strategy from Phase 1 Check D.
Human reviews output before Phase 4 proceeds.

```
## Dry-run results — [slug]
Method used: [what was run]
Output:
	[paste or describe the dry-run output]
Row count / resources affected: [actual count from dry-run]
Matches expectation: [ ] yes  [ ] no — [describe discrepancy]
Scale estimate:
	Estimated duration at production row count: [calculation]
	Lock window estimate (schema): [estimated duration]
Dry-run verdict:
	[ ] Proceed — output matches expectation, scale estimate acceptable
	[ ] Stop — [describe what was found; write BLOCKING to questions.md]
```

Human confirms "Proceed" before Phase 4 runs. This is a hard gate.
No silent auto-proceed from dry-run to execution. Before asking for
"Proceed," translate the raw dry-run output and scale estimate into what
will actually happen when this runs for real — how long it takes, what (if
anything) users will notice — and invite questions before they confirm.

---

## Phase 4 — Execution

```
git checkout -b migrate/[slug]
	↓
Backup taken immediately (per Phase 1 Check A procedure)
Backup verification confirmed
	↓
Migration executes
	(batched if batch strategy required; cursor tracked per batch)
	↓
Monitor for errors mid-stream:
	— Any batch failure: stop immediately, do not continue
	— Record: how many rows processed, last successful cursor value
	— Surface error to human before any retry
	↓
Migration completes
	↓
Phase 5 — Verification
```

**If migration fails mid-stream:**
1. Stop immediately. Do not retry automatically.
2. Record progress state (rows processed, last cursor, error).
3. Write BLOCKING to `questions.md` with the state.
4. Human decides: resume from cursor, rollback, or investigate.

**The mid-stream failure scenario must have been answered in Phase 2.**
If Phase 2 did not answer "what happens at 50%", stop before executing
and complete the rollback plan.

---

## Phase 5 — Post-migration verification

Required before the migration PR is considered complete.

```
## Post-migration verification — [slug]
Row count check:
	Expected: [N rows affected]
	Actual: [run COUNT(*) or equivalent]
	Match: [ ] yes  [ ] no
Spot-check sample:
	Query: [SELECT * FROM table WHERE ... LIMIT 10]
	Expected: [describe what transformed rows should look like]
	Actual: [paste or describe result]
	Match: [ ] yes  [ ] no
Constraint validation:
	[ ] All constraints valid (no violations introduced)
	[ ] Check specific constraint: [describe]
App smoke test:
	[ ] Core flows verified against migrated data
	[ ] No errors in logs post-migration
	[ ] [Any migration-specific behavior to verify]
Verification verdict:
	[ ] Clean — all checks pass; migration complete
	[ ] Issues found — [describe; do not merge until resolved]
```

Human signs off on verification verdict before merge. Before asking for
that sign-off, state plainly what was checked and what it confirms — e.g.
"the row counts match and a sample of 10 migrated rows looks right" — not
just the filled-in checklist, and invite questions before they sign off.

---

## Final report format

```
## /migrate complete
Type: [schema | data | infrastructure | service | combined]
Migrated: <one sentence — what state changed>
Irreversibility: <tier>
Sequencing: <single PR | expand/contract: N PRs — which PR this is>
Branch: migrate/<slug>
Dry-run: <method used — passed>
Backup: <taken at [timestamp] — verified>
Execution: <rows affected | resources changed>
Lock behavior: <no lock | brief lock | safe strategy used: describe>
Batch: <not required | N batches of M rows>
Verification: <clean | issues found and resolved>
Rollback: <clean-revert: [command] | compensate: [script] | permanent>
Merged: <commit hash>
Next PR: <contract PR via /feature | none>
```

---

**No agents required.** @explorer is available for finding all code paths
that touch the migrating schema if expand/contract scope is unclear.

**Spawns:** @explorer (optional, for callsite discovery before expand PR)
**Feeds:** /feature (expand and contract PRs), /compound (if pattern is non-obvious)
**Creates:** sequencing plan, pre-flight checklist, rollback plan, dry-run results,
post-migration verification
**Output lives in:** `.claude/migrate-[slug].md` (pre-flight artifacts)