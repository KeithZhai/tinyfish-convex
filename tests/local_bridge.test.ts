import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { createServer, request, type Server } from "node:http";
import { localBridge } from "../example/local_bridge.js";
let vite: ViteDevServer, server: Server, base: string;
const oldFlag = process.env.TINYFISH_LOCAL_DEMO;
beforeAll(async () => {
  process.env.TINYFISH_LOCAL_DEMO = "1";
  vite = await createViteServer({ configFile: false, server: { middlewareMode: true }, plugins: [localBridge()] });
  server = createServer(vite.middlewares);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Expected local address");
  base = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  await vite.close(); await new Promise<void>((resolve,reject) => server.close(error => error ? reject(error) : resolve()));
  if (oldFlag === undefined) delete process.env.TINYFISH_LOCAL_DEMO; else process.env.TINYFISH_LOCAL_DEMO = oldFlag;
});
describe("local demo bridge boundary", () => {
  it("returns connection status without any credentials", async () => {
    const r = await fetch(`${base}/api/local/status`); const body = await r.json();
    expect(Object.keys(body).sort()).toEqual(["available", "transport"]); expect(body.transport).toBe("Convex actions → TinyFish API");
    expect(r.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects a foreign Origin before invoking any action", async () => {
    const r = await fetch(`${base}/api/local/search`, {method:"POST",headers:{Origin:"https://attacker.example","Content-Type":"application/json"},body:'{"query":"test"}'});
    expect(r.status).toBe(403); expect((await r.json()).code).toBe("FORBIDDEN");
  });
  it("rejects non-local Host values", async () => {
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const req = request(`${base}/api/local/status`, { headers: { Host: "attacker.example" } }, res => { res.resume(); resolve(res.statusCode); });
      req.on("error", reject); req.end();
    });
    expect(status).toBe(403);
  });
  it("rejects simple form requests so cross-site forms cannot spend credits", async () => {
    const r = await fetch(`${base}/api/local/search`, {method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"query=test"}); expect(r.status).toBe(415);
  });
  it("does not expose arbitrary Convex function paths", async () => {
    const r = await fetch(`${base}/api/local/admin:dangerous`, {method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}); expect(r.status).toBe(404);
  });
  it("rejects oversized requests", async () => {
    const r = await fetch(`${base}/api/local/search`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:"a".repeat(40000)})}); expect(r.status).toBe(413);
  });
  it("rejects non-object input", async () => {
    const r = await fetch(`${base}/api/local/search`, {method:"POST",headers:{"Content-Type":"application/json"},body:"[]"}); expect(r.status).toBe(400);
  });
});
