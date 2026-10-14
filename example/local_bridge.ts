import type { Plugin } from "vite";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("..", import.meta.url));
const MAX_BODY = 32 * 1024;
/** Local developer demo only. Fixed internal actions, credentials stay with the CLI. */
export function localBridge(): Plugin {
  const enabled = process.env.TINYFISH_LOCAL_DEMO === "1";
  return { name: "tinyfish-local-convex-demo", configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith("/api/local/")) return next();
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      function reply(status: number, body: unknown) { res.statusCode = status; res.end(JSON.stringify(body)); }
      const host = req.headers.host || "";
      if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) return reply(403, { code: "FORBIDDEN", message: "The developer bridge only accepts localhost requests" });
      const origin = req.headers.origin;
      if (origin && origin !== `http://${host}`) return reply(403, { code: "FORBIDDEN", message: "Cross-origin requests are not allowed" });
      if (req.url === "/api/local/status" && req.method === "GET") return reply(200, { available: enabled && existsSync(resolve(root, ".env.local")), transport: "Convex actions → TinyFish API" });
      if (!enabled) return reply(503, { code: "DEMO_NOT_STARTED", message: "Start the real demo with npm run demo -- --use-cli-key" });
      const operation = req.url === "/api/local/search" ? "search" : req.url === "/api/local/fetch" ? "fetch" : undefined;
      if (!operation || req.method !== "POST") return reply(404, { code: "NOT_FOUND", message: "Unknown demo operation" });
      if (!req.headers["content-type"]?.startsWith("application/json")) return reply(415, { code: "INVALID_INPUT", message: "Expected JSON" });
      try {
        let body = "";
        for await (const chunk of req) {
          body += chunk.toString();
          if (Buffer.byteLength(body) > MAX_BODY) return reply(413, { code: "INVALID_INPUT", message: "Request exceeds 32 KiB" });
        }
        const args: unknown = JSON.parse(body);
        if (!args || typeof args !== "object" || Array.isArray(args)) return reply(400, { code: "INVALID_INPUT", message: "Expected an argument object" });
        // No arbitrary function paths or shell interpolation are accepted.
        const data = await new Promise<unknown>((accept, reject) => {
          let stdout = "", stderr = "";
          const child = spawn("npx", ["convex", "run", `web:${operation}`, JSON.stringify(args)], { cwd: root, env: { ...process.env, CONVEX_AGENT_MODE: "anonymous" }, stdio: ["ignore", "pipe", "pipe"] });
          const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error("TIMEOUT")); }, 165000);
          child.stdout.on("data", chunk => { stdout += String(chunk); });
          child.stderr.on("data", chunk => { stderr += String(chunk); });
          child.on("error", error => { clearTimeout(timer); reject(error); });
          child.on("close", code => {
            clearTimeout(timer);
            if (code !== 0) {
              const payload = stderr.match(/Uncaught ConvexError: (\{[^\n]+\})/);
              if (payload) { try { reject(JSON.parse(payload[1])); return; } catch {} }
              reject(new Error("Convex action failed. Check the backend terminal.")); return;
            }
            try { accept(JSON.parse(stdout)); } catch { reject(new Error("Unexpected response from Convex")); }
          });
        });
        reply(200, data);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && "message" in error) return reply(400, error);
        reply(502, { code: "DEMO_ERROR", message: error instanceof Error ? error.message : "Local Convex action failed" });
      }
    });
  } };
}
