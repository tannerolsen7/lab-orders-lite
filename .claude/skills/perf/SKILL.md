---
name: perf
description: The system is correct but too slow, too memory-hungry, or too
  expensive to run at scale. Use when a specific operation has been identified
  as a bottleneck and the goal is to make it faster or cheaper without changing
  what it does. Use when the user says "this is slow", "query is taking too long",
  "too many re-renders", "memory is climbing", "this script takes forever",
  "we're hitting timeouts", or names a specific perf target to hit. Do not use
  when the behavior also needs to change (/behavior-change), when the code is
  broken (/hotfix), or when the structure needs cleanup (/refactor). Correct
  behavior is the non-negotiable constraint — perf does not get to change what
  the system does.
---

# /perf — Correct but slow. Measure first. Ship proof.

A performance improvement without a measurement is a guess. A guess that
passes code review and ships to production is now a maintained guess.

This skill enforces three things that no other skill enforces:

1. **A committed baseline artifact before any optimization code.** The
   before-state is a file in the repo. Not a Slack message. Not a mental note.
   A file that can be diffed, reviewed, and referenced when someone asks
   "how much faster is this actually?" six months from now.

2. **A defined target before optimization starts.** "Faster" is not a target.
   A target is a number: P95 latency under 200ms, query time under 50ms,
   zero unnecessary re-renders on state change, heap stable under 512MB.
   Without a target, optimization cannot terminate correctly — you will
   either over-optimize or ship something still unacceptably slow.

3. **A before/after comparison as the merge gate.** The optimization ships
   when the after-measurement hits the target. Not when the code looks faster.
   Not when the profiler flamegraph looks better. When the number hits the
   target.

## What this is not

- Not a license to change behavior — the test suite must pass throughout;
  any test failure during optimization is a bug, not an acceptable side effect
- Not a substitute for /refactor — if the code is structurally unclear and
  slow, fix the structure first via /refactor, then optimize if needed
- Not needed for speculative optimization — only run this when a specific
  measured bottleneck has been identified, not because something "might" be slow
- Not exempt from /design contract — if the optimization requires restructuring
  an interface (changing how a function is called, splitting a query, caching
  at a new layer), run /design contract first

## Anti-rationalization

| Rationalization | Rebuttal |
|---|---|
| "I know it's slow, I don't need to measure" | You know the symptom. You don't know the bottleneck. Profiling the wrong thing is the most common perf mistake. Measure first. |
| "The flamegraph looks better — that's good enough" | A flamegraph is a diagnostic tool, not a pass/fail gate. The metric is the gate. Hit the target. |
| "I'll write the baseline after I see the improvement" | A baseline written after optimization is not a baseline. It's a narrative. The file must exist before the first optimization commit. |
| "A small refactor to make it faster is fine here" | Two hats. If the structure changes, that's /refactor. If the behavior changes, that's /behavior-change. /perf changes neither — only the path through unchanged structure. |
| "The test suite doesn't cover this hot path" | Then write characterization tests for it now, before touching anything. An optimization that breaks untested behavior is undetectable. |
| "We're close enough — ship it" | Close enough to what? Name the target. If you hit it, ship. If you didn't, you're not done. |

---

## Execution contexts

Classify before proceeding. The context determines what measurement tools
are available, what the baseline looks like, and what "behavior unchanged"
means for verification.

| Context | What it is | Measurement tools | Behavior verification |
|---|---|---|---|
| **script** | Python, Node, or shell script run as a process | `time`, `tracemalloc`, `memray`, `cProfile`, `py-spy`, `--inspect` | Output is byte-identical or result-set-equivalent |
| **server-function** | API route, server action, background job, RPC handler | Response timing at the call boundary (middleware timer, Datadog, logging), load test for throughput | API response contract unchanged; integration tests pass |
| **db-query** | SQL query, ORM-generated query, or stored procedure | `EXPLAIN ANALYZE`, query time in DB logs, slow query log | Result set identical (same rows, same columns, same order if ordered) |
| **ui-component** | React, Vue, Svelte, or any other UI component or hook | Framework profiler (React DevTools, Vue DevTools), render count instrumentation, Web Vitals (LCP, INP, CLS), Lighthouse | Component test suite passes; rendered output matches snapshot or visual comparison |
| **data-pipeline** | ETL job, batch processor, data transformation | Wall-clock time for full run, throughput (rows/sec), memory ceiling | Output dataset identical to pre-optimization run |

For ui-component: the measurement tooling varies by framework but the
category and verification contract are the same. Vue DevTools for Vue,
React DevTools for React, browser performance panel for any framework.
The baseline file format is identical regardless of framework.

---

## The loop

```
Entry gate — classify context + name the bottleneck + set the target
	↓
Phase 1 — Baseline artifact
	(measure, commit file, no optimization code exists yet)
	↓
Phase 2 — Behavior lock
	(test suite green; characterization tests written if gap found)
	↓
Phase 3 — Optimize
	(/tdd loop under behavioral equivalence constraint)
	↓
Phase 4 — After measurement
	(re-run with same method; update baseline file; hit target or stop)
	↓
/cr → merge
```

---

## Entry gate — classify before proceeding

```
## Perf classification — [slug]
1. What is the specific bottleneck?
	[one sentence — not "the app is slow"; name the operation, query, component,
	or script that is too slow. Be specific enough that you know exactly what
	to profile.]
2. How was this identified?
	[ ] User-reported slowness with reproduction steps
	[ ] Monitoring alert (Datadog, Sentry, DB slow query log, etc.)
	[ ] Developer observed during testing
	[ ] Profiling run identified this as the hot path
3. Execution context:
	[ ] script
	[ ] server-function
	[ ] db-query
	[ ] ui-component — framework: [React | Vue | Svelte | other: ___]
	[ ] data-pipeline
4. Current measurement (rough — will be formalized in Phase 1):
	[what number exists today, even if informal: "takes ~4s", "P95 ~800ms",
	"re-renders 47 times on keystroke". If no number exists: what will you run
	to get one?]
5. Target:
	Does an existing SLO or perf budget exist for this?
	[ ] Yes — target is: [specific number from SLO]
	[ ] No — set target now using domain heuristics:
		Latency (interactive): < 100ms feels instant, < 300ms feels fast,
			> 1000ms requires a loading indicator
		API response (P95): < 200ms good, < 500ms acceptable, > 1000ms a problem
		DB query: < 50ms good, < 200ms acceptable, > 500ms investigate
		Render: zero unnecessary re-renders; Web Vitals thresholds for LCP/INP
		Script/pipeline: depends on frequency — a nightly job tolerates minutes;
			an on-demand script should complete in seconds
		Target set: [specific number]
6. Does achieving this target require changing the interface
	(how a function is called, query shape, component API, script invocation)?
	[ ] No — internal implementation only → proceed
	[ ] Yes → run /design contract first; come back after the contract is set
```

If Q6 is "Yes": stop here. Run /design contract. The contract is the
input to Phase 1. Do not start measuring before the interface is settled.

---

## Phase 1 — Baseline artifact

The baseline file must exist and be committed before the first optimization
commit. This is a hard rule, not a guideline.

**Measurement method by context:**

| Context | What to run |
|---|---|
| script (timing) | `time python script.py` or `time node script.js` — wall-clock; run 3× and take median |
| script (memory) | `python -m tracemalloc script.py`, `memray run script.py`, or `/usr/bin/time -v` for peak RSS |
| script (CPU profile) | `python -m cProfile -o out.prof script.py` then `python -m pstats out.prof` or `py-spy record` |
| server-function (latency) | Add timing middleware or log at call boundary; run representative request 10× and record P50/P95; or use `curl` with `--write-out` |
| server-function (throughput) | `k6`, `autocannon`, or `wrk` — define the scenario, run it, record req/sec and P95 |
| db-query | `EXPLAIN ANALYZE` output in full; run the query 3× after cache warm and record the slowest execution time |
| ui-component (render) | React DevTools Profiler flamegraph: record the interaction, count render calls, note commit duration; OR `console.count('render')` in dev |
| ui-component (Web Vitals) | Lighthouse CI or `web-vitals` library instrumentation; record LCP, INP, CLS |
| data-pipeline | `time` the full run; add row count logging; record wall-clock + rows/sec |

Human runs the measurement using the method above. Agent cannot run
production profiling — it documents what to run and what to paste.

> **Future:** a `@benchmark-runner` agent will own this step when
> measurement tooling is wired into the project's CI or MCP tooling.
> Until then: human runs, human pastes, agent records.

```
## Perf baseline — [slug]
Context: [script | server-function | db-query | ui-component | data-pipeline]
Framework (ui-component only): [React | Vue | Svelte | other]
Bottleneck: [one sentence — what specifically is being measured]
Target: [specific number — from entry gate Q5]
Measurement method:
	[exact command or steps run to produce the measurement]
Raw output:
	[paste the actual output — timing, EXPLAIN ANALYZE, profiler output, etc.]
Derived metric:
	[extract the single number that matters: "P95: 820ms", "render count: 47",
		"query time: 1.2s", "peak heap: 890MB"]
Baseline committed: [ ] yes — commit: [hash]
Optimization code exists: [ ] no (must be false when this file is committed)
## After measurement (filled in Phase 4)
Method: [same as baseline — must be identical]
Raw output: [paste]
Derived metric: [same unit as baseline]
Target hit: [ ] yes  [ ] no — [if no: describe what's left]
```

Commit this file with the message:
`perf(baseline): [slug] — before: [metric]`

No optimization code in this commit. The baseline commit is read-only
evidence. If it is mixed with optimization code, the before/after
comparison is invalid.

---

## Phase 2 — Behavior lock

Before any optimization code:

```
## Behavior lock — [slug]
[ ] Full test suite run: [pass / N failures]
[ ] Test suite covers the operation being optimized:
	[ ] Yes — [name the test file(s) or describe coverage]
	[ ] No — characterization tests required before Phase 3
		Characterization tests written: [describe what they assert]
		Commit: [hash]
[ ] Behavior lock verdict:
	[ ] Locked — test suite passes and covers the hot path; proceed to Phase 3
	[ ] Not locked — [describe what must be fixed first]
```

**Characterization test rule:** If the test suite does not cover the
behavior of the code being optimized, write tests that assert the current
behavior before touching anything. These tests are not aspirational —
they assert what exists now. If the optimization changes what they assert,
that is a behavioral regression, not an expected outcome.

For ui-component context: "covers the operation" means the component
test suite exercises the interaction being optimized (not just a render
check). If it renders but doesn't test the interaction, write an interaction
test before Phase 3.

For db-query context: "covers the operation" means the result set is
asserted somewhere — a query test or integration test that checks the
output, not just that the query runs without error.

---

## Phase 3 — Optimize

Only begins after Phase 1 (baseline committed) and Phase 2 (behavior
lock confirmed) are complete.

```
git checkout -b perf/[slug]
	↓
Identify the bottleneck root cause
	(read the profiler output; locate the hot path; do not optimize
		anything other than the identified bottleneck — scope discipline applies)
	↓
Optimize in the smallest change that addresses the root cause
	↓
Run test suite → must stay green
	(any failure stops work immediately — not rationalized, not deferred)
	↓
Repeat if further optimization is needed
	↓
Phase 4 — After measurement
```

**The scope rule:** Optimization scope is limited to the bottleneck
identified in the entry gate. If profiling reveals a second bottleneck
adjacent to the first: write it to `.claude/backlog-[slug].md` and
continue. Do not expand scope. Two perf problems addressed in one PR
is two sets of before/after measurements required, two baselines to
maintain, and twice the review complexity.

**The behavioral equivalence rule:** At every step, the test suite is
the arbiter of behavioral correctness. If the agent finds itself
arguing that a test failure is "expected because the optimization
changes how things work internally" — stop. Internal implementation
changes must not change observable behavior. That test is telling you
something. Fix it or surface it as a BLOCKING question.

**Common optimization patterns by context (starting points — not prescriptions):**

| Context | Common root causes | Common approaches |
|---|---|---|
| script | Redundant computation in loop, inefficient data structure, blocking I/O | Memoize, use better algorithm, async/batch I/O |
| server-function | N+1 queries, missing cache, synchronous work that can be deferred | Eager load, add cache layer, background queue |
| db-query | Missing index, full table scan, poor join order, N+1 | Add index, rewrite query, use covering index, batch |
| ui-component | Unnecessary re-renders, expensive computation in render, prop drilling causing cascade | `memo`, `useMemo`/`computed`, selector optimization, component split |
| data-pipeline | Row-by-row processing, missing batching, unparallelized I/O | Vectorize, batch writes, parallelize independent stages |

For ui-component: `memo`/`useMemo` in React and `computed`/`shallowRef`
in Vue are different APIs with the same purpose. The approach is
framework-specific; the diagnosis (unnecessary re-computation) is not.

---

## Phase 4 — After measurement

Re-run the measurement using the **exact same method** as Phase 1.
Different method = invalid comparison.

Fill the "After measurement" block in `.claude/perf-baseline-[slug].md`.

```
## Merge gate
Before metric: [from Phase 1]
After metric:  [from Phase 4]
Target:        [from entry gate]
Target hit: [ ] yes → proceed to /cr
	[ ] no  → [two options below]
```

**If target not hit:**

- Option A: Continue optimizing. Return to Phase 3. The PR does not
  merge until the target is hit.
- Option B: Revise the target with a documented reason — if profiling
  revealed the target was set without knowledge of a real constraint
  (e.g., a third-party API that can't be made faster), the target can
  be updated. This requires surfacing to the human with the explanation
  before revising. Revising the target silently to match the result is
  not acceptable.

**If the improvement is within measurement noise** (< 5% delta with
high variance in raw output): the optimization may not have worked or
may not matter. Surface this explicitly rather than claiming improvement.
Run the measurement 5× and report the range.

---

## Pre-/cr gate (perf specific)

Before invoking `/cr`, verify these two conditions manually:

**Gate 1 — Baseline artifact complete:**
File `.claude/perf-baseline-[slug].md` exists with both before and after
measurements filled. Before metric and after metric use identical
measurement methods. Target is named. Target hit verdict is present.
Do not invoke `/cr` with a partial or missing baseline file.

**Gate 2 — Behavioral equivalence confirmed:**
Test suite is green. Any test failures introduced during Phase 3 have
been resolved. If characterization tests were written in Phase 2, they
are still passing. No test was deleted to make the suite green.

The compound questions block (Q1–Q4) is still required. Q3 (least
confident about) is especially relevant for perf — optimization changes
are often confident in the happy path and unclear about edge cases.

---

## Final report format

```
## /perf complete
Bottleneck: <one sentence — what was slow and why>
Context: <execution context>
Branch: perf/<slug>
Baseline file: .claude/perf-baseline-<slug>.md
Before: <metric with unit>
After:  <metric with unit>
Target: <target>
Result: <hit | missed — explain>
Measurement method: <what was run — same for both>
Behavior: <test suite green throughout | characterization tests added: describe>
Scope: <files changed — optimization only; no behavior changes>
Compound questions: <complete>
Merged: <commit hash>
```

---

**No agents required.** @explorer is available if the bottleneck root
cause requires tracing a hot path across 3+ files before optimizing.

> **Future `@benchmark-runner` agent:** When measurement tooling is
> wired into the project (CI benchmark step, Datadog MCP, or a
> project-level benchmark script), a `@benchmark-runner` agent can
> own Phase 1 and Phase 4 — running the measurement automatically and
> writing the baseline file. Until then, Phase 1 and Phase 4 are
> human-run steps with the agent documenting what to run and
> recording the result.

**Spawns:** @explorer (optional, for hot path tracing)
**Feeds:** /cr, /compound
**Creates:** perf baseline artifact, characterization tests (if needed)
**Output lives in:** `.claude/perf-baseline-[slug].md`