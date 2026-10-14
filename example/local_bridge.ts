import type { Plugin } from "vite";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("..", import.meta.url));
const MAX_BODY = 32 * 1024;
function stop(child:ReturnType<typeof spawn>) {
  if(!child.pid)return;
  try{if(process.platform==="win32")child.kill("SIGTERM");else process.kill(-child.pid,"SIGTERM");}catch{/* Already exited. */}
}
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
      if(req.url.startsWith("/api/local/agent-events?") && req.method === "GET") {
        const jobId=new URL(req.url,`http://${host}`).searchParams.get("jobId");
        if(!jobId || !/^[A-Za-z0-9_-]{1,128}$/.test(jobId))return reply(400,{code:"INVALID_INPUT",message:"Invalid job ID"});
        res.setHeader("Content-Type","text/event-stream");res.setHeader("Connection","keep-alive");res.flushHeaders();
        const child=spawn("npx",["convex","run","agent:getLocal",JSON.stringify({jobId}),"--watch"],{cwd:root,env:{...process.env,CONVEX_AGENT_MODE:"anonymous"},stdio:["ignore","pipe","pipe"],detached:process.platform!=="win32"});
        // CLI --watch subscribes to the real Convex query. Its JSON output can
        // contain arbitrary newlines, braces and quotes inside result strings.
        let buffer="";
        child.stdout.on("data",chunk=>{
          buffer+=String(chunk);let depth=0,inString=false,escaped=false,start=-1;
          for(let i=0;i<buffer.length;i++) {
            const c=buffer[i];if(inString){if(escaped)escaped=false;else if(c==="\\")escaped=true;else if(c==='"')inString=false;continue;}
            if(c==='"'){inString=true;continue;}
            if(c==="{"||c==="["){if(depth===0)start=i;depth++;}
            if(c==="}"||c==="]"){depth--;if(depth===0&&start>=0){try{res.write(`data: ${JSON.stringify(JSON.parse(buffer.slice(start,i+1)))}\n\n`);}catch{} buffer=buffer.slice(i+1);i=-1;start=-1;}}
          }
          if(buffer.length>2*1024*1024){stop(child);res.end();}
        });
        const heartbeat=setInterval(()=>res.write(": heartbeat\n\n"),15000);
        res.on("close",()=>{clearInterval(heartbeat);stop(child);});
        child.on("error",()=>res.end());child.on("close",()=>res.end());return;
      }
      const routes:Record<string,string>={
        "/api/local/search":"web:search","/api/local/fetch":"web:fetch",
        "/api/local/agent-start":"agent:startLocal","/api/local/agent-cancel":"agent:cancelLocal","/api/local/agent-resume":"agent:resumeLocal","/api/local/agent-steps":"agent:stepsLocal","/api/local/agent-result":"agent:resultLocal",
        "/api/local/browser-create":"agent:browserCreate","/api/local/browser-close":"agent:browserClose",
        "/api/local/profile-create":"agent:profileCreate","/api/local/profile-setup":"agent:profileStartSetup","/api/local/profile-save":"agent:profileSaveSetup","/api/local/profile-cancel":"agent:profileCancelSetup",
      };
      const operation=routes[req.url];
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
          const child = spawn("npx", ["convex", "run", operation, JSON.stringify(args)], { cwd: root, env: { ...process.env, CONVEX_AGENT_MODE: "anonymous" }, stdio: ["ignore", "pipe", "pipe"],detached:process.platform!=="win32" });
          const timer = setTimeout(() => { stop(child); reject(new Error("TIMEOUT")); }, 165000);
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
            try { accept(stdout.trim() ? JSON.parse(stdout) : null); } catch { reject(new Error("Unexpected response from Convex")); }
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
