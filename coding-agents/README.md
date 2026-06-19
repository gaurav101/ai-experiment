# Local Personal Coding Agent

A cautious local coding helper in JavaScript. It talks to Ollama with the `mistral` model, can inspect project files, search text, and propose patches. It does not auto-write files.

## What It Can Do

- List project files
- Read project files
- Search text inside the project
- Propose unified-diff patches
- Explain functions, look for bugs, and suggest refactors
- Keep all model calls local through Ollama

## Requirements

- Node.js 18 or newer
- Ollama running locally
- The Mistral model pulled into Ollama

```sh
ollama pull mistral
ollama serve
```

## Run

From this folder:

```sh
npm start
```

Or ask one question directly:

```sh
npm start -- "Explain the function in src/tools.js that protects file paths"
```

Use a different project directory:

```sh
npm start -- --root /path/to/project "Find bugs in the main CLI file"
```

Use a different Ollama model:

```sh
OLLAMA_MODEL=mistral:latest npm start
```

## Example Prompts

```text
Explain this function: src/tools.js safeResolve
```

```text
Find bugs in src/cli.js
```

```text
Suggest a refactor for the agent loop. Propose a patch only.
```

## Safer Agent Design

The agent has four tools:

1. `list_files`: returns files under the project root.
2. `read_file`: reads a file only if it is inside the project root.
3. `search_text`: searches project files for literal text or a regular expression.
4. `propose_patch`: asks the model to produce a unified diff, but does not apply it.

Every filesystem path is resolved against the selected project root, so `../` path escapes are blocked. The agent also runs with a fixed tool allowlist and a small iteration limit to avoid runaway loops.

## Applying Patches

This project intentionally does not apply patches automatically. Review the proposed diff first. If you like it, apply it yourself with your editor or a patch tool.

## Notes

Mistral models in Ollama may vary in how consistently they follow structured tool instructions. This project uses a simple JSON action protocol instead of relying on provider-specific native tool calling, so the same loop is easy to inspect and adapt.
