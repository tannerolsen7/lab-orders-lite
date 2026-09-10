---
name: sync
description: Applies pending harness updates to the current project's files. Runs sync-harness.sh from the plugin installation directory against the current project. Use when the user says "/sync", "sync the harness", "update the harness files", "apply harness updates", or when the session-start hook shows "[harness] project files are out of date". Requires the harness plugin to be installed ($CLAUDE_PLUGIN_ROOT must be set).
---

# /sync — apply harness updates to this project

This skill applies pending harness updates from the plugin to the current
project's files. Run it any time, or in response to the session-start notice
"[harness] project files are out of date". This skill applies those updates
using the same three-way comparison that
`sync-harness.sh` uses — it updates harness-owned files, skips create-once files
the project has customized, and surfaces conflicts that need manual resolution.

## Step 0 — Confirm the plugin is installed

Check that `$CLAUDE_PLUGIN_ROOT` is set and the directory it names exists on disk.

If `$CLAUDE_PLUGIN_ROOT` is not set or the directory does not exist, stop and
print:

```
The harness plugin is not installed. Run /plugin install harness@harness first.
```

## Step 1 — Run sync-harness.sh from the plugin directory

Run:

```bash
bash "$CLAUDE_PLUGIN_ROOT/scripts/sync-harness.sh" "$(pwd)"
```

Show the script's output to the user without filtering or summarizing it. Every
line the script prints — updated files, skipped files, conflicts — should be
visible.

## Step 2 — Report the result (if the script exits 0)

If the script exits 0 (no conflicts), count the lines that contain `updated:` in
the output and print one summary line:

```
N file(s) updated.
```

If no files were updated (all reported as `up-to-date` or `skipped`), print:

```
Already up to date.
```

## Step 3 — Surface conflicts (if the script exits non-zero)

If the script exits non-zero, conflicts were found. Print:

```
Sync stopped — conflicts need manual resolution before the sync can complete.
```

Then list each conflicting file from the script's output. Tell the user:

1. Open each conflicting file and decide which version to keep (local edits vs.
   upstream changes from the plugin).
2. After resolving all conflicts, run `/sync` again to complete the update.

Do not attempt to resolve conflicts automatically.
