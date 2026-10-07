import { serve } from "celsian";
import { createServerApp } from "./app.js";

const port = Number(process.env.PORT ?? "3000");
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error("PORT must be an integer between 0 and 65535");
}

// serve() owns SIGINT/SIGTERM handling and graceful connection draining.
await serve(createServerApp(), {
  port,
  host: process.env.HOST || "0.0.0.0",
  onReady: ({ port, host }) => console.log(`Server running on http://${host}:${port}`),
});
