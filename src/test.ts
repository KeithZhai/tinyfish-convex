/// <reference types="vite/client" />
import type { TestConvex } from "convex-test";
import { componentsGeneric, type GenericSchema, type SchemaDefinition } from "convex/server";
import schema from "./component/schema.js";
import type { ComponentApi } from "./component/_generated/component.js";
const modules = import.meta.glob("./component/**/*.ts");
export function register<S extends SchemaDefinition<GenericSchema, boolean>>(t: TestConvex<S>, name = "tinyfish") {
  t.registerComponent(name, schema, modules);
  return componentsGeneric()[name] as unknown as ComponentApi;
}
export default { register, schema, modules };
