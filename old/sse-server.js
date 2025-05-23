import { createChannel, createSession } from "better-sse";
import { json } from "body-parser";
// sse-server.js
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Para parsear JSON en cualquier endpoint futuro (ej. /chat)
app.use(json());

// Creamos un canal para hacer broadcast a todos los clientes
const channel = createChannel();

/**
 * Endpoint SSE: los clientes crean una conexión persistente aquí.
 * En register() se guarda la sesión y session.push() envía un primer saludo opcional.
 */
app.get("/events", async (req, res) => {
  const session = await createSession(req, res);
  channel.register(session);
  session.push({ status: "connected" }, "system");
});

/**
 * Función que puedes importar desde otros módulos (p. ej. index.js)
 * para emitir un evento a _todos_ los clientes SSE conectados.
 *
 * @param {any} data   — El payload de tu evento (objeto, string, array…)
 * @param {string} event — El nombre del evento (tipo). Por defecto "message".
 */
export function emitEvent(data, event = "message") {
  channel.broadcast(data, event);
}

/**
 * Página HTML básica para servir desde la raíz
 */
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Chat LLM + MCP SSE</title>
</head>
<body>
  <h1>Chat LLM + MCP SSE Example</h1>
  <div id="log"></div>
  <script>
    // En el navegador, por ejemplo:
    const es = new EventSource("http://localhost:${PORT}/events");
    es.addEventListener("create_artboard", e => {
      const { payload } = JSON.parse(e.data);
      console.log("Nuevo artboard:", payload);
      // Aquí actualizas tu UI…
      const log = document.getElementById('log');
      const p = document.createElement('p');
      p.textContent = \`Nuevo artboard: \${JSON.stringify(payload)}\`;
      log.appendChild(p);
    });
  </script>
</body>
</html>`);
});

/**
 * Arrancamos el servidor Express
 */
app.listen(PORT, () => {
  console.error(`SSE server listening off http://localhost:${PORT}`);
});
