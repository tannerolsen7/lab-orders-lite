<!-- context-meta
owner: tanner
last-reviewed: 2026-06-17
review-frequency: monthly
drift-signals:
  - a value or north-star claim no longer matches how the project operates
  - a non-negotiable here is contradicted by current practice
-->

# SOUL — Engineering Values and North Star

Read before every task. Keep it current; every agent depends on it.

---

## North star

Build the minimum that solves the problem. Nothing more. Scale effort to what the task warrants — in code, in tokens, in agent spawns.

**Always start work on a feature branch — never commit directly to main.** Run `git checkout -b feat/<slug>` before the first commit. The harness blocks commits and pushes on main/master/develop.

---

## Sub-agent spawn doctrine (R4-D21)

**Spawn a sub-agent ONLY when it buys one of three things a single pass structurally cannot:**

1. **Independence** — a fresh adversary/reviewer with clean context (the 4 lenses, design-grill, verification)
2. **Parallelism** — genuinely separable work with no cross-dependency (N independent items)
3. **Scale** — work too large to hold in one context (you want the conclusion, not the file-dumps)

**Do NOT spawn for:**
- Judgment against material the main context already has (= token bloat, not isolation)
- Interdependent or sequential work (sub-agents can't share context → re-derivation)
- Small or known tasks (setup overhead exceeds the work)

**One-liner: independence, parallelism, or scale — or don't spawn.**

### Two layers of spawn decisions

| Layer | What it is | How it's decided |
|---|---|---|
| Per-task BATTERY | Which agents fire for a given task | Deterministic risk classifier (LOW / MEDIUM / HIGH, R4-D20) |
| AD-HOC spawns | Model decides mid-task to spawn | The doctrine above — independence, parallelism, or scale |

### Governance

TRUST the doctrine + LOG every spawn: count + which of the three justifications.
Tighten the rule only if the logs show over-spawning. ("Measured, not blind.")

---

## Token discipline (R4-D20)

Use what the task warrants — not more, not less.

- A one-liner doesn't need a sub-agent.
- A deep review doesn't need cutting corners.
- Don't hedge on warranted work because it "costs tokens." Don't pad unwarranted work because it looks thorough.

The spawn doctrine is the operational form of this principle.

---

## Destructive operations — hard stop

Before any mutating external call, state:
1. What resource this targets
2. Whether the operation is reversible
3. The explicit user instruction authorizing it

If any of the three is uncertain: **stop and ask.** Treat every credential as root-level access.
Never reuse a credential found in an unrelated file. Never assume a token is scoped.

→ Full protocol: `docs/engineering-system/10-principles.md` § Destructive operation rules

---

## Code discipline

- One behavior per commit. Never batch.
- Write the test first — a test written after is a transcription, not a spec.
- Never commit a failing test or a type error.
- Files over 300 lines: surface as a split candidate before adding to them.
- No `any`, no `@ts-ignore`, no `console.log` outside test files.

→ Anti-rationalization tables: `docs/engineering-system/12-anti-rationalization.md`

---

## What this file is not

It is not the full reference. It is the "why" behind the rules. For detailed mechanics:

| File | Covers |
|---|---|
| `PITFALLS.md` | Real incidents in this codebase — read before touching any affected area |
| `AGENTS.md` | Layer architecture and golden exemplars *(per-project — create when starting a project on this harness)* |
| `docs/TESTING.md` | Confirmed behaviors and test infrastructure *(per-project — create when starting a project on this harness)* |
| `docs/engineering-system/` | Universal engineering canon |
