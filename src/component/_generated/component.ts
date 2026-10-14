/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    fetch: {
      getContents: FunctionReference<
        "action",
        "internal",
        {
          exclude_selectors?: Array<string>;
          format?: "markdown" | "html" | "json";
          if_modified_since?: string;
          if_none_match?: string;
          iframe_links?: boolean;
          image_links?: boolean;
          include_etag_and_last_modified?: boolean;
          include_selectors?: Array<string>;
          links?: boolean;
          page_metadata?: boolean;
          per_url_timeout_ms?: number;
          purpose?: string;
          ttl?: number;
          urls: Array<string>;
        },
        {
          errors: Array<{
            candidate_selectors?: Array<string>;
            error: string;
            status?: number;
            unmatched_selectors?: Array<string>;
            url: string;
          }>;
          request_id?: string;
          results: Array<{
            author: string | null;
            description: string | null;
            etag?: string;
            final_url: string | null;
            format: "markdown" | "html" | "json";
            iframe_links?: Array<string>;
            image_links?: Array<string>;
            language: string | null;
            last_modified?: string;
            latency_ms?: number | null;
            links?: Array<string>;
            not_modified?: boolean;
            page_metadata?: Record<string, any>;
            published_date: string | null;
            text: string | Record<string, any> | null;
            title: string | null;
            unmatched_selectors?: Array<string>;
            url: string;
          }>;
        },
        Name
      >;
    };
    search: {
      query: FunctionReference<
        "action",
        "internal",
        {
          after_date?: string;
          before_date?: string;
          domain_type?: "web" | "news" | "research_paper";
          exclude_domains?: string;
          fetch?: string;
          include_domains?: string;
          include_thumbnail?: "true" | "false";
          language?: string;
          location?: string;
          page?: number;
          pub_year_max?: number;
          pub_year_min?: number;
          purpose?: string;
          query: string;
          recency_minutes?: number;
        },
        {
          page: number;
          query: string;
          request_id?: string;
          results: Array<{
            authors?: Array<string>;
            cited_by_count?: number;
            date?: string;
            fetch?: any;
            fetch_error?: any;
            pdf_url?: string;
            position: number;
            publisher?: string;
            site_name: string;
            snippet: string;
            thumbnail_url?: string;
            title: string;
            url: string;
            venue?: string;
            year?: number;
          }>;
          total_results: number;
        },
        Name
      >;
    };
  };
