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
    agent: {
      reconcile: FunctionReference<
        "action",
        "internal",
        { jobId: string; ownerId: string; runId: string },
        null,
        Name
      >;
      result: FunctionReference<
        "action",
        "internal",
        { jobId: string; ownerId: string },
        any,
        Name
      >;
      resultUrl: FunctionReference<
        "action",
        "internal",
        { jobId: string; ownerId: string },
        string | null,
        Name
      >;
    };
    browser: {
      close: FunctionReference<
        "action",
        "internal",
        { sessionId: string },
        null,
        Name
      >;
      create: FunctionReference<
        "action",
        "internal",
        {
          proxy_config?: {
            country_code?: string;
            enabled?: boolean;
            password?: string;
            type?: "tinyfish" | "custom";
            url?: string;
            username?: string;
          };
          timeout_seconds?: number | null;
          url?: string;
        },
        { base_url: string; cdp_url: string; session_id: string },
        Name
      >;
    };
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
      read: FunctionReference<
        "action",
        "internal",
        {
          exclude_selectors?: Array<string>;
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
    jobs: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { jobId: string; ownerId: string },
        null,
        Name
      >;
      forget: FunctionReference<
        "mutation",
        "internal",
        { jobId: string; ownerId: string },
        null,
        Name
      >;
      get: FunctionReference<
        "query",
        "internal",
        { jobId: string; ownerId: string },
        {
          cancelRequested: boolean;
          createdAt: number;
          error: { code: string; message: string; requestId?: string } | null;
          idempotencyKey: string;
          jobId: string;
          lastAction: string | null;
          ownerId: string;
          profileAttached: boolean | null;
          profileId: string | null;
          request: {
            agent_config?: {
              cursor_style?: "fish" | "standard" | "green-pointer";
              max_duration_seconds?: number;
              max_steps?: number;
              mode?: "default" | "strict";
            };
            api_integration?: string;
            browser_profile?: "lite" | "stealth";
            capture_config?: {
              elements?: boolean;
              html?: boolean;
              recording?: boolean;
              screenshots?: boolean;
              snapshots?: boolean;
            };
            credential_item_ids?: Array<string>;
            goal: string;
            output_schema?: Record<string, any>;
            profile_id?: string;
            proxy_config?: {
              country_code?: "US" | "GB" | "CA" | "DE" | "FR" | "JP" | "AU";
              enabled: boolean;
            };
            url: string;
            use_profile?: boolean;
            use_vault?: boolean;
          };
          result: any;
          resultStored: boolean;
          runId: string | null;
          status:
            | "QUEUED"
            | "SUBMITTING"
            | "PENDING"
            | "RUNNING"
            | "COMPLETED"
            | "FAILED"
            | "CANCELLED"
            | "SUBMISSION_UNKNOWN"
            | "TRACKING_PAUSED";
          stepsCount: number;
          streamingUrl: string | null;
          trackingError: {
            code: string;
            message: string;
            requestId?: string;
          } | null;
          updatedAt: number;
        },
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          ownerId: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            cancelRequested: boolean;
            createdAt: number;
            error: { code: string; message: string; requestId?: string } | null;
            idempotencyKey: string;
            jobId: string;
            lastAction: string | null;
            ownerId: string;
            profileAttached: boolean | null;
            profileId: string | null;
            request: {
              agent_config?: {
                cursor_style?: "fish" | "standard" | "green-pointer";
                max_duration_seconds?: number;
                max_steps?: number;
                mode?: "default" | "strict";
              };
              api_integration?: string;
              browser_profile?: "lite" | "stealth";
              capture_config?: {
                elements?: boolean;
                html?: boolean;
                recording?: boolean;
                screenshots?: boolean;
                snapshots?: boolean;
              };
              credential_item_ids?: Array<string>;
              goal: string;
              output_schema?: Record<string, any>;
              profile_id?: string;
              proxy_config?: {
                country_code?: "US" | "GB" | "CA" | "DE" | "FR" | "JP" | "AU";
                enabled: boolean;
              };
              url: string;
              use_profile?: boolean;
              use_vault?: boolean;
            };
            result: any;
            resultStored: boolean;
            runId: string | null;
            status:
              | "QUEUED"
              | "SUBMITTING"
              | "PENDING"
              | "RUNNING"
              | "COMPLETED"
              | "FAILED"
              | "CANCELLED"
              | "SUBMISSION_UNKNOWN"
              | "TRACKING_PAUSED";
            stepsCount: number;
            streamingUrl: string | null;
            trackingError: {
              code: string;
              message: string;
              requestId?: string;
            } | null;
            updatedAt: number;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
      resume: FunctionReference<
        "mutation",
        "internal",
        { jobId: string; ownerId: string },
        null,
        Name
      >;
      start: FunctionReference<
        "mutation",
        "internal",
        {
          idempotencyKey: string;
          ownerId: string;
          pollIntervalMs?: number;
          request: {
            agent_config?: {
              cursor_style?: "fish" | "standard" | "green-pointer";
              max_duration_seconds?: number;
              max_steps?: number;
              mode?: "default" | "strict";
            };
            api_integration?: string;
            browser_profile?: "lite" | "stealth";
            capture_config?: {
              elements?: boolean;
              html?: boolean;
              recording?: boolean;
              screenshots?: boolean;
              snapshots?: boolean;
            };
            credential_item_ids?: Array<string>;
            goal: string;
            output_schema?: Record<string, any>;
            profile_id?: string;
            proxy_config?: {
              country_code?: "US" | "GB" | "CA" | "DE" | "FR" | "JP" | "AU";
              enabled: boolean;
            };
            url: string;
            use_profile?: boolean;
            use_vault?: boolean;
          };
        },
        string,
        Name
      >;
      steps: FunctionReference<
        "query",
        "internal",
        {
          jobId: string;
          ownerId: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            action: string | null;
            duration: string | null;
            id: string;
            sequence: number;
            status: string;
            stepId: string;
            timestamp: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        },
        Name
      >;
    };
    profiles: {
      cancelSetup: FunctionReference<
        "action",
        "internal",
        { profileId: string; session_id: string },
        null,
        Name
      >;
      create: FunctionReference<
        "action",
        "internal",
        {
          name: string;
          proxy_country_code?:
            | "US"
            | "GB"
            | "CA"
            | "AU"
            | "DE"
            | "FR"
            | "IT"
            | "ES"
            | "NL"
            | "JP"
            | "SG"
            | "BR"
            | "IN"
            | null;
          set_as_default?: boolean;
        },
        {
          created_at: string;
          domain_count?: number;
          fingerprint_seed?: string;
          id: string;
          is_default?: boolean;
          name: string;
          proxy_country_code?:
            | "US"
            | "GB"
            | "CA"
            | "AU"
            | "DE"
            | "FR"
            | "IT"
            | "ES"
            | "NL"
            | "JP"
            | "SG"
            | "BR"
            | "IN"
            | null;
          updated_at?: string;
        },
        Name
      >;
      get: FunctionReference<
        "action",
        "internal",
        { profileId: string },
        {
          created_at: string;
          domain_count?: number;
          domains: Array<{
            cookie_count: number;
            domain: string;
            last_accessed_at: string;
            last_written_at: string;
            last_written_by_run_id: string;
            local_storage_origin_count: number;
          }>;
          fingerprint_seed?: string;
          id: string;
          is_default?: boolean;
          name: string;
          proxy_country_code?:
            | "US"
            | "GB"
            | "CA"
            | "AU"
            | "DE"
            | "FR"
            | "IT"
            | "ES"
            | "NL"
            | "JP"
            | "SG"
            | "BR"
            | "IN"
            | null;
          updated_at?: string;
        },
        Name
      >;
      list: FunctionReference<
        "action",
        "internal",
        {},
        {
          profiles: Array<{
            created_at: string;
            domain_count?: number;
            fingerprint_seed?: string;
            id: string;
            is_default?: boolean;
            name: string;
            proxy_country_code?:
              | "US"
              | "GB"
              | "CA"
              | "AU"
              | "DE"
              | "FR"
              | "IT"
              | "ES"
              | "NL"
              | "JP"
              | "SG"
              | "BR"
              | "IN"
              | null;
            signed_in_sites?: Array<{ claimed_at: string; site: string }>;
            updated_at?: string;
          }>;
        },
        Name
      >;
      remove: FunctionReference<
        "action",
        "internal",
        { profileId: string },
        null,
        Name
      >;
      removeDomain: FunctionReference<
        "action",
        "internal",
        { domain: string; profileId: string },
        null,
        Name
      >;
      saveSetup: FunctionReference<
        "action",
        "internal",
        {
          profileId: string;
          session_id: string;
          signed_in_sites?: Array<string>;
        },
        {
          cleanup_failed?: boolean;
          cleanup_kind?: string;
          cookie_count: number;
          domains_failed: Array<string>;
          domains_skipped: {
            blob_too_large: Array<string>;
            cookies_skipped: Array<string>;
            local_storage_skipped: Array<string>;
            session_storage_skipped: Array<string>;
          };
          domains_updated: Array<string>;
          pages_captured?: number;
          sign_in?: {
            site: string | null;
            status:
              "recorded" | "already_recorded" | "not_detected" | "unverifiable";
          };
          signed_in_sites?: Array<string>;
          target_reads_skipped?: number;
          user_confirmed_sites?: {
            recorded: Array<string>;
            rejected: Array<{
              reason:
                | "invalid_site"
                | "not_saved"
                | "no_sign_in_cookie"
                | "record_failed";
              site: string;
            }>;
          };
        },
        Name
      >;
      startSetup: FunctionReference<
        "action",
        "internal",
        { profileId: string; timeout_seconds?: number | null; url?: string },
        {
          base_url: string;
          cdp_url: string;
          expires_at: string;
          session_id: string;
          timeout_seconds: number;
        },
        Name
      >;
      update: FunctionReference<
        "action",
        "internal",
        {
          name?: string;
          profileId: string;
          proxy_country_code?:
            | "US"
            | "GB"
            | "CA"
            | "AU"
            | "DE"
            | "FR"
            | "IT"
            | "ES"
            | "NL"
            | "JP"
            | "SG"
            | "BR"
            | "IN"
            | null;
          set_as_default?: boolean;
        },
        {
          created_at: string;
          domain_count?: number;
          domains: Array<{
            cookie_count: number;
            domain: string;
            last_accessed_at: string;
            last_written_at: string;
            last_written_by_run_id: string;
            local_storage_origin_count: number;
          }>;
          fingerprint_seed?: string;
          id: string;
          is_default?: boolean;
          name: string;
          proxy_country_code?:
            | "US"
            | "GB"
            | "CA"
            | "AU"
            | "DE"
            | "FR"
            | "IT"
            | "ES"
            | "NL"
            | "JP"
            | "SG"
            | "BR"
            | "IN"
            | null;
          updated_at?: string;
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
