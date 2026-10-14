/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as browser from "../browser.js";
import type * as fetch from "../fetch.js";
import type * as jobs from "../jobs.js";
import type * as lib_agent_constraints from "../lib/agent_constraints.js";
import type * as lib_agent_input from "../lib/agent_input.js";
import type * as lib_agent_shapes from "../lib/agent_shapes.js";
import type * as lib_http from "../lib/http.js";
import type * as lib_input from "../lib/input.js";
import type * as lib_markdown from "../lib/markdown.js";
import type * as lib_response from "../lib/response.js";
import type * as lib_response_shapes from "../lib/response_shapes.js";
import type * as profiles from "../profiles.js";
import type * as search from "../search.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  agent: typeof agent;
  browser: typeof browser;
  fetch: typeof fetch;
  jobs: typeof jobs;
  "lib/agent_constraints": typeof lib_agent_constraints;
  "lib/agent_input": typeof lib_agent_input;
  "lib/agent_shapes": typeof lib_agent_shapes;
  "lib/http": typeof lib_http;
  "lib/input": typeof lib_input;
  "lib/markdown": typeof lib_markdown;
  "lib/response": typeof lib_response;
  "lib/response_shapes": typeof lib_response_shapes;
  profiles: typeof profiles;
  search: typeof search;
}> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;

export const components = componentsGeneric() as unknown as {};
