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

// The app as a value, for hosts that call `app.handle(request)` themselves
// instead of running src/index.ts, which binds a port. Vura deploys it this
// way as one scale-to-zero Function.
export const app = createServerApp();
