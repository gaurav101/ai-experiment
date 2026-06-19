import { generateWithOllama } from "./ollama.js";

const MAX_STEPS = 8;

export async function runAgent({ goal, root, model, verbose = false }) {
  const { createTools } = await import("./tools.js");
  const tools = createTools({ root });
  const messages = [
    {
      role: "system",
      content: buildSystemPrompt(tools)
    },
    {
      role: "user",
      content: goal
    }
  ];

  for (let step = 1; step <= MAX_STEPS; step += 1) {
    const prompt = renderPrompt(messages);
    const raw = await generateWithOllama({ prompt, model });
    const action = parseAction(raw);

    if (verbose) {
      process.stderr.write(`\n[step ${step}] ${JSON.stringify(action)}\n`);
    }

    if (action.type === "final") {
      return action.answer;
    }

    if (action.type !== "tool") {
      messages.push({
        role: "assistant",
        content: raw
      });
      messages.push({
        role: "tool",
        content: JSON.stringify({
          error: "Invalid action. Reply with one JSON object using type final or tool."
        })
      });
      continue;
    }

    const tool = tools[action.name];
    if (!tool) {
      messages.push({
        role: "tool",
        content: JSON.stringify({
          error: `Unknown tool: ${action.name}`,
          allowedTools: Object.keys(tools)
        })
      });
      continue;
    }

    try {
      const result = await tool.run(action.arguments || {});
      messages.push({
        role: "assistant",
        content: JSON.stringify(action)
      });
      messages.push({
        role: "tool",
        content: JSON.stringify({
          tool: action.name,
          result
        })
      });
    } catch (error) {
      messages.push({
        role: "assistant",
        content: JSON.stringify(action)
      });
      messages.push({
        role: "tool",
        content: JSON.stringify({
          tool: action.name,
          error: error.message
        })
      });
    }
  }

  return "I reached the safety step limit before finishing. Try asking a narrower question or naming the exact file.";
}

function buildSystemPrompt(tools) {
  const toolDescriptions = Object.entries(tools)
    .map(([name, tool]) => `- ${name}: ${tool.description} Parameters: ${JSON.stringify(tool.parameters)}`)
    .join("\n");

  return `You are a local personal coding agent.

You help inspect code, explain functions, find bugs, and suggest refactors.
You must be cautious:
- Use tools to inspect files before making claims about project code.
- Never claim that a patch was applied.
- Use propose_patch only for suggested changes.
- Keep final answers concise and practical.
- If a user asks for edits, propose a unified diff instead of writing files.

Available tools:
${toolDescriptions}

Reply with exactly one JSON object and no markdown fences.

To call a tool:
{"type":"tool","name":"read_file","arguments":{"path":"src/example.js"}}

To answer the user:
{"type":"final","answer":"Your answer here."}`;
}

function renderPrompt(messages) {
  return messages
    .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
    .join("\n\n");
}

function parseAction(raw) {
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      return {
        type: "invalid",
        raw
      };
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return {
        type: "invalid",
        raw
      };
    }
  }
}
