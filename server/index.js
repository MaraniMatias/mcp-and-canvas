// index.js
import { serve } from "bun";

const PORT = 3000;

serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      // Ruta principal: sirve index.html
      const htmlPath = new URL("./index.html", import.meta.url);
      const html = await Bun.file(htmlPath).text();
      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/events") {
      let intervalId; // Guardaremos aquí la referencia al intervalo
      let counter = 0;

      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          // Heartbeat inicial
          controller.enqueue(encoder.encode(": iniciando conexión\n\n"));

          // Envío de datos cada 2s
          intervalId = setInterval(() => {
            counter++;
            const data = `Mensaje número ${counter}`;
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));

            // Ejemplo: cerrar tras 10 mensajes
            if (counter >= 10) {
              clearInterval(intervalId);
              controller.close();
            }
          }, 2000);
        },
        // Se llama cuando el cliente aborta la conexión
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

console.log(`> Servidor corriendo en http://localhost:${PORT}/`);
