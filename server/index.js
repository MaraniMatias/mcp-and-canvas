import { serve } from "bun";
import fs from "bun:fs";
import path from "bun:path";

const PORT = process.env.PORT || 3000;
const INDEX_HTML = path.resolve(import.meta.dir, "index.html");

// Conjunto para guardar los controllers de cada cliente SSE
const clients = new Set();
const encoder = new TextEncoder();

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Servir el HTML
    if (url.pathname === "/" || url.pathname === "/index.html") {
      try {
        const html = await fs.promises.readFile(INDEX_HTML, "utf8");
        return new Response(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      } catch (err) {
        return new Response("Error al cargar el HTML", { status: 500 });
      }
    }

    // SSE: registrar nuevos clientes
    if (url.pathname === "/events" && req.method === "GET") {
      let controllerRef;
      let intervalId;
      let counter = 0;

      const stream = new ReadableStream({
        start(controller) {
          controllerRef = controller;
          clients.add(controller);
          // Envío de heartbeat inicial
          controller.enqueue(encoder.encode(`: conectado\n\n`));
          intervalId = setInterval(() => {
            counter += 1;
            const data = JSON.stringify({
              timestamp: new Date().toISOString(),
              type: "message",
              payload: `Mensaje #${counter}`,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }, 2000);
        },
        cancel() {
          clearInterval(intervalId);
          // Al desconectar el cliente
          clients.delete(controllerRef);
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

    // Nuevo endpoint POST para enviar mensajes a los SSE
    if (url.pathname === "/message" && req.method === "POST") {
      let body;
      try {
        body = await req.json();
      } catch {
        return new Response("JSON inválido", { status: 400 });
      }

      // Construir el evento SSE
      const ssePayload = JSON.stringify({
        timestamp: new Date().toISOString(),
        type: "message",
        payload: body.payload, // asume { "payload": "tu mensaje" }
      });
      const data = encoder.encode(`data: ${ssePayload}\n\n`);

      // Enviar a todos los clientes conectados
      for (const client of clients) {
        client.enqueue(data);
      }

      return new Response("Mensaje enviado", { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running on http://localhost:${PORT}`);
