---
name: compound
description: |
  Capture a solved problem as a reusable solution doc in docs/solutions/.
  Use when a non-obvious pattern or approach just became clear and is worth
  preserving so future agents don't have to re-discover it. Use when the user
  says "let's capture this", "document this pattern", "this was tricky, let's
  preserve it", "add this to solutions", or invokes /compound. The natural
  trigger is right after a feature merges or a hard problem is solved — not
  during implementation.
---

# /compound — Capture solved problems

## When to run

After a feature merges when any of these are true:
- A non-obvious architectural decision was made
- A recurring problem class was solved (future problems of this type should
  reference this solution)
- A new pattern was established that agents should replicate
- The compound questions surfaced something surprising that got resolved

Do NOT run for:
- Bug fixes where the fix is obvious in hindsight
- Copy changes, config tweaks, dependency updates
- Anything already fully captured in PITFALLS.md

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

**Choosing how to ask.** For a small set of discrete choices — approve vs.
reject a draft, confirm vs. deny a permission pattern — use `AskUserQuestion`;
it renders as clickable options and already has a built-in escape hatch (the
human can always answer "Other" with free text instead of picking a preset).
For anything the human needs to actually read before deciding — a draft
solution doc, a permission pattern, a full report — present it as prose or a
document; a structured question can't hold that much content.

This applies to: Step 3's draft solution doc review, and Step 8's
permission-allowlist candidates. Step 8 is the higher-stakes one — approving
a pattern there grants the agent unsupervised capability, so its plain-English
explanation must be explicit about what the agent could do with that
permission if things go wrong, not just what the pattern matches syntactically.

---

## Step 1 — Understand what was built

Read:
- The merged PR diff (`git diff main~1..main` or the relevant range)
- The TASK-TEMPLATE.md that initiated the work (at `.claude/TASK-TEMPLATE.md`, if filled)
- The compound question answers if recorded in the task spec
- Any docs/TESTING.md entries added during this feature

---

## Step 2 — Spawn solution extractor (Sonnet)

> You are documenting a solved engineering problem for future reference.
>
> Read the diff and task spec provided. Then produce a solution doc
> using docs/solutions/TEMPLATE.md as the format.
>
> Focus on: what was the actual problem (not the feature — the underlying
> challenge), what approach worked, why it works given this codebase's
> constraints, when to reuse it, when not to.
>
> Be specific — include file paths, function names, and concrete examples.
> A vague solution doc is useless. Do not praise the implementation.
> Do not summarize what was built. Capture what's reusable.

---

## Step 3 — Review the draft

Before the technical detail, summarize in plain terms what the problem was and what
approach solved it — one or two sentences the user can read without opening the diff.
Then present the draft solution doc and ask:
- Is the problem statement accurate?
- Is anything missing that made this non-obvious?
- Are the tags right for future retrieval?

Invite the user to ask for more detail on any part of the draft before answering these
three questions — don't make them answer cold.

Apply corrections before writing.

---

## Step 4 — Write the file

Write to `docs/solutions/YYYY-MM-DD-short-description.md` where:
- date is today's date
- slug is a 3–5 word hyphenated description of the problem solved

---

## Step 5 — Capture patterns into the patterns registry

Did this feature establish a reusable **multi-file recipe** — the canonical way to do a
recurring thing that spans several files (e.g. "add a custom field," "subscribe to a live
data source," "add a new public endpoint")? This is distinct from the single-file golden
exemplars in AGENTS.md and from the point-in-time solution doc written above: the registry
holds forward-looking, replicable recipes that agents read before writing code that matches
one.

If yes:
1. Open `docs/patterns-registry.md` (create it from the entry format documented in that file
   if it does not exist yet).
2. Add a new entry — or update an existing one if this feature changed an established recipe —
   using the registry's entry format (What / When to use / When NOT to use / The recipe /
   Golden exemplar / Established by / Gotchas).
3. Link the entry from this feature's `docs/features/<feature-slug>.md` → "Patterns
   established" (see `docs/feature-doc-template.md`). The feature doc indexes the recipe; the
   registry holds the canonical steps.

If the feature established no new cross-file pattern, say so explicitly — do not invent one.
A single-file convention belongs in AGENTS.md golden exemplars, not here; a one-off fix to a
non-recurring problem stays in `docs/solutions/`.

---

## Step 6 — Check for PITFALLS.md promotion

Did this feature reveal a new trap that isn't in PITFALLS.md?
If yes, propose adding it with the standard format (Area, Rule, Why, Symptoms, Source).
If no, say so explicitly.

---

## Step 7 — Check for memory.md update

Did this session correct a mistake that should become a permanent rule?
If yes, propose the memory.md entry in the standard format.
If no, say so explicitly.

---

## Step 8 — Review permission log and suggest allowlist additions

Read the session permission log:
```
HASH=$(echo "${CLAUDE_PROJECT_DIR:-/}" | md5 2>/dev/null | cut -c1-8 \
  || echo "${CLAUDE_PROJECT_DIR:-/}" | md5sum 2>/dev/null | cut -c1-8 \
  || echo "00000000")
cat /tmp/claude-perm-log-${HASH}.jsonl 2>/dev/null
```

Compare logged tool calls against `.claude/settings.json` `permissions.allow`. Identify patterns
not covered by any existing entry. For each uncovered pattern, present it as a candidate addition
— do not write to `.claude/settings.json` directly. Group candidates by safety tier:
- **Safe to add** (read-only, repo-scoped writes, or dangerous subset blocked by `block-dangerous-git.sh`): list with a brief reason
- **Review first** (external services, credentials, mutations): list with a warning note

For each candidate, state in plain English what allowing it actually lets the agent do
unsupervised — not just the tool-call pattern, but what could go wrong if it ran against
the wrong file or target with nobody watching. This is the higher-stakes ask in this
skill: granting a permission is granting unattended capability, so don't present it as a
routine checkbox. Surface all candidates to the user, invite them to ask about any
pattern before deciding, and wait for confirmation before writing any.

If the log is empty or every pattern is already covered, say so explicitly.

---

## Step 9 — Notion AI engineering system update

Did this feature introduce or change anything in the system's tooling, settings, or processes?
This includes: changes to `.claude/settings.json` allowlist/blocklist, hook scripts, pipeline
tiers, skill definitions, sentinel patterns, or any process rule that the Notion AI engineering
system documents.

If yes:
1. Open the Notion AI engineering system Changelog page and add a new versioned subpage (increment the minor version, e.g. v0.84 → v0.85). Include:
   - What changed (tool, pattern, or process)
   - Why (the incident or problem it addresses)
   - How it affects agent behavior
2. If the change affects the `settings.json` template: update the settings.json subpage in Notion
   with the new allowlist entry or blocked pattern change.
3. Update any other affected template pages (hooks, skills).

If no: say so explicitly.

---

## Session retrospective (run at session end)

**86% audit:** What slowed down this session that was NOT about writing code?
(Examples: review queue backlog, unclear scope, missing context, design decisions, waiting on feedback, context-switching)
Log the answer alongside the coding retrospective. This data feeds future system growth decisions.

**Learning capture:** What did you learn about the domain, the right design, or the correct approach during this session that wasn't in CONTEXT.md when you started?
(If CONTEXT.md should be updated, note the specific addition here so it can be applied in the next session.)

---

## Step 10 — Quarterly memory review (run every ~90 days)

This step is optional. Run it approximately every 90 days, not after every feature.

Read .claude/memory.md. Check the last_seen date on each entry.

Flag entries where:
- last_seen is more than 90 days ago (stale — never fired or was forgotten)
- The rule contradicts current patterns in the codebase (outdated)
- The rule is already covered by PITFALLS.md (redundant — safe to remove)

Produce a short report:

```
## Memory review
### Stale (not seen in 90+ days)
- [name]: last_seen [date] — promote to PITFALLS.md, remove, or reset?
### Possibly outdated
- [name]: [why it may no longer apply]
### Redundant with PITFALLS.md
- [name]: covered by PITFALLS.md § [entry]
### Looks healthy
[count] entries — no action needed.
```

Do not modify memory.md. Surface candidates and wait for direction.