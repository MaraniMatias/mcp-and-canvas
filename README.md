# LLM to Canvas concept

A simple example to create MCP Server ([modelcontextprotocol.io](https://modelcontextprotocol.io/introduction)) 

[MCP for beginners](https://github.com/microsoft/mcp-for-beginners/tree/main)

## This example

![screenshot](./screenshot.png)

## How MCP Servers Work

```mermaid
graph TD
    User -->|Prompt| LLM["LLM (App Host)"]
    LLM -->|Response| User
    LLM -->|MCP| Server
    Server --> KnowledgeA
    Server --> ToolsA

    subgraph Server A["Server"]
        KnowledgeA[Knowledge]
        ToolsA[Tools]
    end
```

Bibliografía: [How MCP Servers Work](https://github.com/microsoft/mcp-for-beginners/blob/main/00-Introduction/README.md#how-mcp-servers-work)


To install dependencies:

- [typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [https://www.npmjs.com/package/simple-git](https://www.npmjs.com/package/simple-git)

```bash
bun install
```

To run:

```bash
bun server
bun mcp:start
```

To dev:

```bash
bun mcp:dev
```

This project was created using `bun init` in bun v1.2.13. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

You can test it with [ollama](https://ollama.com/) and [mcphost](https://github.com/mark3labs/mcphost)

```jsonc
// nvim ~/.mcp.json
{
  "mcpServers": {
    "mcp-and-canvas": {
      "command": "node",
      "args": ["../../mcp-and-canvas/server/index.js"],
      "env": {
        "SERVER_URL": "http://localhost:3000",
      },
    },
  },
}
```

```bash
ollama server
mcphost -m ollama:qwen3:8b
```
