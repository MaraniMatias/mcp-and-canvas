import fs from "bun:fs";
import path from "bun:path";
import { serve } from "bun";

const PORT = process.env.PORT || 3000;

const clients = new Set();
const encoder = new TextEncoder();

const canvasJson = {
  // css: "",
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
 * @param {object} headers - Additional headers to include in the response
 * @returns {Response}
 */
function sendResp(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
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
        return sendResp(html);
      } catch (err) {
        return sendResp("Error al cargar el HTML", 500);
      }
    }

    // SSE register new clients
    if (url.pathname === "/events" && req.method === "GET") {
      let controllerRef;
      let intervalId;

      const stream = new ReadableStream({
        start(controller) {
          controllerRef = controller;
          clients.add(controller);
          console.log(`[${timestamp}] Client added. Total clients: ${clients.size}`);

          controller.enqueue(encoder.encode(": conectado\n\n"));

          const ssePayload = JSON.stringify({
            timestamp: new Date().toISOString(),
            type: "reload",
            payload: canvasJson,
          });
          controller.enqueue(encoder.encode(`data: ${ssePayload}\n\n`));

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

    // Send message to all clients
    if (url.pathname === "/message" && req.method === "POST") {
      let body;
      try {
        body = await req.json();
      } catch {
        return new Response("JSON inválido", { status: 400 });
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
      } catch {
        return sendResp("JSON inválido", 400);
      }

      const data = getEncodedData("canvas-update-css", body);
      for (const client of clients) {
        client.enqueue(data);
      }

      canvasJson.css = body;
      return sendResp(canvasJson);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running on http://localhost:${PORT}`);
