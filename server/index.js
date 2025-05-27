import fs from "bun:fs";
import path from "bun:path";
import { serve } from "bun";
import { defineEncodedData, sendResp, parseBody, extractStyles } from "./utils.js";

const PORT = process.env.PORT || 3000;

const clients = new Set();
const encoder = new TextEncoder();
const getEncodedData = defineEncodedData(encoder);

const canvasJson = {
  css: "",
  javascript: "",
  artboard: {
    id: "artboard_1",
    type: "div",
    width: "800px",
    height: "600px",
    background: "#ffffff",
    children: [
      {
        type: "div",
        id: "shape_1",
        top: "50px",
        left: "50px",
        width: "100px",
        height: "100px",
        border: "1px solid #000",
        background: "#ff0000",
      },
    ],
  },
};

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Incoming request: ${req.method} ${url.pathname}`);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      try {
        const htmlPath = path.resolve(import.meta.dir, "index.html");
        const html = await fs.promises.readFile(htmlPath, "utf8");
        return sendResp(html, 200, {
          "Content-Type": "text/html; charset=utf-8",
        });
      } catch (err) {
        return sendResp("Error al cargar el HTML", 500);
      }
    }

    if (url.pathname === "/events" && req.method === "GET") {
      let controllerRef;
      let intervalId;

      const stream = new ReadableStream({
        start(controller) {
          controllerRef = controller;
          clients.add(controller);
          console.log(`[${timestamp}] Client added. Total clients: ${clients.size}`);

          controller.enqueue(encoder.encode(": conectado\n\n"));

          const data = getEncodedData("reload", canvasJson);
          controller.enqueue(data);

          // keep the connection
          intervalId = setInterval(() => {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          }, 2000);
        },
        cancel() {
          clearInterval(intervalId);
          clients.delete(controllerRef);
          console.log(`[${new Date().toISOString()}] Client disconnected. Total clients: ${clients.size}`);
        },
      });

      return sendResp(stream, 200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
    }

    if (url.pathname === "/message" && req.method === "POST") {
      const { body, err } = await parseBody(req);
      if (err) {
        return sendResp(err, 400);
      }

      const ssePayload = {
        timestamp: new Date().toISOString(),
        type: "message",
        payload: body.payload,
      };
      const data = encoder.encode(`data: ${ssePayload}\n\n`);

      // Send message to all clients
      for (const client of clients) {
        client.enqueue(data);
      }

      return sendResp("Mensaje enviado");
    }

    if (url.pathname === "/canvas" && req.method === "GET") {
      return sendResp(canvasJson);
    }

    if (url.pathname === "/canvas/css" && req.method === "POST") {
      const { body, err } = await parseBody(req);
      if (err) {
        return sendResp(err, 400);
      }

      const data = getEncodedData("canvas-update-css", body.css);
      for (const client of clients) {
        client.enqueue(data);
      }

      canvasJson.css = body.css;
      return sendResp(canvasJson);
    }

    if (url.pathname === "/canvas/javascript" && req.method === "POST") {
      const { body, err } = await parseBody(req);
      if (err) {
        return sendResp(err, 400);
      }

      const data = getEncodedData("canvas-update-javascript", body.javascript);
      for (const client of clients) {
        client.enqueue(data);
      }

      canvasJson.javascript = body.javascript;
      return sendResp(canvasJson);
    }

    if (url.pathname === "/canvas/artboard/styles" && req.method === "POST") {
      const { body, err } = await parseBody(req);
      if (err) {
        return sendResp(err, 400);
      }

      const style = body.style;
      const data = getEncodedData("canvas-update-artboard-styles", style);
      for (const client of clients) {
        client.enqueue(data);
      }

      canvasJson.artboard = {
        ...canvasJson.artboard,
        ...style,
        top: 0,
        left: 0,
        position: "relative",
      };
      return sendResp(canvasJson);
    }

    if (url.pathname === "/canvas/add-element" && req.method === "POST") {
      const { body, err } = await parseBody(req);
      if (err) {
        return sendResp(err, 400);
      }

      const style = body.style;
      const isStyleValid = ["width", "height", "left", "top"].every((key) => key in style);

      if (!isStyleValid) {
        return sendResp("Is invalid Style, messing width, height, left, top", 400);
      }

      const data = getEncodedData("canvas-add-element", { ...body, style });
      for (const client of clients) {
        client.enqueue(data);
      }

      canvasJson.artboard.children.push({ ...body, position: "relative" });
      return sendResp(canvasJson);
    }

    const match = url.pathname.match(/^\/canvas\/element\/([^/]+)\/styles$/);
    if (match && req.method === "POST") {
      const elementId = match[1];
      // Is a valid element id
      if (!/^[a-zA-Z0-9_-]+$/.test(elementId)) {
        return sendResp("Invalid element id, must be alphanumeric", 400);
      }
      const element = canvasJson.artboard?.children.find((child) => child.id === elementId);
      if (!element) {
        return sendResp("Element id not found", 400);
      }

      const { body, err } = await parseBody(req);
      if (err) {
        return sendResp(err, 400);
      }

      const { base: style, pseudos, keyframes } = extractStyles(body.style);

      if (Object.keys(pseudos).length > 0 || Object.keys(keyframes).length > 0) {
        return sendResp("Is invalid Style, for keyframes and pseudos set global style", 400);
      }

      const data = getEncodedData("canvas-update-element-styles", { id: elementId, style });

      for (const client of clients) {
        client.enqueue(data);
      }

      Object.assign(element, { id: elementId, ...style, position: "absolute" });

      return sendResp(canvasJson);
    }

    const matchDelete = url.pathname.match(/^\/canvas\/element\/([^/]+)$/);
    if (matchDelete && req.method === "DELETE") {
      const elementId = matchDelete[1];

      const data = getEncodedData("canvas-delete-element", { id: elementId });
      for (const client of clients) {
        client.enqueue(data);
      }

      const index = canvasJson.artboard.children.findIndex((child) => child.id === elementId);
      canvasJson.artboard.children.splice(index, 1);

      return sendResp(canvasJson);
    }

    return sendResp("Not Found", 404);
  },
});

console.log(`Server running on http://localhost:${PORT}`);
