---
name: design
description: |
  System design skill with two modes. Use 'explore' when you don't
  know the right design and need options with tradeoffs before committing. Use
  'contract' when you know the design and need to formalize it into a handoff
  document for Claude Code. Triggers on: "I want to build X", "how should I
  structure this", "what's the best approach for", "help me design", "I need to
  add a feature", or any time a feature is described without defined inputs,
  outputs, or constraints. Always runs before /grill-with-docs for Small+ tasks.
---

# /design

> **Upstream skills required:** `/grill-with-docs`, `/tdd`, and `/to-issues`
> are from Matt Pocock's skills repo — not included here.
> Install once globally: `npx skills@latest add mattpocock/skills`
> See `.claude/INDEX.md → Required global skills` for details.

Two modes. Declare which at the start, or let the agent ask.

```
/design explore   ← don't know the right design, need options
/design contract  ← know the design, need to formalize it
```

For Tiny tasks: skip both. One behavior, the design is obvious.
For Small+: contract is mandatory. Explore is optional but recommended when uncertain.
For any task where agents will implement: run contract before handing off.

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
   understood (see `~/.claude/CLAUDE.md` → "Communication voice"). "If two
   people click pay at the same time, the client could get charged twice"
   beats "race condition." The bar: could the human explain this back to a
   colleague and answer a follow-up question about it, confidently? If not,
   simplify the language further — never cut real information to get there.
3. **Leave the door open.** Close with something like "ask me to explain any
   part of this before you decide." A summary the human can't question is a
   rubber stamp, not a decision.

**Choosing how to ask.** For a small set of discrete choices — mode, approve
vs. reject, pick one of a few options — use `AskUserQuestion`; it renders as
clickable options and already has a built-in escape hatch (the human can
always answer "Other" with free text instead of picking a preset). For
anything the human needs to actually read before deciding — a schema, a
mockup, migration SQL, a full report — present it as prose or a document; a
structured question can't hold that much content.

This applies to the Design Questions sheet (Step 1), grill findings (Step 2),
schema approval (Step 3), mockup approval (Step 4), and final sign-off (Step 5).
It also applies to the four contract questions below — but as translated,
plain-language questions, never read verbatim; see the note under that heading.

---

## Mode 1: /design explore

Run when you have a problem but not a design. Produces 2-3 options with
explicit tradeoffs. You pick one, then feed it into /design contract.

### Anti-rationalization

| Rationalization | Rebuttal |
|---|---|
| "There's only one reasonable approach" | Name it, then find two more. If they're worse, you now know why your choice is right. |
| "I already know what I want" | Then run /design contract. If you're here, you don't know yet. |
| "Exploration takes too long" | Implementing the wrong design takes longer. 15 minutes of options saves hours of rework. |

### The explore prompt

Paste this into a Claude Code session with your problem filled in:

```
Given this problem: [describe what needs to exist — the user need, not the implementation]
And this codebase context: [paste relevant CONTEXT.md section]
And these constraints: [paste relevant AGENTS.md architecture rules]

Propose 2-3 design options. For each:
- What layer owns this? (per the project's architecture — e.g. data, schemas, utils, components, routes)
- What is the public interface? (inputs, outputs, key types)
- What existing patterns in this codebase does this follow or break?
- What are the tradeoffs vs. the other options?
- What does this make harder in 6 months?

Do not implement anything.
Do not ask clarifying questions yet — state your assumptions explicitly.
Propose all options first, then recommend one with a one-sentence reason.
```

### What to do with the output

1. Read all options
2. Pick one — or ask for a hybrid with specific parts from each
3. Note which assumptions the agent made that need confirming
4. Feed the chosen option into /design contract

If the agent produces only one option: ask "give me two alternatives, even if you think they're worse."
One option is a recommendation disguised as exploration.

---

## Mode 2: /design contract

Formalizes a design into a handoff document. Run after explore (if used)
or directly when you already know the design. Output goes into
TASK-TEMPLATE.md and is the input to /grill-with-docs.

### Anti-rationalization

| Rationalization | Rebuttal |
|---|---|
| "The design is simple, a contract isn't needed" | Simple designs still have hidden assumptions. A contract takes 10 minutes. Wrong assumptions take hours to fix. |
| "I'll define the interface as I go" | The agent will define it for you. That's how you get designs you didn't want. |
| "I'll add the constraints later" | Constraints defined after implementation are just documentation. Define them before. |

### The four questions

Work through these in order. Don't skip to implementation.

These four categories are for structuring *your own* thinking — don't read
them verbatim at the human. Translate each one into a plain question about
what the user would experience: "what happens if someone submits this form
twice by accident" lands; "what's your idempotency strategy" doesn't.

**1. Business need**
- What user problem does this solve?
- What breaks for Monica if this doesn't exist?
- What is the minimum version that would actually be useful?

If the answer to the third question is smaller than what you're planning: cut to the minimum.

**2. Interface**
- What data or events trigger this? Where does that data come from?
- What shape is it? (TypeScript type, structure, optionality)
- What happens if input is missing, malformed, or unexpected?
- What does this produce or change?
- Who consumes the output? Sync or async? Loading and error states?

**3. Constraints**
- What must this never break or interfere with?
- What auth or security boundaries must it respect? (the project's access policies, tenant/owner scoping)
- Any performance requirements?
- What existing contracts elsewhere in the system must it stay compatible with?

**4. State ownership**
- Does this module own any state, or only transform data passed to it?
- If it owns state: what triggers a change? Who can read it?

### Simplicity check

After answering all four: *"What is the dumbest version of this that would still work?"*

Specifically look for:
- Parameters added for hypothetical future cases
- Things added because they seemed related, not because Monica needs them now
- Complexity justified by "it might need to"

If the user resists: *"What breaks for Monica if we leave that out?"* If nothing breaks, cut it.

### Handoff document format

Output of /design contract. Paste into TASK-TEMPLATE.md before running /feature.

**Where to save the written contract doc: `docs/design/`, never `docs/testing/`.** This is
prose (What & Why, Context, Interface Contract, Out of Scope) — not a checklist of confirmed
behaviors. `docs/testing/*.md` is reserved exclusively for the confirmed-behavior shards
`@spec-writer` produces, and `/cr`'s `scripts/spec-coverage-check.sh` globs every file in that
directory and treats every `- ` line as a behavior needing a `<!-- test: <path> -->`
annotation. A contract saved there gets its own prose bullets read as unannotated behaviors —
one real case produced ~40 false-positive Must Fix findings in the same `/cr` run (FLO-275,
2026-07-28; see `docs/solutions/2026-07-28-design-contract-placement-vs-behavior-shards.md`).
If the behavior shard needs to reference the contract, point its `Source:` line at the
`docs/design/...` path, not the other way around.

```
# [Feature Name]
## What & Why
[One paragraph: the user problem this solves. Not implementation rationale —
user need. What breaks for Monica if this doesn't exist?]
## Context
[What already exists that this builds on. Name files explicitly so the agent
doesn't recreate them.]
## Done Looks Like
- [Specific, checkable output — what the user can see or do]
- [Tests that must pass]
## Interface Contract
Inputs:
- [name]: [TypeScript type] — [source, what happens if missing or malformed]
Outputs:
- [name]: [TypeScript type] — [consumer, sync or async, loading/error states]
Constraints:
- [What this must never break]
- [tenant/owner scoping must be preserved — never return another tenant's data]
State:
- [What state this owns, if any]
- [What triggers a change, who can read it]
## Out of Scope
- [Explicitly excluded thing and why]
## Relevant Files
- [path/to/file] — [why relevant]
```

### Critical sections — do not skip

**Interface Contract** — this is what separates a plan from a description.
If this section is vague, the handoff is not ready.

**Out of Scope** — naming what you decided not to build is as important as
what you did. It prevents agents from gold-plating and makes the contract
defensible in review.

**Done Looks Like** — must be checkable, not vague.
"Works correctly" is not done.
"Returns null from getEventById when eventId belongs to a different team" is done.

### The signal the contract isn't ready

If the agent has to guess anything during implementation, the contract has a
gap. Gaps found during /tdd should be surfaced immediately, not resolved
unilaterally. Surface them as open decisions in AGENTS.md.

---

## Before coding: the design-confirmed gate (R4-D4)

The contract names the interface. This gate locks the two decisions that are
expensive to get wrong and impossible to review from prose alone — **the data
shape** and **the look** — before any feature code is written. It ends by
writing the `design-confirmed` sentinel; `/feature` refuses to start coding
without it (same hard-stop pattern as `.cr-ok`).

This gate runs for Small+ features. **Tiny** features skip it — one obvious
behavior, no new data shape, no new screen. If a "Tiny" task turns out to touch
the database or add a UI screen, it is not Tiny: escalate to Small and run this
gate.

### Anti-rationalization

| Rationalization | Rebuttal |
|---|---|
| "The data shape is obvious, I'll just code it" | The schema is the least-reversible decision in the system. A wrong column type ships, gets data written to it, and now costs a migration + backfill to fix. Robot passes are cheap; a wrong schema is not. Write it down and get it approved first. |
| "I can answer the open questions myself" | Section 3 questions exist *because* the robot must not answer them — they are product/business calls the human owns. Answering them yourself is how you build the wrong thing confidently. |
| "A mockup is wasted work, the diff will show the UI" | A diff is a terrible way to review a screen and prose is a terrible way to agree on one. The look is the *bigger* guess on a UI feature. A throwaway mockup is the cheapest place to disagree. |
| "I'll skip the grill, I already thought it through" | You grilling your own sheet finds the cases you already saw. A second independent agent finds the ones you didn't. That is the entire point. |
| "The ticket already says In Progress, someone must have claimed it, I'll just start" | A bare status flag is not proof — it's exactly what let two sessions run a full design pass on FLO-262 in parallel undetected. Check for a claim comment before treating "In Progress" as evidence anyone is actually working on it. |

### Step 0 — Claim the ticket

Before the Design Questions sheet, claim the ticket — this runs every time `/design contract`
Mode 2 starts, regardless of entry point. (`/design explore` and `/linear-triage` don't reach
this step: explore produces no committed artifact, and triage never operates on an existing
ticket — it only ever creates new ones. Unattended runs don't reach this gate either — see the
design doc's Out of Scope.)

This exists because a bare Linear status flip wasn't enough to stop the FLO-262 collision — see
`docs/design/flo-474-design-contract-claim-signal.md` for the incident. The fix has two halves:
leave a comment, not just a flag (this step); and never trust a bare flag without checking for
one (the rule in CLAUDE.md → Linear integration, which every session — including one judging
whether to clear a peer's claim as stale — must follow, not just this one).

**Already claimed this exact ticket yourself, earlier in this same session?** Most commonly:
`/feature`'s own Step -1 already ran `claim-check.sh` and flipped status to In Progress before
handing off to this skill. That's not ambiguous — you already know it's your own claim, because
you made it. Skip items 1-3 below (they're for evaluating a status you did *not* set yourself)
and go straight to item 4 (post the initial claim comment) and item 6 (write the sentinel).
`/feature`'s Step -1 satisfies items 1-3's *intent* but never performs items 4 or 6 itself — both
still have to run here, every time, regardless of entry point.

1. Run `scripts/claim-check.sh FLO-N`. Non-zero exit (PR found, or couldn't confirm) → stop,
   same as the standard checklist.
2. Read the issue's Linear status and its comments (Linear MCP tools). Find the most recent
   comment matching the claim/milestone format below, if any, and note which branch it's from.
   **If the MCP read itself errors** (auth failure, rate limit, issue not found) — treat that the
   same as finding nothing: stop and escalate, do not silently treat an unconfirmable read as
   "no comment found, safe to proceed." A read that failed and got treated as clear would
   reproduce the exact failure this step exists to close.
3. Decide, using the issue's status and that comment — same five outcomes as CLAUDE.md → Linear
   integration's "Judging whether someone else's existing claim is actually still live":
   - No claim/milestone comment at all, and no other git-visible evidence (branch/commits/PR)
     either → inconclusive. Surface it to the human rather than deciding either way yourself.
   - The most recent matching comment is from **your own current branch** → your own prior claim
     from an earlier milestone in this same pass, not a competing one. Proceed normally.
   - The most recent matching comment is from a **different branch** and is **less than 48 hours
     old** → live collision. Stop. Do not proceed. Escalate to the human — never resolve it
     yourself (see PITFALLS.md's FLO-262 entry).
   - The most recent matching comment is from a **different branch**, is **48+ hours old**, and
     no PR is open for the issue → treat as abandoned. Proceed to step 4, but say so explicitly
     in the claim comment ("superseding a claim from branch X, last activity Y, idle 48h+").
   - Status is **Todo/Backlog**, regardless of whether an old comment from a different branch is
     still visible → a status reset is itself a stronger abandonment signal than a stale timer.
     Proceed; note it in the new claim comment if a prior marker is still visibly present.
4. Flip status to In Progress (if not already) and post a comment, **prefixed with `🏭`**
   (`FACTORY_COMMENT_MARK`, `src/utils/commentResumeWebhook.ts`) so it never rings the factory's
   comment-resume webhook:
   ```
   🏭 Design contract — started, branch <branch>, <ISO-8601 UTC timestamp>.
   ```
   Minimal on purpose (branch, step name, timestamp) — no content summary. **Known overlap, not
   a bug:** `scripts/factory/decide.mts`'s `readResumeContext` also filters out any
   `🏭`-prefixed comment when collecting a parked ticket's human answers. If this same ticket is
   *also* parked by the factory, this comment is correctly excluded from that collection (it
   isn't a human answer) — the cost is reduced signal-to-noise on that ticket's thread, not a
   functional bug. Reusing the mark is still correct: it's the only token that suppresses the
   resume-webhook fire (see Context above), and inventing a second mark wouldn't suppress that
   fire at all. A cleaner disambiguation (e.g. a factory-specific sub-tag) would mean coordinated
   changes to `commentResumeWebhook.ts` and `decide.mts` — out of scope here; flag as a follow-up
   if the overlap turns out to matter in practice.

   **The recheck-and-comment procedure** (referenced by name at each later milestone below):
   re-run step 3's competing-claim check, then post the same `🏭`-prefixed, minimal-format
   comment with that milestone's step name. Every milestone in this gate does this — not only
   once at the start — so the detection window for a live collision is "the next milestone,"
   not "the end of the whole pass."
5. **No Linear MCP access in this session?** Ask a peer session that has access (cross-session
   message) to run steps 1-4 on your behalf. This is not a separate, looser path — the peer runs
   the identical protocol. (This happened for real during FLO-474 itself.) **No peer available
   either?** Stop and tell the human — do not silently skip the claim or silently proceed
   without one. Whichever session performed steps 1-4, **you** still run item 6 yourself, in
   your own worktree — the sentinel is a local file, so a peer running the Linear-side check
   doesn't write it for you.
6. Run `scripts/design-claim.sh FLO-N` (pass the issue id explicitly whenever you already
   resolved it in steps 1-3 above — that keeps the script from having to re-derive it from the
   branch name, and it warns if the branch and the id you pass disagree). Only omit the argument
   when the branch name reliably resolves it and you have no other id in hand. This writes the
   local `.claude/.design-claimed` sentinel — it does not check Linear itself (it can't; see the
   script's own header) and does not require a clean tree. Step 1 below refuses to start without
   this sentinel present *for the current branch specifically*, not merely present.

### Step 1 — Produce the Design Questions sheet

Requires `.claude/.design-claimed` **for the current branch specifically** (Step 0) — not merely
present. Check it, the same way `/feature`'s Implementation gate checks `.design-confirmed`:

```bash
ROOT=$(git rev-parse --show-toplevel)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
ACTUAL=$(cat "$ROOT/.claude/.design-claimed" 2>/dev/null || true)
if [ -z "$ACTUAL" ]; then
  echo "design: no design-claimed sentinel found. Step 0 didn't run — go back and run it." >&2
  exit 1
fi
SENTINEL_BRANCH="${ACTUAL%%:*}"
if [ "$SENTINEL_BRANCH" != "$BRANCH" ]; then
  echo "design: design-claimed sentinel is for branch '${SENTINEL_BRANCH}', currently on '${BRANCH}'." >&2
  echo "         Re-run Step 0 on this branch: scripts/design-claim.sh" >&2
  exit 1
fi
```

Without this, a leftover sentinel from an unrelated ticket (a reused worktree, a stale local
file) would silently satisfy a bare existence check — the `branch:issue` format was chosen
specifically so this comparison is possible; skipping it left that choice unused.

Three sections, in order. Write it as a markdown doc the human can read top to bottom.
Follow the plain-words rule above in every line — describe the effect, not just the
mechanism ("if the event date changes after guests are invited, invites don't
automatically resend" beats "no cascade trigger on the date column"). End the sheet
with an explicit invitation: "Ask me about anything above before you approve it."

**1. Data shape**
- Tables / columns / types / relations this feature reads or writes (existing and new).
- The **Zod boundary schema** for every input and output that crosses a trust boundary
  (request body, external API payload, form submission). Validation lives at the edge.
- If nothing in the data layer changes, say so explicitly — "no schema change" is a valid answer.

**2. Edge cases**
- Empty / missing / malformed input at each boundary named in section 1.
- Concurrency, ordering, and partial-failure cases (what if it runs twice? out of order? half-completes?).
- Tenant / owner scoping: what stops this returning another tenant's data?

**3. Open questions the robot must NOT answer**
- Every decision that is a product, business, or user-experience call — not a technical one.
- The robot is **forbidden to answer these itself.** List them; leave them for the human.
- If this section is empty, look harder: a feature with zero open questions usually means
  the robot silently answered some. Surface them.

### Step 2 — Grill the sheet adversarially (second independent agent)

Before the sheet reaches the human, a *different* agent challenges it. Invoke
`/grill-with-docs` (it spawns `@reviewer` in design mode against the sheet), or
spawn an inline adversarial agent with this brief:

> You did not write this Design Questions sheet. Attack it. Find: a data-shape
> decision that will need a migration to undo; an edge case that is missing from
> section 2; an "open question" the author quietly answered in section 1 instead
> of surfacing in section 3; a Zod schema that is looser than the column it
> guards. Report findings only — do not fix.

Fold the grill's findings back into the sheet before it goes to the human. A
sheet that survives the grill unchanged is suspicious — re-grill with a sharper brief.

**Translate before you present.** The grill's own report is written for an
engineering audience and will use terms like "race condition," "atomicity," or
"unique index." Before showing anything to the human, rewrite each finding in
plain words: what would actually go wrong, in a sentence a non-engineer could
picture ("if two people click pay at the same time, the client could get
charged twice"), not the technical name for why. If a term needs a definition
to be understood, that is the sign to cut the term, not add the definition.
This applies to every finding and every sign-off question in Steps 3 and 5
below, not just this step. Close the findings summary by inviting the human
to ask about any finding before moving on.

Once the grill is folded in, run the recheck-and-comment procedure (Step 0, item 4):
`🏭 Design contract — grill complete, branch <branch>, <timestamp>.`

### Step 3 — DB sub-step (only if the feature touches the database)

The schema is approved **on its own, first**, because it is the least-reversible
decision. Inline in the sheet:

1. Write the **actual proposed migration SQL** (the real `CREATE TABLE` / `ALTER`,
   not a sketch) and the **Zod schema** that guards the boundary.
2. Present that exact data shape to the human and get **explicit approval of the
   schema by itself** — before any other approval, before any coding. When you
   describe what each table/column/index is *for*, say it in plain words ("this
   stores which Stripe notifications we've already handled, so a repeat
   notification doesn't do anything twice") — not by naming the SQL construct
   and assuming the human already knows what it's for. Invite them to ask about
   any table or column before approving.
3. Do not proceed until the human approves the schema as written. A "looks fine,
   keep going" on the whole sheet is not schema approval; the schema gets its own yes.

Once approved, run the recheck-and-comment procedure (Step 0, item 4):
`🏭 Design contract — schema approved, branch <branch>, <timestamp>.`

### Step 4 — UI sub-step (only if the feature has a screen)

The gate locks the data shape; this locks the **look**. For any feature with a screen:

1. Produce a **rough, throwaway mockup** built from the existing design system —
   `docs/design/` tokens + components (project-owned). Reuse the established style;
   do **not** invent a new one. For the highest-stakes, client-facing screens,
   escalate to Figma (MCP-connected) instead of a static mock.
2. Get the human to **approve the look before the full wired-up build** — the mockup
   is the cheapest place to iterate on layout and hierarchy. Frame the ask in plain
   terms — "does this look and feel like something you'd send to a client" — not
   implementation detail, and invite them to point out anything that looks off before
   approving.
3. After the build, attach a **screenshot to the PR** for human eyeball confirmation
   that the built screen matches the approved mockup. (The full CI pixel-diff +
   tenant-assertion render gate stays deferred to the first autonomous UI run.)

Once approved, run the recheck-and-comment procedure (Step 0, item 4):
`🏭 Design contract — mockup approved, branch <branch>, <timestamp>.`

### Step 5 — Write the sentinel

Once the human has confirmed the sheet (and the schema, and the mockup, where they
apply): re-run Step 0's competing-claim check one last time. If a live competing claim
turns up now, stop — do not write the sentinel, escalate to the human, same as every
earlier check. If clear, post the closing comment
(`🏭 Design contract — sentinel written, branch <branch>, <timestamp>.`), commit the
design artifacts (sheet, contract, migration, mockup), then write the sentinel. Before
asking for that confirmation, reread whatever summary or
question you're about to show the human and check: could they explain it back to
a colleague after one read? If any term needs a definition to land, cut the term
instead — describe the effect, not the mechanism. End the sign-off ask with an
explicit invitation to ask about anything before they confirm.

```bash
bash scripts/design-confirm.sh
```

`design-confirm.sh` self-resolves `branch:sha`, **refuses a dirty tree** (commit the
design artifacts first — a dirty tree means the sentinel would certify a sha you are
not about to code on), appends an audit line, and runs no checks. The sentinel is a
soft, local, one-shot certificate that the design was confirmed at this committed sha
**before coding**. `/feature` reads and validates it at the top of its implement step;
**no sentinel → coding refuses to start.**

**The sentinel encodes `branch:sha` of the pre-coding HEAD.** Run `design-confirm.sh`
as the last thing before handing to implementation, with no feature code committed yet.

---

## After the contract: decomposition

For Medium+ tasks, the contract feeds into decomposition:

1. **Find the tracer bullet** — which slice touches all layers (data layer → server action → component, per the project's architecture) and validates the architecture? Build this first.
2. **Map dependencies** — which slices must run before others?
3. **Label parallel vs. sequential** — parallel slices run in separate worktrees simultaneously. Sequential slices run in order.
4. **Verify each slice is independently shippable** — if a slice requires another to be meaningful to Monica, combine them.

Run /to-issues to generate the initial slice list, then apply this
decomposition logic to reorder and label before handing to agents.
