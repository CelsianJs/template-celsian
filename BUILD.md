# Build and verification contract

## Released dependencies

- Node 22; `.nvmrc` records the local verification version, 22.23.3.
- Runtime: exact `celsian@0.6.5`, installed from npm, not a local workspace link.
- Build-only: exact TypeScript 5.9.3 and Node types 22.19.0.
- `package-lock.json` records package tarball URLs and integrity hashes; use `npm ci` for reproducible installs. Build requires dev dependencies, so do not install with `--omit=dev` before compiling.

The npm release declares `@celsian/core@0.6.5` and `@celsian/schema@0.6.5` dependencies. Its umbrella exports `createApp` and async `serve`; `createServer` and `.listen()` are not this API. `serve()` returns `{ close(): Promise<void> }`, owns signal handling, and reports the actual bound address through `onReady`. The template uses these published APIs directly.

To inspect the registry and installed artifact:

```sh
npm view celsian@0.6.5 version dependencies dist.integrity --json
npm ls celsian @celsian/core @celsian/schema typescript @types/node
```

The original starter used `celsian^0.3.0`, imported nonexistent `createServer`, and relied on `celsian build` without its required esbuild package. This starter instead uses TypeScript's existing compiler and the released runtime API; no bundler or CLI dependency is added.

## Clean local check

```sh
nvm use
npm ci
npm run typecheck
npm run build
npm test
npm start
```

The tests exercise the installed release through app injection and the actual built `dist/index.js` entry on an OS-assigned local port. Coverage includes greeting, health, JSON content type and no-store headers, JSON 404, HEAD, 405/Allow, malformed JSON, exact 8192-byte acceptance, multibyte over-limit rejection, invalid PORT, SIGTERM exit, and programmatic close while a response is pending. They need only loopback sockets; no database or external API is contacted.

There is no separate lint dependency. Typechecking and Node syntax/build checks are the static validation surface. `dist/` and `node_modules/` are generated and ignored.

## Vura build/start contract

The Celsian framework detector checks the `celsian` dependency. With `build` and `start` scripts, its zero-config preset selects a single foreground `web` service and defaults to a TCP probe. Use Settings → Services to select `/health` for an HTTP probe. Choose Node 22 and the repository root; keep install/build dependencies available during the build. The runtime needs the compiled `dist` output and installed production dependencies.

Use the normal Git-connected project build, deployment, promotion, and health-check flow. Services admission is team-gated and requires active paid Dedicated entitlement; merely cloning this starter does not grant access. No hosted deployment is claimed by local tests. No persistent disk, database, auth system, queue, or custom resource is configured.
