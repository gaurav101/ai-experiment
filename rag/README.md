# Local AI Notes Assistant

A beginner-friendly local AI notes assistant using JavaScript, Ollama, embeddings, and simple RAG.

It reads `.md` and `.txt` files from `data/docs`, creates a local search index, and answers questions using only your notes.

Requirements
- Node.js
- Ollama running locally at http://localhost:11434
- Ollama models:
  - `mistral` for answering
  - `nomic-embed-text` for embeddings

## Quick start

Install dependencies:

```bash
npm install
```

Install the local Ollama models:

```bash
ollama pull mistral
ollama pull nomic-embed-text
```

Make sure Ollama is running:

```bash
ollama serve
```

Add your notes:

```txt
data/docs/my-note.md
data/docs/project-ideas.txt
```

Build the index:

```bash
npm run notes:index
```

Ask a question:

```bash
npm run notes:ask -- "What is RAG?"
```

Open interactive chat:

```bash
npm run notes:chat
```

Summarize your notes:

```bash
npm run notes:summarize -- all
```

Summarize one note:

```bash
npm run notes:summarize -- agentic-ai-notes.md
```

## How it works

1. `src/rag.js` reads local notes from `data/docs`.
2. It splits notes into chunks.
3. Ollama creates embeddings with `nomic-embed-text`.
4. The embeddings are saved in `data/index.json`.
5. When you ask a question, the app finds the most relevant chunks.
6. Ollama answers using those chunks and prints the sources.

## Useful commands

```bash
npm run notes
npm run notes:index
npm run notes:ask -- "Your question"
npm run notes:chat
npm run notes:summarize -- all
```

## Configuration

You can change models with environment variables:

```bash
OLLAMA_MODEL=llama3.1 npm run notes:ask -- "What are my action items?"
OLLAMA_EMBED_MODEL=nomic-embed-text npm run notes:index
```

Defaults live in `src/config.js`.

LM Studio (experimental)
- Run: node src/ask-lmstudio.js "Your question"
- Configure via env vars: LMSTUDIO_BASE_URL, LMSTUDIO_EMBED_ENDPOINT, LMSTUDIO_EMBED_MODEL, LMSTUDIO_GEN_MODEL
- you may get unexpected result with LM Studio and it is not fully tested.
Notes
- OpenAI and LM Studio integrations are under development and may not work as expected.
- Prettier is configured: npm run format or enable format-on-save in VS Code.

Files of interest
- `src/notes-assistant.js` - beginner-friendly CLI
- `src/rag.js` - document reading, chunking, embedding, index/search
- `src/ask-ollama.js` - older direct Ollama question script
- `src/config.js` - centralized constants and env defaults

License: ISC
