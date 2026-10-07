import { createApp } from "celsian";

export function createServerApp() {
  const app = createApp({ bodyLimit: 8 * 1024 });

  app.addHook("onRequest", (_request, reply) => {
    reply.header("cache-control", "no-store");
  });

  app.get("/", (_request, reply) => reply.json({ message: "Hello from CelsianJS!" }));
  app.get("/health", (_request, reply) => reply.json({ status: "ok" }));
  app.post("/echo", (request, reply) => reply.json({ data: request.parsedBody ?? null }));
  app.setNotFoundHandler((_request, reply) => reply.status(404).json({ error: "Not Found" }));

  return app;
}
