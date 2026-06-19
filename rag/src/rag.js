import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import {
  DOCS_DIR as CFG_DOCS_DIR,
  INDEX_FILE as CFG_INDEX_FILE,
  OLLAMA_BASE,
  OLLAMA_EMBED_ENDPOINT,
  OLLAMA_EMBED_MODEL,
} from "./config.js";

dotenv.config({ quiet: true });

const DOCS_DIR = CFG_DOCS_DIR;
const INDEX_FILE = CFG_INDEX_FILE;
const EMBED_MODEL = OLLAMA_EMBED_MODEL;
const FULL_EMBED_URL = OLLAMA_BASE + OLLAMA_EMBED_ENDPOINT;

export async function readDocuments() {
  await fs.mkdir(DOCS_DIR, { recursive: true });
  const files = await fs.readdir(DOCS_DIR, { recursive: true });
  const docs = [];

  for (const file of files) {
    if (!file.endsWith(".txt") && !file.endsWith(".md")) continue;

    const fullPath = path.join(DOCS_DIR, file);
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) continue;

    const text = await fs.readFile(fullPath, "utf8");
    docs.push({ source: file, text });
  }

  return docs;
}

export function chunkText(text, size = 900, overlap = 150) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = start + size;
    chunks.push(text.slice(start, end));
    start += size - overlap;
  }

  return chunks.map((chunk) => chunk.trim()).filter(Boolean);
}

export async function embed(text) {
  const url = FULL_EMBED_URL;
  const body = JSON.stringify({ model: EMBED_MODEL, prompt: text });

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch {
    throw new Error(
      `Could not connect to Ollama at ${OLLAMA_BASE}.\n\n` +
        `Start Ollama, then try again:\n` +
        `  ollama serve\n\n` +
        `If the embedding model is missing, install it:\n` +
        `  ollama pull ${EMBED_MODEL}`
    );
  }

  if (!response.ok) {
    const txt = await response.text();
    // Detect Ollama common errors
    if (txt && txt.toLowerCase().includes("no models loaded")) {
      throw new Error(
        `Ollama has no embedding model loaded (status ${response.status}).\n` +
          `To load the embedding model, run:\n` +
          `  ollama pull ${EMBED_MODEL}\n` +
          `Then ensure Ollama is running:\n` +
          `  ollama serve\n` +
          `Ollama runs at: ${OLLAMA_BASE}`
      );
    }
    throw new Error(
      `Embedding request failed (${OLLAMA_BASE}${OLLAMA_EMBED_ENDPOINT}): ${response.status} ${txt}`
    );
  }

  const data = await response.json();
  // Ollama returns { embedding: [...] }
  if (data?.embedding) return data.embedding;

  throw new Error("Unknown embedding response shape from Ollama");
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function buildIndex() {
  const docs = await readDocuments();
  const records = [];

  for (const doc of docs) {
    const chunks = chunkText(doc.text);

    for (const [i, chunk] of chunks.entries()) {
      records.push({
        id: `${doc.source}#${i}`,
        source: doc.source,
        text: chunk,
        embedding: await embed(chunk),
      });
    }
  }

  await fs.mkdir(path.dirname(INDEX_FILE), { recursive: true });
  await fs.writeFile(INDEX_FILE, JSON.stringify(records, null, 2));
  return records.length;
}

export async function search(query, limit = 4) {
  const raw = await fs.readFile(INDEX_FILE, "utf8");
  const index = JSON.parse(raw);
  const queryEmbedding = await embed(query);

  return index
    .map((item) => ({
      ...item,
      score: cosineSimilarity(queryEmbedding, item.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function formatContext(results) {
  return results
    .map((item, i) => `[${i + 1}] Source: ${item.source}\n${item.text}`)
    .join("\n\n");
}
