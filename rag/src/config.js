export const DOCS_DIR = process.env.DOCS_DIR || "data/docs";
export const INDEX_FILE = process.env.INDEX_FILE || "data/index.json";

// Ollama Configuration
export const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
export const OLLAMA_EMBED_ENDPOINT = process.env.OLLAMA_EMBED_ENDPOINT || "/api/embeddings";
export const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
export const OLLAMA_GEN_ENDPOINT = process.env.OLLAMA_GEN_ENDPOINT || "/api/generate";
export const OLLAMA_GEN_MODEL = process.env.OLLAMA_MODEL || "mistral";

// LM Studio Configuration (optional, for future use)
export const LMSTUDIO_BASE = process.env.LMSTUDIO_BASE_URL || "http://127.0.0.1:1234";
export const LMSTUDIO_GEN_ENDPOINT = process.env.LMSTUDIO_GEN_ENDPOINT || "/api/v1/chat";
export const LMSTUDIO_GEN_MODEL = process.env.LMSTUDIO_GEN_MODEL || "google/gemma-4-e2b";
