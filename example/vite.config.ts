import { defineConfig } from "vite";
import { localBridge } from "./local_bridge.js";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({ root: fileURLToPath(new URL(".", import.meta.url)), plugins: [react(), localBridge()], server: { host: "127.0.0.1" } });
