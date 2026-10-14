import { defineApp } from "convex/server";
import { v } from "convex/values";
import tinyfish from "tinyfish-convex/convex.config.js";
const app = defineApp({ env: { TINYFISH_API_KEY: v.string() } });
app.use(tinyfish, { env: { TINYFISH_API_KEY: app.env.TINYFISH_API_KEY } });
export default app;
