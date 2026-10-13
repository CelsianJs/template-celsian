# CelsianJS server starter

A small standalone JSON API using the published `celsian@0.6.5` package. No database, authentication, persistence, or paid service is provisioned by this template.

## Run locally

Use Node 22 (`nvm use`, if you have nvm), then:

```sh
npm ci
npm run typecheck
npm test
npm start
```

`npm test` builds the TypeScript source before running the built-in Node tests. For a build without tests, run `npm run build`. `npm run dev` builds and starts once; restart it after source edits. No separate Celsian CLI or bundler is required.

The server defaults to `http://localhost:3000`. Set `PORT` and `HOST` to override its binding, for example `PORT=4000 HOST=127.0.0.1 npm start`. Invalid ports fail at startup. SIGINT and SIGTERM are handled by Celsian's `serve()` to drain active connections.

## API

| Request | Response |
| --- | --- |
| `GET /` | `200` JSON greeting |
| `GET /health` | `200 {"status":"ok"}` — process liveness, not a database check |
| `POST /echo` | `200 {"data":...}` with the parsed request body; send `Content-Type: application/json` for JSON |
| Unknown path | `404 {"error":"Not Found"}` |
| Wrong method on an existing path | `405` JSON with an `Allow` header |

Responses carry `Cache-Control: no-store`. `HEAD` is supported for GET routes with an empty response body. Invalid JSON returns `400`; request bodies exceeding 8 KiB (8192 bytes, not characters) return `413`. `/echo` is a public, stateless example, not a storage or authenticated endpoint.

Routes live in `src/app.ts`, which also exports a ready `app`; `src/index.ts` starts the server. The app factory makes route tests independent of a listening socket. Celsian's `app.inject()` returns a web `Response`; use `response.status`, `await response.json()`, and the `payload` request option.

## Deploy on Vura

Vura runs this app as one scale-to-zero Function on the free tier. It imports `app` from `src/app.ts` and calls `app.handle(request)`; `src/index.ts`, which binds a port, is not used there.

```sh
npx vura-platform deploy          # preview
npx vura-platform deploy --prod   # production
```

The CLI bundles the app into a Function and uploads it, so a separate build step is not required. A Git-connected project does the same on every push: leave framework detection on Auto (or choose Celsian) and select Node 22.

Function instances start on demand and stop when idle, so module state such as an in-memory counter is per instance and is not durable. Runtime local disk is not durable storage either: do not save user data there. Add persistence and authorization deliberately before using the example as a real application.

### Always-on service (opt-in, paid)

To run `npm start` as a long-lived `web` service instead, declare it under Settings → Services (start `npm start`, health `/health`) or in `vura.json`. Services need an enabled team and an active paid Dedicated-compute plan, and they run on production deployments only. The app honors Vura's injected `PORT` and `HOST`; do not override them.

See [Vura's service documentation](https://vura.io/platform/services/) and [BUILD.md](BUILD.md) for the release and verification contract.
