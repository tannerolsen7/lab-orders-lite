# Sub-agent contract

Template for every sub-agent prompt spawned from this repo. The contract gives an
agent everything it needs in one self-contained brief — no parent conversation
history, no lookups it can skip.

Iterate this file. When a sub-agent run goes wrong, find the section that should
have prevented it and tighten the language.

---

## Required fields

Fill every field. If a field doesn't apply, write `N/A` — never omit it. A missing
field reads as a missing requirement.

### GOAL

One sentence. What outcome does "done" look like? Not "implement X" — "X is wired
to Y, tests green, behavior verified by Z."

### SCOPE

The exact files the agent may create or edit, with absolute paths. Anything outside
this list is out of scope. If the agent thinks another file needs to change, it
must STOP AND SURFACE rather than touch it.

### DECISIONS ALREADY MADE

Resolved decisions relevant to this task. Cite where they were resolved
(AGENTS.md → Resolved decisions, conversation, etc.). The agent must not
re-litigate these.

### REFERENCES

Cite by `file:line` or `file → section`. When you paste a source file's content
into this section, paste a slice, not the whole file — the declaration lines
(functions, classes, types, exports) plus the section headers that show where
each one lives. Build the slice with `scripts/slice-context.sh <file>`. A full
file is mostly body detail the agent does not need to know what the file offers,
and that extra detail lowers output quality and raises cost. Keep the whole file
only when the agent is rewriting it end to end, or for a config or data file the
slicer falls back to whole on its own.

Required reading before the agent writes code:
- Relevant CONTEXT.md sections (domain model, business rules)
- Relevant AGENTS.md sections (responsibilities, layer rules)
- Relevant CLAUDE.md sections
- PITFALLS.md entries that apply to the affected area
- Relevant design docs (`docs/design/tokens.md`, `docs/design/components.md`)
- Any Zod schema or data function the work depends on
- Confirmed behaviors in docs/TESTING.md for the affected area
- Relevant docs/solutions/ entries

### TDD REQUIREMENT

Only applies if the agent is creating a new behavior. State explicitly:
"TDD required" or "TDD N/A (no new behaviors)."
If TDD required: confirmed behavior in TESTING.md before any code.

### PIPELINE REQUIREMENT

State which pipeline tier runs at end of task:
- `/cr` for all tasks
- `/cr-security` additionally if touching auth, permissions/access policies, or the data boundary

The agent runs the pipeline in its own context and reports MUST FIX items
in its summary.

### BRANCH

Worktree branch name. Use conventional-commit prefixes: `feat/<task-slug>` for
new features, `fix/<task-slug>` for bug fixes, `chore/<task-slug>` for
maintenance. `/queue` tasks always use `feat/<task-slug>` — the slug comes from
the task title, lowercased and hyphenated. The agent commits with
conventional-commit format. Does not push.

### PARALLEL CANDIDATES

Which parts of this work can run simultaneously in independent sub-agents?
List them explicitly, or write "None — all steps are sequentially dependent."
Do not default to sequential. If two tasks have no shared dependency, they
must run in parallel.

### STOP AND SURFACE

The agent must stop and return a summary (not guess) if any of these surface:
- An open decision is touched (per AGENTS.md → Open Decisions)
- A domain area not covered by CONTEXT.md is touched
- A migration is needed
- A test fails after best-effort fix (one retry)
- A required dependency is missing (component, schema, env var)
- The task scope appears wrong (much bigger or smaller than briefed)
- Anything in CLAUDE.md → NEVER would need to be violated
- Any destructive or irreversible operation is required

### SUMMARY FORMAT

The agent's final message back must follow this structure exactly. The parent
agent uses this to compose a session-wide summary; missing fields force a
re-spawn.

```
## Result
- Status: done | blocked | failed
- Branch: <branch-name> @ <commit-sha>
- Worktree: <path or "cleaned up">

## Files changed
- <path> — <one-line what changed>

## Decisions made (and why)
- <decision> — <reasoning, citing references>
(If none, write "None — followed brief.")

## Tests
- <count> added, <count> green, <count> red

## Pipeline result
- Tier run: /cr
- MUST FIX: <count, listed below if non-zero>
- SUGGESTIONS: <count> (link to full report)

## Surfaced for human
- <thing the parent / user needs to decide or do>
(If none, write "None.")

## Notes for the next agent
- <anything a downstream agent will need that isn't obvious from the diff>
```

---

## Anti-patterns the agent must avoid

- Resolving an open decision unilaterally instead of stopping
- Editing files outside SCOPE without surfacing
- Reporting "done" when MUST FIX items remain unaddressed
- Skipping the pipeline tier specified in PIPELINE REQUIREMENT
- Using `any`, `// @ts-ignore`, or `as` casts without preceding narrowing
- Mocking the database in tests
- Writing comments that describe what the code does
- Bundling unrelated changes in a single commit
- Any destructive or irreversible operation without explicit same-turn user instruction naming the exact resource

---

## MUST FIX retry policy

When a sub-agent's pipeline reports MUST FIX items:

1. **Stage 1**: re-prompt the original agent. One retry. It still has full
   context of what it built; mechanical fixes are cheap.
2. **Stage 2** (only if Stage 1 still has MUST FIX): spawn a fresh agent with
   no parent context. Hand it the diff + the surviving MUST FIX list. One
   attempt. Fresh framing sometimes catches what the original agent missed.
3. **Stage 3**: surface to the user with a structured summary of what was
   fixed, what survived, and why.

### Bypass retry entirely (surface immediately)

Skip both stages and surface to the user without retry if a MUST FIX item:
- Touches an open decision (per AGENTS.md → Open Decisions)
- Requires a migration or schema change
- Requires architectural redesign rather than a fix
- Would require violating any rule in CLAUDE.md → NEVER
- Points to a bug in PRE-EXISTING code (not new code in the diff)
- Involves a destructive or irreversible operation
