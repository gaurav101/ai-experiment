import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import dotenv from "dotenv";
import { buildIndex, formatContext, readDocuments, search } from "./rag.js";
import {
  DOCS_DIR,
  INDEX_FILE,
  OLLAMA_BASE,
  OLLAMA_GEN_ENDPOINT,
  OLLAMA_GEN_MODEL,
} from "./config.js";

dotenv.config({ quiet: true });

const MODEL = process.env.OLLAMA_MODEL || OLLAMA_GEN_MODEL;
const OLLAMA_GEN_URL = OLLAMA_BASE + OLLAMA_GEN_ENDPOINT;

const commands = new Set(["index", "ask", "chat", "summarize", "help"]);
const [maybeCommand, ...rest] = process.argv.slice(2);
const command = commands.has(maybeCommand) ? maybeCommand : "help";
const args = commands.has(maybeCommand) ? rest : process.argv.slice(2);

async function generate(prompt) {
  let response;
  try {
    response = await fetch(OLLAMA_GEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 700,
        },
      }),
    });
  } catch {
    throw new Error(
      `Could not connect to Ollama at ${OLLAMA_BASE}.\n\n` +
        `Start Ollama, then try again:\n` +
        `  ollama serve\n\n` +
        `If the chat model is missing, install it:\n` +
        `  ollama pull ${MODEL}`
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Ollama generation failed (${response.status}).\n\n${text}\n\nTry:\n  ollama pull ${MODEL}\n  ollama serve`
    );
  }

  const data = await response.json();
  return String(data.response || "").trim();
}

function buildAnswerPrompt(question, context) {
  return `You are a local notes assistant.
Answer using only the context below.
If the notes do not contain the answer, say: "I do not know from your notes."
Keep the answer clear and beginner-friendly.

Context:
${context}

Question:
${question}`;
}

function printSources(results) {
  console.log("\nSources:");
  for (const result of results) {
    console.log(`- ${result.source} (${result.score.toFixed(3)})`);
  }
}

async function ask(question) {
  if (!question) {
    console.log(
      'Ask a question, for example:\n  npm run notes:ask -- "What did I learn about embeddings?"'
    );
    return;
  }

  await ensureIndexExists();
  const results = await search(question, 4);
  const context = formatContext(results);
  const answer = await generate(buildAnswerPrompt(question, context));
  console.log(`\n${answer}`);
  printSources(results);
}

async function chat() {
  await ensureIndexExists();
  const rl = readline.createInterface({ input, output });

  console.log("Local AI Notes Assistant");
  console.log('Type a question, or "exit" to quit.\n');

  while (true) {
    const question = (await rl.question("> ")).trim();
    if (!question || ["exit", "quit", ":q"].includes(question.toLowerCase()))
      break;

    try {
      await ask(question);
      console.log("");
    } catch (error) {
      console.error(`\n${error.message}\n`);
    }
  }

  rl.close();
}

async function summarize(target) {
  const docs = await readDocuments();

  if (docs.length === 0) {
    console.log(
      `No notes found in ${DOCS_DIR}. Add .md or .txt files, then try again.`
    );
    return;
  }

  const selected =
    target && target !== "all"
      ? docs.filter((doc) => doc.source.includes(target))
      : docs;

  if (selected.length === 0) {
    console.log(`No matching note found for "${target}".`);
    console.log("Available notes:");
    for (const doc of docs) console.log(`- ${doc.source}`);
    return;
  }

  for (const doc of selected) {
    const prompt = `Summarize this note in 5 concise bullets. Then list any action items.

Source: ${doc.source}

${doc.text}`;
    const summary = await generate(prompt);
    console.log(`\n## ${doc.source}\n${summary}\n`);
  }
}

async function ensureIndexExists() {
  try {
    await fs.access(INDEX_FILE);
  } catch {
    console.log(`No index found at ${INDEX_FILE}. Building it now...`);
    const count = await buildIndex();
    console.log(`Indexed ${count} chunks.\n`);
  }
}

function help() {
  console.log(`Local AI Notes Assistant

Commands:
  npm run notes:index
  npm run notes:ask -- "Your question"
  npm run notes:chat
  npm run notes:summarize -- all
  npm run notes:summarize -- meeting-notes.md

Setup:
  ollama pull ${MODEL}
  ollama pull nomic-embed-text
  ollama serve

Notes folder:
  ${path.resolve(DOCS_DIR)}`);
}

try {
  if (command === "index") {
    const count = await buildIndex();
    console.log(`Indexed ${count} chunks from ${DOCS_DIR}.`);
  } else if (command === "ask") {
    await ask(args.join(" "));
  } else if (command === "chat") {
    await chat();
  } else if (command === "summarize") {
    await summarize(args.join(" ") || "all");
  } else {
    help();
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
