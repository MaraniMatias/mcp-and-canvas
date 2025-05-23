# mcp-git-commit

A simple examplet to create MCP Server ([modelcontextprotocol.io](https://modelcontextprotocol.io/introduction))


![./test_imge.png](./test_imge.png)


To install dependencies:

- [typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [https://www.npmjs.com/package/simple-git](https://www.npmjs.com/package/simple-git)

```bash
bun install
```

To run:

```bash
bun start
```

To dev:

```bash
bun dev
```

This project was created using `bun init` in bun v1.2.13. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

You can test it with [ollama](https://ollama.com/) and [mcphost](https://github.com/mark3labs/mcphost)
```jsonc
// nvim ~/.mcp.json
{
  "mcpServers": {
    "git-commit": {
      "command": "node",
      "args": ["../../mcp-git-commit/index.js"],
      "env": {
        "PWD": "",
      },
    },
  },
}
```

```bash
ollama server
mcphost -m ollama:qwen3:8b
```
