# TinyFish × Convex workflow lab

## Quick start

From a source checkout:

```sh
npm ci
npm run demo -- --use-cli-key
```

This explicitly reuses the key previously saved by `tinyfish auth login`. If you prefer your own secret-management workflow, set `TINYFISH_API_KEY` securely in the shell and run `npm run demo`.

The command builds the package, prepares an anonymous local Convex deployment, sets the real key via stdin, and runs Convex with the Vite frontend. Open the local URL printed by Vite. Live mode is the default and requires no browser credentials. Search for a topic, optionally limit domains and explain what you need, select 1–10 sources, choose Markdown/HTML/JSON, and fetch. The purpose is forwarded to both Search and Fetch. Inspect, copy or download the content or complete structured result.

Every live request goes to a fixed internal example action, then the installed component, then TinyFish's real REST API. The bridge invokes the Convex CLI without shell interpolation. It is bound to localhost, checks Host/Origin, requires JSON, and limits request-body size. API keys and deployment credentials stay outside frontend assets.

## Offline sample

`npm run example:dev` starts the frontend alone. Select Sample mode to use explicitly labeled illustrative fixtures. Those fixtures do not demonstrate live extraction or measure latency.

## Hosted applications

The local bridge is not a production API. For a hosted frontend, configure your app's normal Convex authentication and call the authenticated public actions in `example/convex/web.ts`, adding application-specific quotas. Public wrappers reject unauthenticated users before contacting TinyFish. Do not expose an unauthenticated metered action using your personal key.

## CLI acceptance

After the backend is configured:

```sh
npx convex run web:search '{"query":"Convex components","include_domains":"docs.convex.dev"}'
npx convex run web:fetch '{"urls":["https://docs.convex.dev/components/authoring"],"format":"markdown"}'
npx convex run research:read '{"search":{"query":"Convex components authoring","include_domains":"docs.convex.dev"},"maxSources":3}'
npm run test:live
```

The CLI calls use deployment credentials. Never give a deployment admin key to the frontend.

## Agent, Browser and Profile

The second workspace starts a real Agent, subscribes to its Convex status and current step, supports explicit cancellation/resuming and downloads results. The latest job ID survives refresh; no deployment key or browser state is stored in localStorage.

Use Open browser to get a CDP connection and Close browser when finished. For saved state, create a non-default Profile, start its setup session, connect with your own CDP tool, log in and save the exact session. Setup connections stay in memory and unsaved state expires. Save reports cookie/domain counts and failures.

The local lab's agent has a 15-step / 180-second budget. Its default task first navigates to page 2 of the public quotes sandbox, then extracts that page's first quote and author. It asks the upstream provider for structured output.

For hosted apps, use agent.ts and resources.ts: derive owner IDs from identity, check per-resource grants and authorize explicit Profile IDs. Global default Profile and Vault access are refused by this shared-account example. Start with makeAgentAPI for public pages and add authorizeRequest when introducing account resources.

Run `npm run test:capabilities` after configuring the backend for the reproducible Browser → login sandbox → Profile → Agent acceptance suite. It creates a disposable non-default Profile and closes/deletes its own fixtures. Browser state, CDP URLs and login passwords are omitted from reports.
