import { formatContext, search } from "../rag.js";
import { BASE_URL, LMSTUDIO_GEN_ENDPOINT, LMSTUDIO_GEN_MODEL } from "../config.js";
import { parseModelResponse } from "../llm-utils.js";

const BASE = BASE_URL;
const GEN_ENDPOINT = LMSTUDIO_GEN_ENDPOINT;
const MODEL = process.env.LMSTUDIO_GEN_MODEL || LMSTUDIO_GEN_MODEL;

const question = process.argv.slice(2).join(" ") || "What plans support SSO?";
const results = await search(question);
const context = formatContext(results);

const prompt = `Answer using only the context below. If the answer is missing, say you do not know.\n\nContext:\n${context}\n\nQuestion:\n${question}`;

// LM Studio chat API expects messages array
const resp = await fetch(BASE + GEN_ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], max_tokens: 512, temperature: 0.2 })
});

if (!resp.ok) {
  const txt = await resp.text();
  throw new Error(`LMStudio generation failed: ${resp.status} ${txt}`);
}

const bodyText = await resp.text();
const output = parseModelResponse(bodyText);
console.log(output);
