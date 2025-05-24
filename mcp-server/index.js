// MCP Server imports
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "./fetch.js";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

function errorResp(err) {
  return {
    isError: true,
    content: [{ type: "text", text: err?.message || err }],
  };
}

const server = new McpServer({
  name: "mcp-x-studio",
  version: "1.0.0",
});

server.tool(
  "get-current-canvas",
  `Read the complete contents of the current canvas, return it as a JSON object with css styles, artboard, and elements.Example: { "css": "", "artboard": { "id": "artboard_1", "type": "div", "width": "800px", "height": "600px", "background": "#ffffff", "children": [ { "type": "div", "id": "shape_1", "top": "50px", "left": "50px", "width": "100px", "height": "100px", "border": "1px solid #000", "borderRadius": "50%", "background": "#ff0000" }, { "type": "div", "id": "shape_2", "top": "50px", "left": "50px", "width": "100px", "height": "100px", "border": "1px solid #000", "borderRadius": "50%", "background": "red" }, { "type": "p", "id": "paragraph_1", "top": "60px", "left": "60px", "width": "100px", "height": "100px", "content": "Hello World" } ] } }`,
  async () => {
    try {
      const url = `${SERVER_URL}/canvas`;
      const { data: canvas } = await fetch(url);

      const payload = JSON.stringify(canvas);
      return {
        content: [
          { type: "text", text: payload },
          { type: "resource", resource: { uri: url, mimeType: "application/json", text: payload } },
        ],
      };
    } catch (err) {
      return errorResp(err);
    }
  },
);

server.tool(
  "update-css-styles",
  "Update the CSS styles of the application web, this removes all previous styles",
  {
    css: z.string().max(1000).optional().describe("CSS styles to apply on the application web"),
  },
  async ({ css }) => {
    try {
      const url = `${SERVER_URL}/canvas/css`;
      const body = css;
      await fetch(url, { method: "POST", body });

      return {
        content: [
          { type: "text", text: "Canvas guardado exitosamente" },
          { type: "resource", resource: { uri, mimeType: "application/json", text: body } },
        ],
      };
    } catch (err) {
      return errorResp(err);
    }
  },
);

server.tool(
  "update-artboard-styles",
  "Update the CSS styles of the artboard, this replaces previous styles",
  {
    style: z.string().describe("CSS artboard styles to apply").default("{}}"),
  },
  async ({ style }) => {
    try {
      const url = `${SERVER_URL}/canvas/artboard/styles`;
      const body = style;
      await fetch(url, { method: "POST", body });

      return { content: [{ type: "text", text: "Canvas guardado exitosamente" }] };
    } catch (err) {
      return errorResp(err);
    }
  },
);

server.tool(
  "update-element-styles",
  "Update the CSS styles of the element, this replaces previous styles",
  {
    id: z.string().describe("Element id").min(3),
    style: z.string().describe("CSS element styles to apply").default("{}"),
  },
  async ({ id, style }) => {
    try {
      /// TODO: check if id exite on current canvas

      const url = `${SERVER_URL}/canvas/element/${id}/styles`;
      const body = style;
      await fetch(url, { method: "POST", body });

      return { content: [{ type: "text", text: "Canvas guardado exitosamente" }] };
    } catch (err) {
      return errorResp(err);
    }
  },
);

server.tool(
  "add-new-element",
  "Add a new element to the canvas, if provided parent id, it will be added as child of one element, if not, it will be added as child of the artboard",
  {
    id: z.string().describe("Element id").min(3),
    type: z.enum(["div", "span", "p", "img"]).optional().default("div"),
    style: z.string().describe("CSS element styles to apply").default("{}"),
    parentId: z.string().optional().describe("Id of parent element, by default is artboard"),
  },
  async ({ id, type, style }) => {
    try {
      const url = `${SERVER_URL}/canvas/element`;
      const body = { id, type, style };
      await fetch(url, { method: "POST", body });

      return { content: [{ type: "text", text: "Canvas guardado exitosamente" }] };
    } catch (err) {
      return errorResp(err);
    }
  },
);

server.tool(
  "remove-element",
  "Remove an element from the canvas",
  {
    id: z.string().describe("Element id").min(3),
  },
  async ({ id }) => {
    try {
      const url = `${SERVER_URL}/canvas/element/${id}`;
      await fetch(url, { method: "DELETE" });

      return { content: [{ type: "text", text: "Canvas guardado exitosamente" }] };
    } catch (err) {
      return errorResp(err);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
