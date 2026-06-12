mcp — Model Context Protocol example server

Purpose

This repository contains a minimal MCP (Model Context Protocol) server (index.js) exposing a "get-repo-stats" tool. This README explains how to run the server and connect model-side clients (Codex/OpenAI, Gemini, Claude) using MCP transports supported by @modelcontextprotocol/sdk.

Prerequisites

- Node.js >= 18
- npm install (already has @modelcontextprotocol/sdk dependency)

Run the server

1. Install deps:
   npm install

2. Start the server (root of this repo):
   node index.js

Basic idea

MCP separates server (tool implementations) and client (model-facing) via a transport. Two common transports are:
- stdio: spawn the server as a child process and communicate over stdin/stdout
- HTTP/WebSocket: use an HTTP endpoint the model provider calls

Node client examples

1) Connecting via stdio (spawn server process)

```js
// client-stdio.js (run in Node)
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({ command: 'node', args: ['index.js'] });
const client = new Client({ name: 'example-client', version: '1.0.0' });

await client.connect(transport);
// client now speaks MCP to the server process

// Example: call listTools or call tool via client API (see SDK docs)
// await client.listTools();
```

2) Connecting via HTTP (use when model host supports calling a public HTTP server)

```js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const serverUrl = new URL('https://your-mcp-server.example/api/mcp');
const transport = new StreamableHTTPClientTransport(serverUrl);
const client = new Client({ name: 'http-client', version: '1.0.0' });
await client.connect(transport);
```

Integration notes for model providers

- OpenAI Codex / ChatGPT (tooling / function-calling):
  - Codex/GPT doesn't natively speak MCP. Run the MCP server as an external tool and implement a small adapter that translates model function calls into MCP client calls (stdio or HTTP) and returns results to the model.
  - Example pattern: spawn the server and attach a function-calling handler that invokes client.callTool or client.callToolWithParams.

- Google Gemini:
  - If Gemini is hosted via a platform that can call out to an HTTP service, use StreamableHTTPClientTransport and expose your server at a reachable URL. Otherwise, run Gemini adapter code that spawns the MCP server and bridges function/tool calls to the client.

- Anthropic Claude:
  - Anthropic workstreams that support MCP or external tool processes can use the StdioClientTransport pattern. If your Claude integration expects HTTP callbacks, prefer StreamableHTTPClientTransport.
  - Anthropic maintains MCP-compatible tooling — consult the provider docs for hosting models with external tool/daemon integrations.

Security & deployment

- If exposing the server over HTTP, add auth (API keys or OAuth) and TLS.
- When spawning processes, ensure env sanitization and do not leak secrets to child processes.

References

- @modelcontextprotocol/sdk docs: https://modelcontextprotocol.io
- Check the SDK examples in node_modules/@modelcontextprotocol/sdk/dist/esm/examples for transport and client usage

If you want, a small adapter script can be added that demonstrates spawning the server and wiring a sample model invocation flow for Codex/GPT, Gemini, or Claude—tell me which provider to target and whether to use stdio or HTTP and an example will be added.
