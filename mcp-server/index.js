// MCP Server imports
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "./fetch.js";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

const GET_CURRENT_CANVAS = `${SERVER_URL}/canvas`;
const UPDATE_CSS_STYLES = `${SERVER_URL}/canvas/css`;
const UPDATE_ARTBOARD_STYLES = `${SERVER_URL}/canvas/artboard/styles`;
const UPDATE_ELEMENT_STYLES = (elementId) =>
  `${SERVER_URL}/canvas/element/${elementId}/styles`;
const ADD_ELEMENT = `${SERVER_URL}/canvas/add-element`;
const REMOVE_ELEMENT = (elementId) =>
  `${SERVER_URL}/canvas/element/${elementId}`;

const server = new McpServer({
  name: "mcp-x-studio",
  version: "1.0.0",
});

server.tool(
  "get-current-canvas",
  `Read the complete contents of the current canvas, return it as a JSON object with css styles, artboard, and elements.Example: { "css": "", "artboard": { "id": "artboard_1", "type": "div", "width": "800px", "height": "600px", "background": "#ffffff", "children": [ { "type": "div", "id": "shape_1", "top": "50px", "left": "50px", "width": "100px", "height": "100px", "border": "1px solid #000", "borderRadius": "50%", "background": "#ff0000" }, { "type": "div", "id": "shape_2", "top": "50px", "left": "50px", "width": "100px", "height": "100px", "border": "1px solid #000", "borderRadius": "50%", "background": "red" }, { "type": "p", "id": "paragraph_1", "top": "60px", "left": "60px", "width": "100px", "height": "100px", "content": "Hello World" } ] } }`,
  async () => {
    try {
      const { data: canvas } = await fetch.get(GET_CURRENT_CANVAS);
      const payload = JSON.stringify(canvas);

      return {
        content: [
          { type: "text", text: payload },
          {
            type: "resource",
            resource: { uri: url, mimeType: "application/json", text: payload },
          },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: err.message }],
      };
    }
  },
);

server.tool(
  "update-css-styles",
  "Update the CSS styles of the application web, this removes all previous styles",
  {
    css: z
      .string()
      .max(1000)
      .optional()
      .describe("CSS styles to apply on the application web"),
  },
  async ({ css }) => {
    try {
      const body = css;
      await fetch.post(UPDATE_CSS_STYLES, body);

      return {
        content: [
          { type: "text", text: "Canvas guardado exitosamente" },
          {
            type: "resource",
            resource: { uri, mimeType: "application/json", text: body },
          },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: err.message }],
      };
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
      const body = style;
      await fetch.post(UPDATE_ARTBOARD_STYLES, body);

      return {
        content: [{ type: "text", text: "Canvas guardado exitosamente" }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: err.message }],
      };
    }
  },
);

server.tool(
  "update-element-styles",
  "Update the CSS styles of the element, this replaces previous styles",
  {
    id: z.string().describe("Element id, must be unique").min(3),
    style: z.string().describe("CSS element styles to apply").default("{}"),
  },
  async ({ id, style }) => {
    try {
      const body = style;
      await fetch.post(UPDATE_ELEMENT_STYLES(id), body);

      return {
        content: [{ type: "text", text: "Canvas guardado exitosamente" }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: err.message }],
      };
    }
  },
);

server.tool(
  "add-new-element",
  "Add a new element to the canvas, it will be added as child of one element, if not, it will be added as child of the artboard",
  {
    id: z.string().describe("Element id, must be unique").min(3),
    type: z.enum(["div", "span", "p", "img"]).optional().default("div"),
    style: z.string().describe("CSS element styles to apply").default("{}"),
  },
  async ({ id, type, style }) => {
    try {
      const body = { id, type, style };
      await fetch.post(ADD_ELEMENT, body);

      return {
        content: [{ type: "text", text: "Canvas guardado exitosamente" }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: err.message }],
      };
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
      await fetch.delete(REMOVE_ELEMENT(id));

      return {
        content: [{ type: "text", text: "Canvas guardado exitosamente" }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: err.message }],
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
