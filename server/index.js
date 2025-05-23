import { serve } from "bun";
import fs from "bun:fs";
import path from "bun:path";

const PORT = process.env.PORT || 3000;
const INDEX_HTML = path.resolve(import.meta.dir, "index.html");

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
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

    // SSE /events
    if (url.pathname === "/events") {
      let intervalId;
      let counter = 0;
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        start(controller) {
          // heartbeat inicial
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

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running on http://localhost:${PORT}`);
