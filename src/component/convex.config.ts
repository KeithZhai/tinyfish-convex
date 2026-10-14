import { defineComponent } from "convex/server";
import { v } from "convex/values";
export default defineComponent("tinyfish", { env: { TINYFISH_API_KEY: v.string() } });
