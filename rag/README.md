# local-rag

Lightweight RAG example using local LLMs (Ollama / LM Studio) and OpenAI (experimental).

Requirements
- Node.js
- Ollama running locally at http://localhost:11434 with a model loaded (for ask-ollama)
- LM Studio running locally at http://127.0.0.1:1234 (optional/experimental)

Quick start (Ollama)
1. npm install
2. Place docs (TXT/MD) in data/docs/
3. npm run index
4. npm run ask:ollama -- "Your question"  OR
   node src/ask-ollama.js "Your question"

LM Studio (experimental)
- Run: node src/ask-lmstudio.js "Your question"
- Configure via env vars: LMSTUDIO_BASE_URL, LMSTUDIO_EMBED_ENDPOINT, LMSTUDIO_EMBED_MODEL, LMSTUDIO_GEN_MODEL
- you may get unexpected result with LM Studio and it is not fully tested.
Notes
- OpenAI and LM Studio integrations are under development and may not work as expected.
- Prettier is configured: npm run format or enable format-on-save in VS Code.

Files of interest
- src/rag.js — document reading, chunking, embedding, index/search
- src/ask-ollama.js — Ollama adapter (stable)
- src/other-model/ask-lmstudio.js — LM Studio adapter (experimental)
- src/llm-utils.js — response parser
- src/config.js — centralized constants and env defaults

License: ISC
