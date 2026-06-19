#!/usr/bin/env node
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { runAgent } from "./agent.js";

const args = process.argv.slice(2);
const options = parseArgs(args);

if (options.help) {
  printHelp();
  process.exit(0);
}

const root = options.root || process.cwd();
const model = options.model || process.env.OLLAMA_MODEL || "mistral";

if (options.goal) {
  await runOnce({ goal: options.goal, root, model, verbose: options.verbose });
} else {
  await runRepl({ root, model, verbose: options.verbose });
}

async function runOnce({ goal, root, model, verbose }) {
  try {
    const answer = await runAgent({ goal, root, model, verbose });
    output.write(`${answer}\n`);
  } catch (error) {
    output.write(formatError(error));
    process.exitCode = 1;
  }
}

async function runRepl({ root, model, verbose }) {
  output.write(`Local coding agent using Ollama model "${model}"\n`);
  output.write(`Project root: ${root}\n`);
  output.write("Ask a question, or type /exit.\n\n");

  const rl = readline.createInterface({ input, output });
  try {
    while (true) {
      const goal = await rl.question("> ");
      if (!goal.trim()) continue;
      if (goal.trim() === "/exit") break;

      await runOnce({ goal, root, model, verbose });
      output.write("\n");
    }
  } finally {
    rl.close();
  }
}

function parseArgs(rawArgs) {
  const parsed = {
    root: undefined,
    model: undefined,
    goal: "",
    verbose: false,
    help: false
  };

  const goalParts = [];
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--verbose" || arg === "-v") {
      parsed.verbose = true;
    } else if (arg === "--root") {
      parsed.root = rawArgs[index + 1];
      index += 1;
    } else if (arg === "--model") {
      parsed.model = rawArgs[index + 1];
      index += 1;
    } else {
      goalParts.push(arg);
    }
  }

  parsed.goal = goalParts.join(" ").trim();
  return parsed;
}

function printHelp() {
  output.write(`Local Personal Coding Agent

Usage:
  npm start
  npm start -- "Explain src/tools.js"
  npm start -- --root /path/to/project "Find bugs"

Options:
  --root <path>    Project root to inspect. Defaults to current directory.
  --model <name>   Ollama model name. Defaults to OLLAMA_MODEL or mistral.
  --verbose        Print tool loop actions to stderr.
  --help           Show this help.
`);
}

function formatError(error) {
  const hint = error.message.includes("fetch failed")
    ? "\nIs Ollama running? Try: ollama serve\n"
    : "";

  return `Error: ${error.message}${hint}\n`;
}
