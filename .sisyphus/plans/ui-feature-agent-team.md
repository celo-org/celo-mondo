# UI Feature Agent Team Specification

## Team Composition & Workflow

### Phase 0 — Reconnaissance

| Role       | Agent                     | Purpose                                                             |
| ---------- | ------------------------- | ------------------------------------------------------------------- |
| Analyst    | `metis`                   | Analyze requirements, catch ambiguities, identify hidden complexity |
| Scout      | `explore` (x2-3 parallel) | Find existing UI patterns, component conventions, styling approach  |
| Researcher | `librarian`               | Pull external docs/examples for unfamiliar libraries                |

### Phase 1 — Planning

| Role      | Agent                   | Purpose                                                 |
| --------- | ----------------------- | ------------------------------------------------------- |
| Architect | Sisyphus (orchestrator) | Synthesize recon into a concrete implementation plan    |
| Critic    | `momus`                 | Review plan for gaps, missing edge cases, unclear specs |

### Phase 2 — Builder

| Role    | Agent                                          | Purpose                              |
| ------- | ---------------------------------------------- | ------------------------------------ |
| Builder | `task(category="visual-engineering")`          | Implements the UI feature            |
|         | + skills: `frontend-ui-ux`, `lint`, `prettier` | Design sense + code quality baked in |

### Phase 3 — Tester

| Role   | Agent                          | Purpose                               |
| ------ | ------------------------------ | ------------------------------------- |
| Tester | `task(category="deep")`        | Writes and runs tests                 |
|        | + skills: `playwright`, `lint` | Browser automation + E2E verification |

### Phase 4 — QA

| Role        | Agent               | Purpose                                                               |
| ----------- | ------------------- | --------------------------------------------------------------------- |
| QA Reviewer | `momus`             | Code review — checks implementation against plan, catches regressions |
| Type Check  | `lsp_diagnostics`   | Zero tolerance for type errors                                        |
| Lint/Format | `lint` + `prettier` | Enforce project standards                                             |

### Phase 5 — Approver

| Role               | Agent    | Purpose                                                                |
| ------------------ | -------- | ---------------------------------------------------------------------- |
| Technical Approver | `oracle` | Final architecture/security/performance review (highest-quality model) |
| Human Approver     | **User** | Final sign-off before commit                                           |

---

## Flow Diagram

```
metis + explore + librarian  →  Plan  →  momus review
         ↓                                    ↓
    [approved plan]  →  Builder  →  Tester  →  QA (momus)
                                                  ↓
                                        oracle  →  User ✅
```

## Design Decisions

- **momus appears twice** — once to review the _plan_, once to review the _code_. Catching mistakes early is 10x cheaper.
- **oracle only at the end** — expensive model, used as final gate not for exploration.
- **Builder uses `visual-engineering`** — model-optimized for frontend work, paired with `frontend-ui-ux` skill.
- **Tester uses `deep`** — thorough, goal-oriented testing that goes beyond happy paths.
- **All phases gate** — no phase starts until the previous one passes. Fail fast, fix early.

## Agent Cost Profile

| Agent       | Cost      | Usage Strategy                           |
| ----------- | --------- | ---------------------------------------- |
| `explore`   | Free      | Fire liberally, always background        |
| `librarian` | Cheap     | Fire proactively for external references |
| `metis`     | Expensive | Once per feature, pre-planning only      |
| `momus`     | Expensive | Twice: plan review + code review         |
| `oracle`    | Expensive | Once: final approval gate                |
| Builder     | Medium    | One task per feature component           |
| Tester      | Medium    | One task per test suite                  |
