import fs from "bun:fs";
import path from "bun:path";
import { serve } from "bun";

const PORT = process.env.PORT || 3000;

const clients = new Set();
const encoder = new TextEncoder();

const canvasJson = {
  artboard: {
    id: "artboard1",
    type: "div",
    width: "800px",
    height: "600px",
    backgroundColor: "#ffffff",
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
        return new Response(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      } catch (err) {
        return new Response("Error al cargar el HTML", { status: 500 });
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

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
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

      return new Response("Mensaje enviado", { status: 200 });
    }

    if (url.pathname === "/canvas" && req.method === "GET") {
      return new Response(JSON.stringify(canvasJson), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/canvas" && req.method === "POST") {
      let body;
      try {
        body = await req.json();
      } catch {
        return new Response("JSON inválido", { status: 400 });
      }

      const ssePayload = JSON.stringify({
        timestamp: new Date().toISOString(),
        type: "canvas",
        payload: body,
      });
      const data = encoder.encode(`data: ${ssePayload}\n\n`);

      // Send message to all clients
      for (const client of clients) {
        client.enqueue(data);
      }

      return new Response(JSON.stringify(canvasJson), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running on http://localhost:${PORT}`);
