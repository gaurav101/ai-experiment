import { formatContext, search } from "./rag.js";
import {
    OLLAMA_BASE,
    OLLAMA_GEN_ENDPOINT,
    OLLAMA_GEN_MODEL
} from './config.js';

const MODEL = process.env.OLLAMA_MODEL || OLLAMA_GEN_MODEL;
const OLLAMA_GEN_URL = OLLAMA_BASE + OLLAMA_GEN_ENDPOINT;

const question = process.argv.slice(2).join(" ") || "What plans support SSO?";
const results = await search(question);
const context = formatContext(results);

const prompt = `Answer using only the context below. If the answer is missing, say you do not know.\n\nContext:\n${context}\n\nQuestion:\n${question}`;

const resp = await fetch(OLLAMA_GEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt, max_tokens: 512, temperature: 0.2 })
});

if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Ollama generation failed: ${resp.status} ${txt}`);
}

// Ollama streams response as newline-delimited JSON (NDJSON)
const bodyText = await resp.text();
const lines = bodyText.trim().split('\n').filter(line => line.length > 0);

let fullResponse = '';
for (const line of lines) {
    try {
        const json = JSON.parse(line);
        if (json.response) {
            fullResponse += json.response;
        }
        if (json.done === true) {
            break;
        }
    } catch (e) {
        // ignore parse errors on incomplete lines
    }
}

console.log(fullResponse.trim());
