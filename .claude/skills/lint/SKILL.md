---
name: lint
description: Run ESLint to check for code issues. MUST be run automatically before creating any git commit and when finishing a coding task.
disable-model-invocation: false
allowed-tools: Bash(yarn lint:*), Bash(npx next lint:*)
---

Run the project linter:

```bash
yarn lint
```

**This skill should be invoked automatically:**
- Before creating any git commit
- When a coding task is complete (after all edits are done)

If lint errors are found, fix them before proceeding.
