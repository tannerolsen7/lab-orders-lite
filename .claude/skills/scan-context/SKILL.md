---
name: scan-context
description: |
  Freshness check for the project's governed context docs. Runs scripts/scan-context.sh,
  which reads the context-meta block on each governed file and reports which are OVERDUE for
  review (a weekly file past 7 days, a monthly file past 30 days since last-reviewed) and which
  required-core files are MISSING a block. Read-only — it surfaces a list and you decide what to
  review. Use when the user says "are the context docs stale", "what needs reviewing", "check
  doc freshness", "is anything overdue", "scan context", or invokes /scan-context. Also run as a
  scheduled freshness ritual — for a project that adopts this harness, fire it via /schedule set
  up during onboarding. This is NOT a contradiction detector: /cr Pass 7 catches drift in files
  that change in a branch; /scan-context catches files that go stale because nothing touches them.
---

## What this does (plain)

Some docs are "governed" — they carry a small `context-meta` block at the top that records when
they were last reviewed and how often they should be. Over time a doc can go stale without anyone
noticing, because nothing in a pull request touches it. This skill runs a script that checks each
governed file's review date against its schedule and tells you which ones are due for a look.

It only reports. It never edits a file and never changes a review date on its own.

---

## Step 1 — Run the scan

```bash
bash scripts/scan-context.sh
```

The script prints one line per governed file and a summary, then exits 0 if everything is fresh or
exits 1 if anything is OVERDUE or MISSING. Each line is one of:

- `OVERDUE  <freq>  <file>  (last-reviewed …, N days ago, limit Nd)` — past its schedule, review it
- `MISSING  -       <file>  (required file has no context-meta block)` — a core file needs a block
- `OK       <freq>  <file>` — fresh, nothing to do

`on-merge` files are shown as `OK (checked every PR)` — they are reviewed on every pull request by
`/cr`, so they are not time-checked here.

---

## Step 2 — Act on the report

For each **OVERDUE** file:
1. Open it and read its `drift-signals` (the block lists what "stale" looks like for that file).
2. Check the file against those signals — do its references still exist, does it still match the code?
3. Fix anything that drifted (or open a task if the fix is big).
4. Only after you have actually reviewed it, update `last-reviewed` to today's date.

For each **MISSING** file: add a `context-meta` block (see the format below). Do this only for the
required-core files the script names — do not add blocks to every skill file.

**Never bump `last-reviewed` to silence the report without doing the review.** The date is a promise
that someone looked. A false date is worse than an overdue one.

---

## The `context-meta` block

Put this at the very top of a governed Markdown file (for a file with YAML frontmatter, put it just
below the closing `---`, never above it):

```markdown
<!-- context-meta
owner: <name>
last-reviewed: YYYY-MM-DD
review-frequency: on-merge | weekly | monthly
drift-signals:
  - file references that no longer exist
  - patterns contradicted by newer solutions entries
-->
```

Frequency tiers:
- `on-merge` — checked on every pull request (e.g. PITFALLS.md, memory.md). Not time-checked here.
- `weekly` — high-churn governance files (e.g. CLAUDE.md, AGENTS.md, CONTEXT.md). Overdue past 7 days.
- `monthly` — files that change slowly (e.g. a skill that opted in). Overdue past 30 days.

---

## How "governed" is decided (two scopes)

- **Freshness (OVERDUE)** applies to **any** file that carries a real block. A skill becomes
  governed by *opting in* — adding a block. This keeps the maintenance surface small.
- **MISSING** is reported **only** for the required-core files: `CLAUDE.md`, `AGENTS.md`,
  `CONTEXT.md`, `PITFALLS.md`, `SOUL.md`, `memory.md`. Skills are never reported MISSING.

A `context-meta` example shown inside a fenced code block (like the one above, in a doc that
*documents* the format) is ignored — only a real block counts.

---

## Running it on a schedule

This skill is a freshness ritual. The cleanest way to fire it on a cadence in a project that adopts
this harness is a `/schedule` cloud routine set up during onboarding — e.g. weekly, "run
`bash scripts/scan-context.sh`; if it exits non-zero, open an issue listing the overdue/missing
files." The exit code (0 fresh, 1 findings) is what the routine keys on. See the onboarding doc for
the wiring. (This harness repo's own memory lives outside the repo, so it runs `/scan-context`
locally on demand rather than via a cloud routine.)

---

## Hard rules

- Read-only. The skill and its script never edit a governed file or change a `last-reviewed` date.
- Only the required-core files are nagged for a missing block. Do not blanket every skill.
- A review date is only updated by a human (or agent) who actually reviewed the file.
