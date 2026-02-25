---
name: prettier
description: Format code with Prettier. MUST be run automatically before creating any git commit and when finishing a coding task.
disable-model-invocation: false
allowed-tools: Bash(npx prettier:*), Bash(yarn prettier:*)
argument-hint: "[files or blank for all src]"
---

Format code with Prettier.

**This skill should be invoked automatically:**
- Before creating any git commit
- When a coding task is complete (after all edits are done)

If `$ARGUMENTS` is provided, run:

```bash
npx prettier --write $ARGUMENTS
```

If no arguments, format the entire src directory:

```bash
yarn prettier
```
