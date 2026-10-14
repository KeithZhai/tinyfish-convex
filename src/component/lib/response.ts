import { ConvexError, type ValidatorJSON } from "convex/values";
import { searchShape, fetchShape } from "./response_shapes.js";
import type { SearchResponse, FetchResponse } from "../../types.js";
function invalid(): never { throw new ConvexError({ code: "INVALID_RESPONSE", message: "TinyFish response does not match the supported API contract" }); }
function decode(value: unknown, schema: ValidatorJSON): unknown {
  switch (schema.type) {
    case "any": return value;
    case "null": if (value !== null) invalid(); return value;
    case "string": if (typeof value !== "string") invalid(); return value;
    case "number": if (typeof value !== "number" || !Number.isFinite(value)) invalid(); return value;
    case "boolean": if (typeof value !== "boolean") invalid(); return value;
    case "literal": if (value !== schema.value) invalid(); return value;
    case "array": if (!Array.isArray(value)) invalid(); return value.map(v => decode(v, schema.value));
    case "union":
      for (const variant of schema.value) { try { return decode(value, variant); } catch {} }
      return invalid();
    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) invalid();
      const input = value as Record<string, unknown>; const output: Record<string, unknown> = {};
      for (const [key, field] of Object.entries(schema.value)) {
        if (input[key] === undefined) { if (!field.optional) invalid(); }
        else output[key] = decode(input[key], field.fieldType);
      }
      return output;
    }
    case "record":
      if (typeof value !== "object" || value === null || Array.isArray(value)) invalid();
      return value;
    default: return invalid();
  }
}
export function decodeSearch(value: unknown): SearchResponse { return decode(value, searchShape) as SearchResponse; }
export function decodeFetch(value: unknown): FetchResponse { return decode(value, fetchShape) as FetchResponse; }
