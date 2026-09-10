---
name: notion-sync
description: Sync this project with the AI-native engineering system in Notion. Invoke when the user says "/notion-sync", "sync with Notion", or "apply Notion updates". Fetches the changelog since LAST-SYNC.md, fetches all canonical template pages, diffs against disk, and applies every gap.
---

# notion-sync

Sync this project with the AI-native engineering system in Notion.
Invoke with `/notion-sync`.

---

## Core principle
The canonical Notion template pages are the source of truth. The changelog
entries are summaries — useful for understanding intent, not sufficient for
knowing what to change. For each template file the system owns, the correct
state is what the Notion template page says it should be. Diff every file.
Apply every gap. Do not rely on changelog descriptions or "Projects that need
updating" hints — those are incomplete by design.

## Anti-rationalization (read before proceeding)

| Rationalization | Rebuttal |
|---|---|
| "The changelog description covers what changed" | Changelog entries are prose summaries. Two separate sentences can miss a whole step. The canonical template page is ground truth — diff it. |
| "Projects that need updating says only X, Y, Z" | That section is a hint, not an exhaustive checklist. It will eventually be removed. The comprehensive template diff finds everything. |
| "This is doc-only, I can mix it with feature work" | Sync diffs are wide (agents, skills, templates, docs). Mixed with feature work they obscure feature intent and make rollback impossible. Always a dedicated branch. |
| "I applied all the bullet points, we're done" | Applying bullet points is step 6a. The comprehensive template diff (step 6b) is what confirms you're actually done. |
| "LAST-SYNC.md is already updated, we're good" | Update LAST-SYNC.md only after the comprehensive diff is clean, not after applying changelog entries. |

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

**Choosing how to ask.** For a small set of discrete choices — apply this
guard-file change or not — use `AskUserQuestion`; it renders as clickable
options and already has a built-in escape hatch (the human can always answer
"Other" with free text instead of picking a preset). For anything the human
needs to actually read before deciding — a guard-file diff, a full sync
report — present it as prose or a document; a structured question can't hold
that much content.

This applies to: Step 6's guard-file NEEDS HUMAN bundle — the one place in
this skill where the human is asked to review and apply something directly,
since template gaps everywhere else are applied by the agent automatically.

---

## Step 1 — Load Notion MCP schema
Run `ToolSearch select:mcp__claude_ai_Notion__notion-fetch` before any Notion
fetches. Do not attempt to call the tool without its schema loaded.
See PITFALLS.md § notion-pages-require-mcp — WebFetch returns "Notion" for
authenticated pages. Never use WebFetch for Notion URLs.

---

## Step 2 — Read LAST-SYNC.md
Read `LAST-SYNC.md` at the repo root. Capture the last sync date.
If the file doesn't exist, the project has never been synced — apply all versions.

---

## Step 3 — Create a dedicated branch
**Non-negotiable.** Sync work must be on its own branch — never mixed with
feature work or any other in-progress change.
```bash
git checkout main
git pull origin main
git checkout -b chore/notion-sync-vX.Y-vX.Z
```
`X.Y` = last synced version, `X.Z` = latest version (fill after Step 5 if
unknown). Rename the branch if needed after fetching the changelog.

---

## Step 4 — Fetch the changelog
```
Changelog page ID: 35ae2971cd6281c69f55c4ff7bbb2b64
```
Read the full changelog. Identify all versions with dates **after** the last
sync date. List them oldest-first.

If no new versions exist: report "Already up to date." Update LAST-SYNC.md
to today and stop — no commit needed.

**Canonical-page-lag protocol.** A changelog entry describes intended changes
to canonical template pages — but a new changelog version does NOT guarantee
the canonical pages have been updated to match. The comprehensive diff in
Step 6 is what reveals whether the pages actually reflect the changelog.
When the diff shows a canonical page lags the changelog description:
- Apply the changelog-described changes to the project file directly (use
  the changelog text as the spec, since the page isn't yet authoritative)
- Surface the lag as a draft for the upstream maintainer (via `/compound`)
- Note the lag in `LAST-SYNC.md` so the next sync knows to re-verify

A changelog entry is not 'published' from a downstream-sync perspective
until its canonical pages match. Suggested upstream improvement: a "version
applied" field on each template page so syncs can verify alignment without
diffing every file.

---

## Step 5 — Fetch ALL canonical template pages in parallel
This is the most important step. Fetch every template page the system owns
in a single parallel batch before touching any files.

The Templates index page is at ID: `359e2971cd62819e9142c30b99fecb6c`

**Fetch the index first** to get all sub-page links. Then fetch every template
page in parallel. Do not selectively fetch only pages mentioned in the changelog
— fetch all of them. The diff in Step 6 will determine what actually changed.

Core template pages:

| Template | Notion ID |
|---|---|
| `skills/feature/SKILL.md` | `359e2971cd62818da157f83675f07ced` |
| `skills/cr/SKILL.md` | `359e2971cd62814b96e0f908148e0e23` |
| `skills/cr-security/SKILL.md` | `359e2971cd6281ecb750f8dabebb4970` |
| `skills/tdd/SKILL.md` | `359e2971cd6281b3abd4c8fcbd5b65c9` |
| `skills/compound/SKILL.md` | `359e2971cd628193a1caedf26a1cb1f2` |
| `skills/notion-sync/SKILL.md` | *(this page)* |
| `TASK-TEMPLATE.md` | `359e2971cd6281b68becec61207f98c0` |
| `CLAUDE.md` | `359e2971cd628193b816d2f1b544d35b` |
| `AGENTS.md` | `359e2971cd62818d9ca0d8b6f487caee` |
| `agent-contract.md` | `359e2971cd6281c79579e82764fbca0b` |
| `agents/ux-reviewer.md` | `364e2971cd628110a2f3d8282b7560f1` |
| `agents/reviewer.md` | `364e2971cd628157b54dccf0d70fc0c9` |
| `agents/explorer.md` | `364e2971cd6281b6bedbf695e8a7f926` |
| `agents/spec-writer.md` | `364e2971cd62819dac51cebc61fb8217` |
| `agents/implementer.md` | `364e2971cd62816b9482f4ef0ba2c02c` |
| `agents/doc-updater.md` | `364e2971cd6281beb7e4d6450e968921` |
| `agents/security-reviewer.md` | `364e2971cd628107ae74c2a8afb745f0` |
| `agents/task-runner.md` | `364e2971cd6281a78d2bc06831c88d1b` |
| `docs/spec.md (Medium+ template)` | `364e2971cd628102ad2dc058860bc520` |
| `docs/research/ convention` | `364e2971cd62811488e6ebb10e36d53c` |
| `SOUL.md` | `364e2971cd62817a81e3ca6697298e15` |

For any template in the index not listed above (new templates added in new
versions), fetch those too.

---

## Step 6 — Comprehensive diff: template vs disk
This is the primary application method. Do not rely on changelog descriptions
to decide what to change — the diff tells you.

For each canonical template page fetched in Step 5:

**a. Read the current file on disk.**
**b. Compare it against the canonical template.**
**c. Identify every gap** — content in the template that isn't in the project
  file, structural elements that differ, new sections, new steps, new fields.
**d. Note whether the gap is:**
  - A universal addition (copy exactly from template)
  - A structural change to an existing section (apply the shape, preserve project-specific content)
  - A new file that doesn't exist yet (create it)

Build a gap list before writing anything. Apply all gaps together.

**Guard-file exception.** When a gap lands in a guard file (`settings.json`, `settings.local.json`, `.claude/hooks/**`), do NOT apply it — the project-relative `deny` makes those files agent-uneditable by design. Instead: stage the proposed content to a scratch path (e.g. `/tmp/sync-guard-fix/`), verify it (run each hook against positive + negative cases), and surface it as a paste-ready NEEDS HUMAN bundle (file contents + copy/`chmod` command + the exact `settings.json` diff). Lead the bundle with a one-sentence plain-English summary of what's changing and why — before the file contents, command, or diff — and close it with an invitation to ask before applying it. Keep guard files OUT of the sync PR — the PR carries only agent-applicable doc/skill changes. Record the gap as `human-pending` in LAST-SYNC.md.

**Preserve project-specific content.** The canonical template has placeholder
text and generic examples. The project file has stack-specific names, real
PITFALLS entries, real solutions, actual task content. When a template adds a
new section, add that section — don't overwrite sections that have been filled
in with project-specific content.

**The changelog entries help you understand intent.** Reading them is useful
context for understanding why a gap exists. But the diff is what tells you
what the gap is.

---

## Step 7 — Create new files and directories
For any template that maps to a file that doesn't exist on disk yet:
- Create the file with the canonical template content adapted for this project
- Create `.gitkeep` placeholders for new directories with no files yet

---

## Step 8 — Update LAST-SYNC.md
Only update after the comprehensive diff is clean. Build the receipt from Step 6 diff results before writing:

```
Last Notion sync: YYYY-MM-DD
Version range: vX.Y → vX.Z

## Coverage

| Template | Status |
|---|---|
| `skills/feature/SKILL.md` | in-sync |
| `skills/cr/SKILL.md` | gaps-applied |
```

Status values (exactly one per row):
- `in-sync` — fetched, no gaps found
- `gaps-applied` — fetched, one or more gaps applied
- `created` — file did not exist on disk; created from template
- `lag-detected` — canonical page lags behind changelog description; changes applied from changelog prose directly
- `not-fetched` — tool error or truncation; note reason in a parenthetical
- `human-pending` — guard file gap (settings.json, settings.local.json, .claude/hooks/**) delivered as paste-ready NEEDS HUMAN; not applied by agent

Every canonical page from Step 5 must appear in the table. A row cannot be omitted — if a page was not fetched, mark it `not-fetched` and note why.

---

## Step 9 — Run /compound
Run `/compound` if this sync established a non-obvious process or revealed a
gap worth capturing for future sessions.

The Notion sync process is documented in:
`docs/solutions/2026-05-18-notion-changelog-sync-process.md`

If that solution doc exists and is current, no new compound doc is needed.
If this sync revealed something the solution doc doesn't cover, update it.

**Scope delimiter:** this skill owns the *sync protocol* (how to apply Notion
templates). `/compound` owns *project-specific learnings discovered during a
sync* (e.g., a new PITFALL, a workaround for an inert template, feedback to
push back to the source-of-truth maintainer). Protocol changes go upstream
to Notion; sync-instance learnings live in `docs/solutions/`.

---

## Step 10 — Commit
```
chore(system): apply AI-native system updates vX.Y–vX.Z

[Key changes per version — what sections were added, what files were created]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
Run `npx tsc --noEmit` before committing — zero errors required.

---

## Step 11 — Push and open PR
Run `/cr` to review the branch. It writes `.cr-ok` on completion, consumed by `scripts/pr.sh`.

```bash
git push -u origin chore/notion-sync-vX.Y-vX.Z
scripts/pr.sh --title "chore(system): apply AI-native system updates vX.Y–vX.Z"
```

---

## Done criteria
- `LAST-SYNC.md` coverage table lists every canonical page from Step 5 with a non-empty status
- Comprehensive template diff run and clean for every canonical template page
- `npx tsc --noEmit` exits zero
- Dedicated branch committed and pushed
- PR open against main

---

## Reference

| Resource | ID / Path |
|---|---|
| Changelog | `35ae2971cd6281c69f55c4ff7bbb2b64` |
| Templates index | `359e2971cd62819e9142c30b99fecb6c` |
| Solution doc | `docs/solutions/2026-05-18-notion-changelog-sync-process.md` |
| Push blocker | PITFALLS.md § notion-pages-require-mcp |
| Last sync date | `LAST-SYNC.md` |
