import { ConvexError } from "convex/values";
import { constraints } from "./agent_constraints.js";
import type { AgentArgs } from "../../types.js";
type Constraint = { type?: string; properties?: Record<string, Constraint>; items?: Constraint; minLength?: number; maxLength?: number; minimum?: number; maximum?: number; minItems?: number; maxItems?: number };
export function invalid(message: string): never { throw new ConvexError({ code: "INVALID_INPUT", message }); }
export function nonempty(value: string, name: string, max = 256) {
  if (!value.trim() || value.length > max) invalid(`${name} must be non-empty and at most ${max} characters`);
}
export function httpUrl(value: string) {
  try { const url = new URL(value); if (!["http:","https:"].includes(url.protocol) || url.username || url.password) invalid("URL must use HTTP(S) without embedded credentials"); }
  catch { invalid("URL must use HTTP(S) without embedded credentials"); }
}
function validate(value: unknown, schema: Constraint, name: string) {
  if (value === undefined || value === null) return;
  if (typeof value === "string") {
    if (schema.minLength && !value.trim()) invalid(`${name} must be non-empty`);
    if (schema.maxLength && value.length > schema.maxLength) invalid(`${name} is too long`);
  }
  if (typeof value === "number" && ((!Number.isFinite(value)) || (schema.type === "integer" && !Number.isSafeInteger(value)) || (schema.minimum !== undefined && value < schema.minimum) || (schema.maximum !== undefined && value > schema.maximum))) invalid(`${name} is outside the supported range`);
  if (Array.isArray(value)) {
    if ((schema.minItems !== undefined && value.length < schema.minItems) || (schema.maxItems !== undefined && value.length > schema.maxItems)) invalid(`${name} has an unsupported number of items`);
    if (schema.items) value.forEach(v => validate(v, schema.items!, name));
  } else if (value && typeof value === "object" && schema.properties) {
    for (const [key, child] of Object.entries(schema.properties)) validate((value as Record<string,unknown>)[key], child, `${name}.${key}`);
  }
}
export function validateArgs(name: keyof typeof constraints, args: unknown) {
  validate(args, constraints[name] as Constraint, name);
  const value = args as {url?:string}; if (value.url !== undefined) httpUrl(value.url);
}
export function validateAgent(args: AgentArgs) {
  validateArgs("agentArgs", args);
  nonempty(args.goal, "goal", 32000);
  if (args.profile_id !== undefined) {
    nonempty(args.profile_id, "profile_id");
    if (args.use_profile !== true) invalid("profile_id requires use_profile=true");
  }
  if (args.credential_item_ids !== undefined && args.use_vault !== true) invalid("credential_item_ids requires use_vault=true");
  if (args.output_schema && JSON.stringify(args.output_schema).length > 64000) invalid("output_schema must be at most 64 KB");
}
