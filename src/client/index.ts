import type { GenericActionCtx, GenericDataModel } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";
import type { SearchArgs, SearchResponse, FetchArgs, FetchResponse } from "../types.js";
export type * from "../types.js";
export { searchArgs, fetchArgs, searchResponse, fetchResponse } from "../validators.js";
type ActionCtx = Pick<GenericActionCtx<GenericDataModel>, "runAction">;
/** Server-side helper: call from your application's Convex actions. */
export class TinyFish {
  constructor(private readonly component: ComponentApi) {}
  search(ctx: ActionCtx, args: SearchArgs): Promise<SearchResponse> {
    return ctx.runAction(this.component.search.query, args);
  }
  fetch(ctx: ActionCtx, args: FetchArgs): Promise<FetchResponse> {
    return ctx.runAction(this.component.fetch.getContents, args);
  }
}
