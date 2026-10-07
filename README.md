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

Routes live in `src/app.ts`; `src/index.ts` starts the server. The app factory makes route tests independent of a listening socket. Celsian's `app.inject()` returns a web `Response`; use `response.status`, `await response.json()`, and the `payload` request option.

## Deploy as a Vura service

Use a Git-connected Vura project pointing at your repository and its root directory. Select Node 22 and leave framework detection on Auto (or choose Celsian). The existing Celsian preset recognizes this package and uses `npm run build` plus the foreground `npm start` command to create a `web` service. This is not a Vura file-route app or a static-site deployment.

Services currently require both an enabled team and active paid Dedicated-compute entitlement. A free plan cannot run this always-on server, and this template does not enable billing or bypass the team gate. If your team lacks access, keep using the local server; do not create extra infrastructure to work around admission.

For an HTTP health probe instead of the preset's default TCP probe, configure `web` under Settings → Services with start `npm start` and health `/health`. The app honors Vura's injected `PORT` and `HOST`; do not override them. Services run on production deployments: a preview must be promoted through the normal project controls before it serves traffic. After deployment, verify the deployment logs and request `/health`, `/`, and a missing path on the resulting host.

Deploy from Git, not by uploading local `dist` or dependencies. Runtime local disk is not durable storage: do not save user data there. Add persistence and authorization deliberately before using the example as a real application.

See [Vura's service documentation](https://vura.io/platform/services/) and [BUILD.md](BUILD.md) for the release and verification contract.
