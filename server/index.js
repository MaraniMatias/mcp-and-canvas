import fs from "bun:fs";
import path from "bun:path";
import { serve } from "bun";
import { error } from "zod/v4/locales/th.js";

const PORT = process.env.PORT || 3000;

const clients = new Set();
const encoder = new TextEncoder();

const canvasJson = {
  css: "",
  javascript: "",
  artboard: {
    id: "artboard1",
    type: "div",
    width: "800px",
    height: "600px",
    background: "#ffffff",
    children: [
      {
        type: "div",
        id: "shape1",
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

/**
 * @param {any} payload - Payload to send in the response
 * @param {200|400|404|500} status - HTTP status code
 * @param {
 * @returns {Response}
 */
function sendResp(payload, status = 200, headers = {}) {
  let body = payload;

  if (payload instanceof Error) {
    status = status ?? 500;
    body = payload.message;
  }

  if (
    !(
      typeof payload === "string" ||
      payload instanceof Uint8Array ||
      payload instanceof ArrayBuffer ||
      payload instanceof Blob ||
      payload instanceof ReadableStream
    )
  ) {
    body = JSON.stringify(payload);
  }

  return new Response(body, {
    status: status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/**
 * @param {string} type - Type of the event
 * @param {any} payload - Payload to send in the response
 * @returns {string}
 */
function getEncodedData(type, payload) {
  const encodedPayload = JSON.stringify({
    timestamp: new Date().toISOString(),
    type: type,
    payload: payload,
  });
  return encoder.encode(`data: ${encodedPayload}\n\n`);
}

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
      let body;
      try {
        body = await req.json();
      } catch (err) {
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
      let body;
      try {
        body = await req.json();
      } catch (err) {
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
      let body;
      try {
        body = await req.json();
      } catch (err) {
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
      let body;
      let style;
      try {
        body = await req.json();
        style = JSON.parse(body.style);
      } catch (err) {
        return sendResp(err, 400);
      }

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
      let body;
      let style;
      try {
        body = await req.json();
        style = JSON.parse(body.style);
      } catch (err) {
        return sendResp(err, 400);
      }

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

      let body;
      try {
        body = await req.json();
      } catch (err) {
        return sendResp(err, 400);
      }
      const style = JSON.parse(body.style);

      const data = getEncodedData("canvas-update-element-styles", {
        id: elementId,
        style,
      });

      for (const client of clients) {
        client.enqueue(data);
      }

      const element = canvasJson.artboard?.children.find((child) => child.id === elementId);
      if (!element) return sendResp("Element not found", 404);

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
