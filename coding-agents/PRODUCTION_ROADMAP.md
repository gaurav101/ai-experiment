# Production Readiness Roadmap

## Purpose

This document is a handoff plan for future AI agents and developers who will make the Local Personal Coding Agent production ready.

The current application is intentionally small and safe:

- It runs locally with Ollama and Mistral.
- It can list files, read files, search text, and propose patches.
- It does not automatically write files.

The production goal is to keep that safety posture while improving reliability, testability, observability, configuration, and user experience.

## Guiding Principles for AI Agents

Any AI agent working on this project must follow these rules:

1. Preserve the default propose-only behavior.
2. Do not add automatic file writing without explicit user confirmation.
3. Keep filesystem access scoped to the selected project root.
4. Add tests before or alongside risky behavior changes.
5. Prefer small, reviewable changes.
6. Update documentation when behavior changes.
7. Do not add shell execution tools by default.
8. Treat `src/tools.js` as a security boundary.

## Current Baseline

Important files:

- `src/cli.js`: CLI and REPL entrypoint.
- `src/agent.js`: model loop and tool dispatch.
- `src/tools.js`: safe filesystem tools.
- `src/ollama.js`: local Ollama API client.
- `README.md`: user-facing setup and usage.
- `ARCHITECTURE_KT.md`: developer handover document.

Current tools:

- `list_files`
- `read_file`
- `search_text`
- `propose_patch`

Current safety controls:

- Path traversal is blocked by `safeResolve`.
- Large files are rejected.
- Tool names are allowlisted.
- Agent loop has a max step limit.
- Patch proposals are not applied.

## Roadmap Summary

| Phase | Theme | Outcome |
| --- | --- | --- |
| Phase 1 | Tests and safety validation | Confidence in core tools |
| Phase 2 | Model action validation | More reliable tool calling |
| Phase 3 | Config system | Per-project customization |
| Phase 4 | Patch validation and preview | Safer proposed changes |
| Phase 5 | Better search and indexing | Faster codebase inspection |
| Phase 6 | Observability | Easier debugging and audits |
| Phase 7 | Optional apply workflow | Human-approved file edits |
| Phase 8 | Local web UI | Production-quality user experience |
| Phase 9 | Packaging and CI | Reliable installation and releases |

## Phase 1: Tests and Safety Validation

### Goal

Add automated tests around the most important safety and tool behavior.

### Recommended Changes

Add a test framework:

```sh
npm install --save-dev vitest
```

Update `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Add tests for:

- `safeResolve`
- `list_files`
- `read_file`
- `search_text`
- `propose_patch`

Recommended file layout:

```text
test
├── tools.test.js
└── fixtures
    ├── sample-project
    │   ├── src
    │   │   └── index.js
    │   └── README.md
    └── outside.txt
```

### Acceptance Criteria

- `npm test` passes.
- Path traversal attempts are covered.
- Large file behavior is covered.
- Missing file and directory errors are covered.
- `npm run check` still passes.

### Notes for AI Agents

Do not weaken `safeResolve` to make tests pass. The path boundary is intentional.

## Phase 2: Model Action Validation

### Goal

Make model responses more reliable by validating actions before tool execution.

### Recommended Changes

Add a schema validation library such as `zod`:

```sh
npm install zod
```

Create:

```text
src/action-schema.js
```

Validate these action shapes:

```js
{
  type: "tool",
  name: string,
  arguments: object
}
```

```js
{
  type: "final",
  answer: string
}
```

Update `src/agent.js`:

- Parse model output.
- Validate parsed action.
- If invalid, return a structured error to the model.
- Keep retry behavior within `MAX_STEPS`.

### Acceptance Criteria

- Invalid JSON does not crash the CLI.
- Invalid action shape does not execute a tool.
- Unknown tools are rejected.
- Tests cover valid and invalid actions.

### Notes for AI Agents

Validation should protect execution. Do not trust model output just because it parses as JSON.

## Phase 3: Config System

### Goal

Allow project-specific configuration without editing source code.

### Recommended Changes

Add support for:

```text
agent.config.json
```

Example:

```json
{
  "model": "mistral",
  "ollamaBaseUrl": "http://127.0.0.1:11434",
  "maxSteps": 8,
  "maxReadBytes": 80000,
  "maxSearchFileBytes": 250000,
  "ignoreDirectories": [
    ".git",
    "node_modules",
    "dist",
    "build",
    "coverage"
  ],
  "allowApplyPatch": false
}
```

Create:

```text
src/config.js
```

Responsibilities:

- Load defaults.
- Read optional `agent.config.json`.
- Merge CLI overrides.
- Validate config.

### Acceptance Criteria

- App works without a config file.
- Invalid config fails with a clear error.
- CLI flags override config values.
- README documents config options.

### Notes for AI Agents

Default behavior must remain safe. `allowApplyPatch` should default to `false`.

## Phase 4: Patch Validation and Preview

### Goal

Make patch proposals safer and easier to review.

### Recommended Changes

Create:

```text
src/patches.js
```

Responsibilities:

- Parse unified diff text.
- Extract touched file paths.
- Verify paths stay inside project root.
- Reject binary patches.
- Reject patches touching ignored directories.
- Return a structured preview.

Example preview:

```json
{
  "valid": true,
  "files": [
    {
      "path": "src/tools.js",
      "additions": 12,
      "deletions": 3
    }
  ],
  "warnings": []
}
```

Update `propose_patch`:

- Keep it non-writing.
- Validate patch shape.
- Return preview metadata with the proposal.

### Acceptance Criteria

- Proposed patches are still not applied.
- Invalid patch text returns warnings or validation errors.
- Path traversal in patch headers is rejected.
- Tests cover patch validation.

### Notes for AI Agents

Do not implement patch applying in this phase. This phase is only about safer proposals.

## Phase 5: Better Search and Indexing

### Goal

Improve speed and relevance when inspecting larger projects.

### Recommended Changes

Options:

1. Use JavaScript-only search for portability.
2. Prefer `ripgrep` when available, with JavaScript fallback.

Suggested approach:

- Keep current JS search as fallback.
- Add a helper that detects `rg`.
- Respect `.gitignore` where possible.
- Add binary-file detection.
- Add result snippets with nearby context lines.

Create:

```text
src/search.js
```

### Acceptance Criteria

- Search still works without `rg`.
- Search is faster when `rg` is installed.
- Binary files are skipped.
- Results include file, line, and text.

### Notes for AI Agents

Do not make `rg` a hard dependency unless the README and installation flow are updated.

## Phase 6: Observability

### Goal

Make agent behavior debuggable and auditable.

### Recommended Changes

Add structured logging:

```text
src/logger.js
```

Log events:

- Agent start
- Model request
- Model response parse success/failure
- Tool call
- Tool result
- Tool error
- Step limit reached

Add CLI options:

- `--verbose`: current behavior, human-readable stderr.
- `--debug`: more detailed logs.
- `--log-file <path>`: optional local transcript/log file.

Log format recommendation:

```json
{
  "timestamp": "2026-06-17T10:00:00.000Z",
  "level": "info",
  "event": "tool_call",
  "tool": "read_file",
  "arguments": {
    "path": "src/tools.js"
  }
}
```

### Acceptance Criteria

- Normal CLI output remains clean.
- Debug logs help diagnose invalid model JSON.
- Tool calls are auditable.
- Sensitive file contents are not logged by default.

### Notes for AI Agents

Do not log full file contents unless the user explicitly enables transcript-level debugging.

## Phase 7: Optional Apply Workflow

### Goal

Allow file edits only after explicit human approval.

### Recommended Changes

Keep `propose_patch` unchanged as the default model-facing tool.

Add a separate CLI-level workflow:

```sh
npm start -- --apply reviewed.patch
```

or interactive confirmation:

```text
Apply this patch? Type "yes, apply this patch" to continue:
```

Implementation requirements:

- Validate the patch first.
- Show affected files.
- Require exact confirmation text.
- Apply only inside project root.
- Create a backup or require clean git status.
- Print a clear summary after applying.

### Acceptance Criteria

- Patch application is disabled by default.
- A user must explicitly confirm.
- Path traversal is rejected.
- Tests cover safe and unsafe patch application.

### Notes for AI Agents

Do not expose an `apply_patch` model tool at first. Keep applying as a user-controlled CLI action.

## Phase 8: Local Web UI

### Goal

Provide a production-quality local app experience.

### Recommended Changes

Recommended stack:

- Vite
- React
- Express or Fastify local backend
- Monaco Editor for code viewing

Suggested layout:

- Left panel: file tree
- Main panel: chat and responses
- Right panel or modal: patch preview
- Toolbar: model selector, root selector, debug toggle

Core UX:

- Ask questions about files.
- Click files to inspect.
- View tool calls.
- Review proposed diffs.
- Accept or reject patches only if apply workflow exists.

### Acceptance Criteria

- Local-only by default.
- No remote service required except local Ollama.
- Patch preview is readable.
- UI does not apply changes without confirmation.

### Notes for AI Agents

Do not replace the CLI. The web UI should be an additional surface.

## Phase 9: Packaging and CI

### Goal

Make the project easy to install, verify, and release.

### Recommended Changes

Add:

- ESLint
- Prettier
- GitHub Actions or local CI script
- Release notes
- Versioning policy

Recommended scripts:

```json
{
  "scripts": {
    "check": "node --check ./src/cli.js && node --check ./src/agent.js && node --check ./src/tools.js && node --check ./src/ollama.js",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --write .",
    "ci": "npm run check && npm test && npm run lint"
  }
}
```

### Acceptance Criteria

- `npm run ci` passes locally.
- README includes install and release instructions.
- Package can be installed globally.
- Version changes are documented.

### Notes for AI Agents

Avoid adding heavy dependencies without a clear reason.

## Suggested Implementation Order

Recommended first milestone:

1. Add Vitest.
2. Add tests for `src/tools.js`.
3. Add action schema validation.
4. Add tests for model action parsing/validation.
5. Add `agent.config.json` support.

Recommended second milestone:

1. Add patch validation.
2. Add patch preview metadata.
3. Improve search.
4. Add debug logging.

Recommended third milestone:

1. Add optional patch apply workflow.
2. Add local web UI.
3. Add packaging and CI.

## Agent Task Template

Future AI agents can use this template when implementing a roadmap item:

```md
## Task

Implement: <roadmap item>

## Constraints

- Preserve propose-only behavior unless this task explicitly implements user-confirmed apply.
- Keep all file access scoped to project root.
- Add or update tests.
- Update README or KT docs if behavior changes.

## Files to Inspect First

- src/cli.js
- src/agent.js
- src/tools.js
- src/ollama.js
- ARCHITECTURE_KT.md
- PRODUCTION_ROADMAP.md

## Acceptance Criteria

- npm run check passes.
- npm test passes if tests exist.
- Behavior is documented.
- Safety model is not weakened.
```

## Definition of Production Ready

This project can be considered production ready when:

- Core safety behavior is covered by tests.
- Model actions are schema validated.
- Patch proposals are validated before display.
- Optional writes require explicit human approval.
- Configuration is documented and validated.
- Debug logs are available.
- The app handles common Ollama failures clearly.
- CI runs checks, tests, and linting.
- README and KT docs are current.

## Final Note for AI Agents

The purpose of this project is not to build the most powerful autonomous coding agent. The purpose is to build a trustworthy local coding helper.

When in doubt, choose the safer behavior:

- Inspect before answering.
- Propose before editing.
- Validate before executing.
- Ask for human approval before writing.
