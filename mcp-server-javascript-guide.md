# Building Your First MCP Server in JavaScript (Beginner Guide)

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants like Claude connect to external tools and data sources. Think of it as a plugin system: you write a small server that exposes "tools," and the AI can call those tools to fetch real data or perform actions — instead of just guessing.

In this guide, we'll build a simple MCP server in JavaScript that exposes a tool to fetch **GitHub repository stats** (stars, forks, open issues). It's a great real-world example because as a developer, you probably check repo stats all the time — now Claude can do it for you.

## Prerequisites

- Node.js (v18 or later)
- Basic knowledge of JavaScript and npm
- Claude Desktop installed (to test the server)

## Step 1: Set Up the Project

```bash
mkdir github-stats-mcp
cd github-stats-mcp
npm init -y
npm install @modelcontextprotocol/sdk
```

## Step 2: Create the Server File

Create a file called `index.js`:

```javascript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 1. Create the server
const server = new McpServer({
  name: "github-stats-server",
  version: "1.0.0",
});

// 2. Define a tool: get-repo-stats
server.tool(
  "get-repo-stats",
  "Get star count, fork count, and open issues for a GitHub repo",
  {
    owner: z.string().describe("GitHub username or org, e.g. 'facebook'"),
    repo: z.string().describe("Repository name, e.g. 'react'"),
  },
  async ({ owner, repo }) => {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`
    );

    if (!response.ok) {
      return {
        content: [
          { type: "text", text: `Could not find repo: ${owner}/${repo}` },
        ],
      };
    }

    const data = await response.json();

    return {
      content: [
        {
          type: "text",
          text: `${owner}/${repo} — ⭐ ${data.stargazers_count} stars, 🍴 ${data.forks_count} forks, 🐛 ${data.open_issues_count} open issues`,
        },
      ],
    };
  }
);

// 3. Start the server using stdio (standard input/output)
const transport = new StdioServerTransport();
await server.connect(transport);
```

### What's happening here?

- `McpServer` creates the server instance with a name and version.
- `server.tool(...)` registers a tool with a **name**, a **description** (so Claude knows when to use it), an **input schema** (using `zod` for validation), and a **handler function** that does the actual work.
- The handler calls the public GitHub API and returns a formatted text response.
- `StdioServerTransport` lets Claude Desktop communicate with your server over standard input/output — the simplest way to run a local MCP server.

## Step 3: Connect It to Claude Desktop

Open Claude Desktop's configuration file (`claude_desktop_config.json`) and add your server:

```json
{
  "mcpServers": {
    "github-stats": {
      "command": "node",
      "args": ["/absolute/path/to/github-stats-mcp/index.js"]
    }
  }
}
```

Restart Claude Desktop. You should now see "github-stats" listed as an available tool.

## Step 4: Try It Out

Ask Claude something like:

> "What are the stats for the facebook/react repo?"

Claude will recognize it needs the `get-repo-stats` tool, call your server with `owner: "facebook"` and `repo: "react"`, and respond with live data straight from GitHub.

## Where to Go Next

- Add more tools, like `list-open-issues` or `get-latest-release`.
- Add **resources** to expose read-only data (e.g., a `README.md` file).
- Add **authentication** if your tool needs to access private APIs (e.g., your own GitHub token for private repos).
- Package your server as an npm CLI so others can install and run it easily.

That's it — you've built a working MCP server that gives Claude a real-world superpower: live access to GitHub data!
