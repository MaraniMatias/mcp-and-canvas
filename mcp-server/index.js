// MCP Server imports
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import fetch from "node-fetch";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

const server = new McpServer({
  name: "mcp-x-studio",
  version: "1.0.0",
});

server.tool("get-canvas", async () => {
  try {
    const res = await fetch(`${SERVER_URL}/canvas`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const canvas = await res.json();
    const payload = JSON.stringify(canvas);
    return {
      content: [
        {
          type: "text",
          text: payload,
        },
        {
          type: "resource",
          resource: {
            uri: `${SERVER_URL}/canvas`,
            mimeType: "application/json",
            text: payload,
          },
        },
      ],
    };
  } catch (err) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: "Error al obtener el canvas",
        },
      ],
    };
  }
});

server.tool(
  "save-canvas",
  {
    css: z.string().max(1000).optional(),
    artboard: z
      .object({
        id: z.string().min(1).max(1000),
        type: z.enum("div"),
        width: z.string().optional(),
        height: z.string().optional(),
        background: z.string().optional(),
        children: z
          .array(
            z.object({
              id: z.string().min(1).max(1000),
              types: z.enum(["div", "span", "p", "img"]),
              top: z.string().optional(),
              left: z.string().optional(),
              border: z.string().optional(),
              width: z.string().optional(),
              height: z.string().optional(),
              background: z.string().optional(),
              animation: z.string().optional(),
            }),
          )
          .optional(),
      })
      .required(),
  },
  async ({ css, artboard }) => {
    try {
      const payload = { css, artboard };
      const res = await fetch(`${SERVER_URL}/canvas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const canvas = await res.json();
      return {
        content: [
          {
            type: "text",
            text: "Canvas guardado exitosamente",
          },
          {
            type: "resource",
            resource: {
              uri: `${SERVER_URL}/canvas`,
              mimeType: "application/json",
              text: JSON.stringify(canvas),
            },
          },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "Error al guardar el canvas",
          },
        ],
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
