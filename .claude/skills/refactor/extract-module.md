# Mode: extract-module

Moving code from one file into one or more new sibling modules.

---

## Before touching any file — write `.claude/refactor-plan.md`

This file is your memory. It survives context resets, agent handoffs, and
interruptions. Do not skip it.

```
# Refactor plan: [source file]
## Modules (extract in this order — leaves of the dependency graph first)
| Module | Single responsibility (one sentence, no "and") | Symbols to move |
|---|---|---|
| new_module_a | [what it does, not what it contains] | fn1, fn2, CONST_A |

## "Green" for this project
- npx vitest run
- npx tsc --noEmit
- npm run lint

## Callsite map
- fn1: imported by [file1, file2, ...]
- fn2: imported by [file3, ...]

## Circular import check
Result: [clean / found X→Y→Z — resolution: ...]

## State
- [ ] new_module_a
- [ ] new_module_b
```

**Naming gate — enforced before creating any file:**
Each module needs a one-sentence responsibility with no conjunctions ("and"/"or").
Rejected names: `utils`, `helpers`, `common`, `shared`, `misc`, `base`.
Can't name it? The split isn't cohesive yet — redesign before proceeding.

---

## Cover the symbols being moved

For each symbol in the plan: does a characterization test exist that calls it
from outside and asserts on its output? This is different from "tests exist for
this file" — a file can have high coverage with zero tests for the specific
functions being moved.

If tests are missing: **stop here. Run `/tdd` to write them. Come back when green.**

---

## Extract loop — one module at a time

Repeat for each `[ ]` module in dependency order (leaves first):

**a. Create the new file**
Write the module docstring and declare its public interface. Do not move code yet.

**b. Move the symbols**
Pure functions first. Stateful code last. Pure move — no logic changes.
Notice a bug? Write it in a note. Fix it later. Different hat.

Update the source file: replace each definition with a re-export (keeps existing
callers working during the transition):

```typescript
export { fn1, fn2 } from './new_module'
```

**c. Run all verifications**
Everything from Step 0 must pass before continuing to the next module.
If verifications fail, triage:
- **Import/path error** → fix it (mechanical)
- **Missing re-export** → add it
- **Logic regression** → REVERT this extraction. Stop. Surface it. You changed behavior during a structural move.

**d. Verify the move is clean**
- [ ] Source file no longer *defines* the moved symbols (only re-exports them)
- [ ] No new circular imports
- [ ] Diff contains zero logic changes — only moves and re-exports

**e. Commit**
```
refactor(<scope>): extract <module_name> from <source_file>

Moved: [fn1, fn2, CONST_A]
Re-exports left in source: yes — transitional, remove after callers updated
Verifications: green
```

**f. Update `.claude/refactor-plan.md`** — mark `[x] module_name`

---

## After all modules are extracted — update callers

1. Update all callers to import from the new module paths (use callsite map)
2. Remove transitional re-exports from the source file
   (or keep them if this is a public library — mark them as the stable API)
3. If the source file is now empty or re-exports only: decide whether to delete
   it or keep it as a stable facade

Run all verifications one final time.

---

## Done checklist

- [ ] All modules in `.claude/refactor-plan.md` marked `[x]`
- [ ] Source file has no remaining definitions of moved symbols
- [ ] All callers updated to new import paths
- [ ] Re-exports removed or explicitly marked as the permanent public API
- [ ] Full verification suite green (clean run, not incremental)
- [ ] Zero logic changes in the branch diff
- [ ] No TODO/FIXME markers without a resolution path
- [ ] Run `/cr`

---

## For 4+ modules: use the `refactor-extractor` sub-agent

Finalize `.claude/refactor-plan.md` completely before spawning.
Spawn one agent per module, **run sequentially** — each depends on the previous
green state. Each agent reads the plan as its source of truth.
