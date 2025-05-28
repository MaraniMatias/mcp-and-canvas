// MCP Server imports
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "./fetch.js";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

const GET_CURRENT_CANVAS = `${SERVER_URL}/canvas`;
const UPDATE_CSS_STYLES = `${SERVER_URL}/canvas/css`;
const UPDATE_JAVASCRIPT = `${SERVER_URL}/canvas/javascript`;
const UPDATE_ARTBOARD_STYLES = `${SERVER_URL}/canvas/artboard/styles`;
const UPDATE_ELEMENT_STYLES = (elementId) => `${SERVER_URL}/canvas/element/${elementId}/styles`;
const ADD_ELEMENT = `${SERVER_URL}/canvas/add-element`;
const REMOVE_ELEMENT = (elementId) => `${SERVER_URL}/canvas/element/${elementId}`;
const GET_ELEMENT = (elementId) => `${SERVER_URL}/canvas/element/${elementId}`;

const server = new McpServer({
  name: "mcp-x-studio",
  version: "1.0.0",
});

server.tool(
  "get-current-canvas",
  "Retrieves the entire current canvas and returns its contents in JSON format.",
  async () => {
    try {
      const { data: canvas } = await fetch.get(GET_CURRENT_CANVAS);
      const payload = JSON.stringify(canvas);

      return {
        content: [
          { type: "text", text: payload },
          {
            type: "resource",
            resource: {
              uri: "file://canvas.json",
              mimeType: "application/json",
              text: payload,
            },
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
  "Replaces the web application’s CSS styles with the provided styles, removing any previous ones.",
  {
    css: z.string().describe("CSS styles to apply on the application web").default("* { border: 1px solid red; }"),
  },
  async ({ css }) => {
    try {
      const body = { css };
      const { data: canvas } = await fetch.post(UPDATE_CSS_STYLES, body);

      return {
        content: [
          { type: "text", text: "Updated CSS styles successfully" },
          { type: "text", text: "Canvas actualizado " + JSON.stringify(canvas, null, 2) },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          { type: "text", text: err.message },
          { type: "text", text: "puedes pedir el estado del canvas actual, o leer el resource canvas.json" },
        ],
      };
    }
  },
);

server.tool(
  "update-javascript",
  "Replaces the web application’s JavaScript code with the provided script, removing any previous scripts.",
  {
    javascript: z
      .string()
      .describe("Javascript to apply on the application web")
      .default("console.log('Hello World!');"),
  },
  async ({ javascript }) => {
    try {
      const body = { javascript };
      const { data: canvas } = await fetch.post(UPDATE_JAVASCRIPT, body);

      return {
        content: [
          { type: "text", text: "Updated CSS styles successfully" },
          { type: "text", text: "Canvas actualizado " + JSON.stringify(canvas, null, 2) },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          { type: "text", text: err.message },
          { type: "text", text: "puedes pedir el estado del canvas actual, o leer el resource canvas.json" },
        ],
      };
    }
  },
);

server.tool(
  "update-artboard-styles",
  "Updates the artboard’s CSS styles by completely replacing the previous styles.",
  {
    // style: z.object({}).describe("CSS artboard styles to apply as JSON"),
    style: z.string().describe("CSS artboard styles to apply as JSON string"),
  },
  async ({ style }) => {
    try {
      const body = { style: JSON.parse(style) };
      const { data: canvas } = await fetch.post(UPDATE_ARTBOARD_STYLES, body);

      return {
        content: [
          { type: "text", text: "Updated artboard styles successfully" },
          { type: "text", text: "Canvas actualizado " + JSON.stringify(canvas, null, 2) },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          { type: "text", text: err.message },
          { type: "text", text: "puedes pedir el estado del canvas actual, o leer el resource canvas.json" },
        ],
      };
    }
  },
);

server.tool(
  "add-new-element",
  "Adds a new element to the canvas. If a parent element is specified, it will be inserted as its child; otherwise, it will be added to the artboard.",
  {
    id: z
      .string()
      .describe("Element id, must be unique")
      .min(3)
      .regex(/^[a-zA-Z0-9_-]+$/, "El ID del elemento debe contener solo letras, números, guiones bajos y guiones"),
    type: z.enum(["div", "span", "p", "img"]).optional().default("div"),
    // style: z.object({}).describe("CSS element styles to apply, must be a JSON").default({}),
    style: z
      .string()
      .describe("CSS element styles to apply, must be a JSON")
      .default(
        '{"top": 0, "left": 0, "width": "100px", "height": "100px","border":"1px solid black","background":"white"}',
      ),
  },
  async ({ id, type, style }) => {
    try {
      const body = { id, type, style: JSON.parse(style) };
      const { data: canvas } = await fetch.post(ADD_ELEMENT, body);

      return {
        content: [
          { type: "text", text: "Elemento agregado exitosamente" },
          { type: "text", text: "Canvas actualizado " + JSON.stringify(canvas, null, 2) },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          { type: "text", text: err.message },
          { type: "text", text: "puedes pedir el estado del canvas actual, o leer el resource canvas.json" },
        ],
      };
    }
  },
);

server.tool(
  "update-element-styles",
  "Modifies the CSS styles of a specific element (by its ID), replacing its previous styles.",
  {
    id: z.string().describe("Element id, must be unique").min(3),
    // style: z.object({}).describe("CSS element styles to apply, must be a JSON").default({}),
    style: z.string().describe("CSS element styles to apply, must be a JSON string"),
  },
  async ({ id, style }) => {
    try {
      const body = { style: JSON.parse(style) };
      const { data: canvas } = await fetch.post(UPDATE_ELEMENT_STYLES(id), body);

      return {
        content: [
          { type: "text", text: "Elemento updated successfully" },
          { type: "text", text: "Canvas actualizado " + JSON.stringify(canvas, null, 2) },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          { type: "text", text: err.message },
          { type: "text", text: "puedes pedir el estado del canvas actual, o leer el resource canvas.json" },
        ],
      };
    }
  },
);

server.tool(
  "remove-element",
  "Removes an element from the current canvas, identified by its ID.",
  {
    id: z.string().describe("Element id, must be unique").min(3),
  },
  async ({ id }) => {
    try {
      const { data: canvas } = await fetch.delete(REMOVE_ELEMENT(id));

      return {
        content: [
          { type: "text", text: "Elemento eliminado exitosamente" },
          { type: "text", text: "Canvas actualizado " + JSON.stringify(canvas, null, 2) },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          { type: "text", text: err.message },
          { type: "text", text: "puedes pedir el estado del canvas actual, o leer el resource canvas.json" },
        ],
      };
    }
  },
);

server.tool(
  "check_if_element_exists_on_canvas",
  "Check si el elemento existe en el canvas",
  {
    id: z
      .string()
      .describe("Element id, must be unique")
      .min(3)
      .regex(/^[a-zA-Z0-9_-]+$/, "El ID del elemento debe contener solo letras, números, guiones bajos y guiones"),
  },
  async ({ id }) => {
    try {
      const { data: element } = await fetch.get(GET_ELEMENT(id));

      return {
        content: [{ type: "text", text: "Elemento encontrado en el canvas. \n" + JSON.stringify(element, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          { type: "text", text: err.message },
          { type: "text", text: "puedes pedir el estado del canvas actual, o leer el resource canvas.json" },
        ],
      };
    }
  },
);

server.prompt("Obtener estado canvas", () => ({
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: "Obtener el estado actual del canvas",
      },
    },
  ],
}));

server.prompt("Agregar nuevo elemento", () => ({
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: "Agrega un nuevo elemento amarillo de 120×120, con bordes redondeados, en la posición (100, 100)",
      },
    },
  ],
}));

server.prompt("Añadir estilo a elemento", () => ({
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: "Quiero que el elemento rojo gire cuando el usuario ponga el mouse encima de él",
      },
    },
  ],
}));

server.resource("canvas.json", "file://canvas.json", async () => {
  try {
    const { data: canvas } = await fetch.get(GET_CURRENT_CANVAS);

    return {
      contents: [
        {
          uri: "file://canvas.json",
          mimeType: "application/json",
          text: JSON.stringify(canvas),
        },
      ],
    };
  } catch (err) {
    return {
      isError: true,
      content: [
        { type: "text", text: err.message },
        { type: "text", text: "puedes pedir el estado del canvas actual, o leer el resource canvas.json" },
      ],
    };
  }
});

// Connect the server using stdio transport
const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);

console.log("Weather MCP Server started");
