// MCP Server imports
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import nodeFetch from "node-fetch";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

async function fetch(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await nodeFetch(url, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      throw new Error(`http ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return { data, res };
  } catch (err) {
    throw err;
  } finally {
    clearTimeout(id);
  }
}

const server = new McpServer({
  name: "mcp-x-studio",
  version: "1.0.0",
});

server.tool("get-current-canvas", async () => {
  try {
    const { data: canvas } = await fetch(`${SERVER_URL}/canvas`, {
      method: "GET",
    });

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
        width: z.string().optional(),
        height: z.string().optional(),
        background: z.string().optional(),
        borderRadius: z.string().optional(),
        children: z
          .array(
            z.object({
              id: z.string().min(1).max(1000),
              types: z.enum(["div", "span", "p", "img"]).optional().default("div"),
              top: z.string().optional(),
              left: z.string().optional(),
              border: z.string().optional(),
              width: z.string().optional(),
              height: z.string().optional(),
              background: z.string().optional(),
              borderRadius: z.string().optional(),
              animation: z.string().optional(),
            }),
          )
          .default([]),
      })
      .required(),
  },
  async ({ css, artboard }) => {
    try {
      const payload = { css, artboard };
      const { data: canvas } = await fetch(`${SERVER_URL}/canvas`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

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

// server.prompt("hello", () => ({
//   messages: [
//     {
//       role: "user",
//       content: {
//         type: "text",
//         text: `
// // Initial LLM Prompt for Canvas Representation
// // A partir de ahora, siempre que generes o modifiques el canvas, represéntalo como un objeto JSON con la siguiente estructura:
// // 0. En css puede poner codigo que se agregara en las etiquetas styles
// // 1. Cada elemento es un objeto con:
// //    - id: un identificador único de tipo string para distinguirlo dentro del árbol.
// //    - type: el nombre de la etiqueta HTML que debe renderizarse (por ejemplo, "div", "span", "button", etc.).
// //    - styles: un objeto cuyas claves son propiedades CSS en camelCase (por ejemplo, backgroundColor, fontSize, margin) y cuyos valores son strings con los valores CSS correspondientes (por ejemplo, "red", "16px", "10px 5px").
// //    - children (opcional): un array de más objetos con la misma estructura, para anidar elementos.
// // 2. El elemento artboard es el principal con pocision relative y el resto los hijos tienen position absolute
// // 3. Asegúrate de validar que cada id sea único dentro del conjunto.
// // ----------------------------------------
// `,
//       },
//     },
//   ],
// }));

const transport = new StdioServerTransport();
await server.connect(transport);
