---
name: init
description: Sets up the harness in a new project repo — runs install.sh from the plugin directory, copies starter context docs (CLAUDE.md, AGENTS.md, CONTEXT.md, PITFALLS.md) for any that are missing, then walks the user through filling in CLAUDE.md interactively. Use when the user says "/init", "set up the harness", "fill in CLAUDE.md", "initialize this project", or "finish the install". Requires the harness plugin to be installed ($CLAUDE_PLUGIN_ROOT must be set). Does not require a local clone of the harness repo.
---

# /init — set up the harness in a project

The agent-harness plugin is already installed in Claude Code. This skill does the
per-project setup: copy harness files into the current repo, then fill in
`CLAUDE.md` together with the user.

## Step 0 — Confirm the plugin is installed

Check that `$CLAUDE_PLUGIN_ROOT` is set and the directory it names exists on disk.

If `$CLAUDE_PLUGIN_ROOT` is not set or the directory does not exist, stop and
print this exact message:

```
The harness plugin is not installed. Run /plugin install harness@harness first.
```

Do not proceed past Step 0 until the check passes.

## Step 1 — Run install.sh from the plugin directory

Run:

```bash
bash "$CLAUDE_PLUGIN_ROOT/scripts/install.sh" "$(pwd)"
```

This copies every harness-owned file into the current project and writes
`.claude/.harness-manifest.json`. It is safe to run again on a project that
already has the harness — create-once files (like `CLAUDE.md`) are skipped if
they already exist.

## Step 2 — Fill in CLAUDE.md interactively

Open `CLAUDE.md`. Walk the user through the fill-in sections one topic at a time.
Ask about:

- Project name and a one-paragraph overview of what it is and who it is for
- Tech stack: language, framework, and the package manager (npm / pnpm / yarn / bun)
- Source control host (GitHub or GitLab) and deployment target
- Dev / build / lint commands (the test command is already `npm test`)
- Architecture rules: where business logic lives, any layer boundaries
- Any project-specific hard rules for the NEVER list

Ask in small batches, not one giant prompt. Replace each `TODO` placeholder with
the user's answer. Leave a section as `TODO` only if the user genuinely does not
know yet.

## Step 3 — Point out the setup checklist

`CLAUDE.md` ships with a `## Setup checklist` block at the very top. Remind the
user it lists the remaining one-time steps:

- `bash scripts/install-harness-hooks.sh` — wire git hooks and npm
- `bash scripts/install-locks.sh` — optional: OS-level file locks (requires sudo)

Tell them to delete that checklist section once all steps (including this `/init`
run) are done.

## Step 4 — Report

Print a short summary:

- Which docs were created vs. skipped (already existed)
- That CLAUDE.md is now filled in (or which sections still say TODO)
- The next command to run: `bash scripts/install-harness-hooks.sh`; mention that `bash scripts/install-locks.sh` is optional (requires sudo)

Do not commit anything. The user reviews and commits when ready.
