// index.js
import "./sse-server.js"; // <— Esto levanta Express + /events
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { emitEvent } from "./sse-server.js";

const server = new McpServer({ name: "mcp-better-sse", version: "1.0.0" });

server.tool(
  "create_artboard",
  {
    name: z.string(),
    width: z.number(),
    height: z.number(),
  },
  async ({ name, width, height }) => {
    emitEvent(
      { type: "create_artboard", payload: { name, width, height } },
      "create_artboard",
    );
    return {
      content: [
        {
          type: "text",
          text: `Artboard ${name} creado (${width}×${height})`,
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
