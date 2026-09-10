---
name: write-a-skill
description: Create new agent skills with proper structure, progressive disclosure, and bundled resources. Use when user wants to create, write, or build a new skill.
---

# Writing Skills

## Process

1. **Gather requirements** - ask user about:
   - What task/domain does the skill cover?
   - What specific use cases should it handle?
   - Does it need executable scripts or just instructions?
   - Any reference materials to include?

2. **Draft the skill** - create:
   - SKILL.md with concise instructions
   - Additional reference files if content exceeds 500 lines
   - Utility scripts if deterministic operations needed

3. **Review with user** - present draft and ask:
   - Does this cover your use cases?
   - Anything missing or unclear?
   - Should any section be more/less detailed?

## Skill Structure

```
skill-name/
├── SKILL.md           # Main instructions (required)
├── REFERENCE.md       # Detailed docs (if needed)
├── EXAMPLES.md        # Usage examples (if needed)
└── scripts/           # Utility scripts (if needed)
    └── helper.js
```

## SKILL.md Template

```md
---
name: skill-name
description: Brief description of capability. Use when [specific triggers].
---

# Skill Name

## Quick start

[Minimal working example]

## Workflows

[Step-by-step processes with checklists for complex tasks]

## Advanced features

[Link to separate files: See [REFERENCE.md](REFERENCE.md)]

## Common Rationalizations

[Excuses an agent might use to skip a step, paired with why the excuse is wrong. One row per excuse.]

| Rationalization | Reality |
|------------------|---------|
| "[excuse]" | [why it's wrong] |

## Red Flags

[Warning signs that the skill is being applied wrong or skipped. Short bullet list.]

- [warning sign]
```

## Description Requirements

The description is **the only thing your agent sees** when deciding which skill to load. It's surfaced in the system prompt alongside all other installed skills. Your agent reads these descriptions and picks the relevant skill based on the user's request.

**Goal**: Give your agent just enough info to know:

1. What capability this skill provides
2. When/why to trigger it (specific keywords, contexts, file types)

**Format**:

- Max 1024 chars
- Write in third person
- First sentence: what it does
- Second sentence: "Use when [specific triggers]"

**Good example**:

```
Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when user mentions PDFs, forms, or document extraction.
```

**Bad example**:

```
Helps with documents.
```

The bad example gives your agent no way to distinguish this from other document skills.

## When to Add Scripts

Add utility scripts when:

- Operation is deterministic (validation, formatting)
- Same code would be generated repeatedly
- Errors need explicit handling

Scripts save tokens and improve reliability vs generated code.

## When to Split Files

Split into separate files when:

- SKILL.md exceeds 100 lines
- Content has distinct domains (finance vs sales schemas)
- Advanced features are rarely needed

## When to Add Common Rationalizations and Red Flags

Add these two sections whenever the skill enforces a step an agent could plausibly talk itself out of — a gate, a check, a "do this even though it's tempting to skip" moment. Skip them for skills that are pure lookup or reference with nothing to enforce.

- **Common Rationalizations**: a table of excuse → why it's wrong. Write the excuse the way an agent would actually phrase it to itself ("it's just a small fix", "the tests will catch it anyway"), not a strawman. The rebuttal should name the concrete failure the shortcut causes, not just assert a rule.
- **Red Flags**: a short list of observable signs the skill is being misapplied or skipped — things a reviewer (human or agent) could actually notice in a diff or a transcript, not vague warnings.

Both sections exist to give an agent something to check itself against mid-task, not just a philosophy to read once. Keep entries specific to this skill's domain — generic ones ("don't cut corners") are worse than no entry at all, since they crowd out the ones worth remembering.

## Review Checklist

After drafting, verify:

- [ ] Description includes triggers ("Use when...")
- [ ] SKILL.md under 100 lines
- [ ] No time-sensitive info
- [ ] Consistent terminology
- [ ] Concrete examples included
- [ ] References one level deep
- [ ] If the skill enforces a step: Common Rationalizations and Red Flags are present and specific to this skill's domain
