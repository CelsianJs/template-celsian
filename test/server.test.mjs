import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";
import { serve } from "celsian";
import { createServerApp } from "../dist/app.js";

function assertJson(response, status) {
  assert.equal(response.status, status);
  assert.match(response.headers.get("content-type"), /^application\/json/);
  assert.equal(response.headers.get("cache-control"), "no-store");
}

test("published package exposes createApp/serve, not the old createServer API", async () => {
  const api = await import("celsian");
  assert.equal(typeof api.createApp, "function");
  assert.equal(typeof api.serve, "function");
  assert.equal(api.createServer, undefined);
});

test("inject: greeting, health, JSON 404, and method boundaries", async () => {
  const app = createServerApp();
  for (const [url, body] of [["/", { message: "Hello from CelsianJS!" }], ["/health", { status: "ok" }]]) {
    const response = await app.inject({ method: "GET", url });
    assertJson(response, 200);
    assert.deepEqual(await response.json(), body);
  }
  const missing = await app.inject({ method: "GET", url: "/missing" });
  assertJson(missing, 404);
  assert.deepEqual(await missing.json(), { error: "Not Found" });
  const wrongMethod = await app.inject({ method: "POST", url: "/health" });
  assertJson(wrongMethod, 405);
  assert.equal(wrongMethod.headers.get("allow"), "GET, HEAD");
  assert.equal((await wrongMethod.json()).code, "METHOD_NOT_ALLOWED");
  const head = await app.inject({ method: "HEAD", url: "/health" });
  assertJson(head, 200);
  assert.equal(await head.text(), "");
});

test("inject: JSON parsing and the exact 8 KiB byte boundary", async () => {
  const app = createServerApp();
  const valid = await app.inject({ method: "POST", url: "/echo", payload: { name: "Ada" } });
  assertJson(valid, 200);
  assert.deepEqual(await valid.json(), { data: { name: "Ada" } });
  const invalid = await app.inject({ method: "POST", url: "/echo", headers: { "content-type": "application/json" }, payload: "{" });
  assertJson(invalid, 400);
  assert.equal((await invalid.json()).code, "INVALID_JSON");
  // Quotes are two bytes: the accepted payload is exactly 8192 UTF-8 bytes.
  const limit = await app.inject({ method: "POST", url: "/echo", payload: JSON.stringify("x".repeat(8190)), headers: { "content-type": "application/json" } });
  assertJson(limit, 200);
  assert.equal((await limit.json()).data.length, 8190);
  const tooLarge = await app.inject({ method: "POST", url: "/echo", payload: { text: "é".repeat(4096) } });
  assertJson(tooLarge, 413);
  assert.equal((await tooLarge.json()).code, "PAYLOAD_TOO_LARGE");
});

test("real production entry: HTTP contract and SIGTERM shutdown", { timeout: 15000 }, async (t) => {
  const child = spawn(process.execPath, ["dist/index.js"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, PORT: "0", HOST: "127.0.0.1", NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => { if (child.exitCode === null) child.kill("SIGKILL"); });
  const exited = once(child, "exit");
  let output = "";
  child.stderr.on("data", (chunk) => { output += chunk; });
  const baseUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server did not become ready: ${output}`)), 5000);
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("exit", () => { clearTimeout(timer); reject(new Error(`Server exited before readiness: ${output}`)); });
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/Server running on (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  for (const [path, options, status, body] of [
    ["/", {}, 200, { message: "Hello from CelsianJS!" }],
    ["/health", {}, 200, { status: "ok" }],
    ["/missing", {}, 404, { error: "Not Found" }],
    ["/echo", { method: "POST", headers: { "content-type": "application/json" }, body: '{"name":"Ada"}' }, 200, { data: { name: "Ada" } }],
  ]) {
    const response = await fetch(baseUrl + path, { ...options, signal: AbortSignal.timeout(3000) });
    assertJson(response, status);
    assert.deepEqual(await response.json(), body);
  }
  for (const [body, status, code] of [["{", 400, "INVALID_JSON"], [JSON.stringify({ text: "é".repeat(4096) }), 413, "PAYLOAD_TOO_LARGE"]]) {
    const response = await fetch(baseUrl + "/echo", { method: "POST", headers: { "content-type": "application/json" }, body, signal: AbortSignal.timeout(3000) });
    assertJson(response, status);
    assert.equal((await response.json()).code, code);
  }
  const wrongMethod = await fetch(baseUrl + "/health", { method: "POST", signal: AbortSignal.timeout(3000) });
  assertJson(wrongMethod, 405);
  assert.equal(wrongMethod.headers.get("allow"), "GET, HEAD");
  await wrongMethod.json();
  const head = await fetch(baseUrl + "/health", { method: "HEAD", signal: AbortSignal.timeout(3000) });
  assertJson(head, 200);
  assert.equal(await head.text(), "");
  child.kill("SIGTERM");
  assert.deepEqual(await exited, [0, null]);
  await assert.rejects(fetch(baseUrl + "/health", { signal: AbortSignal.timeout(1000) }));
});

test("serve.close drains a pending request", { timeout: 10000 }, async (t) => {
  const app = createServerApp();
  let release;
  let entered;
  const requestEntered = new Promise((resolve) => { entered = resolve; });
  const wait = new Promise((resolve) => { release = resolve; });
  app.get("/slow", async (_request, reply) => {
    entered();
    await wait;
    return reply.json({ completed: true });
  });
  let baseUrl;
  const server = await serve(app, { host: "127.0.0.1", port: 0, onReady: ({ port }) => { baseUrl = `http://127.0.0.1:${port}`; } });
  t.after(async () => { release(); await server.close(); });
  const response = fetch(baseUrl + "/slow", { signal: AbortSignal.timeout(5000) });
  await requestEntered;
  let drained = false;
  const closed = server.close().then(() => { drained = true; });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(drained, false, "close must wait for the active response");
  release();
  const result = await response;
  assertJson(result, 200);
  assert.deepEqual(await result.json(), { completed: true });
  await closed;
  await assert.rejects(fetch(baseUrl + "/health", { signal: AbortSignal.timeout(1000) }));
});

test("invalid PORT fails fast instead of silently binding a default", { timeout: 5000 }, async (t) => {
  const child = spawn(process.execPath, ["dist/index.js"], { cwd: new URL("..", import.meta.url), env: { ...process.env, PORT: "3000oops" }, stdio: "pipe" });
  t.after(() => { if (child.exitCode === null) child.kill("SIGKILL"); });
  let error = "";
  child.stderr.on("data", (chunk) => { error += chunk; });
  const [code] = await once(child, "exit");
  assert.notEqual(code, 0);
  assert.match(error, /PORT must be an integer/);
});
