# Connected Search-to-source demo

## Quick start

From a source checkout:

```sh
npm ci
npm run demo -- --use-cli-key
```

This explicitly reuses the key previously saved by `tinyfish auth login`. If you prefer your own secret-management workflow, set `TINYFISH_API_KEY` securely in the shell and run `npm run demo`.

The command builds the package, prepares an anonymous local Convex deployment, sets the real key via stdin, and runs Convex with the Vite frontend. Open the local URL printed by Vite. Live mode is the default and requires no browser credentials. Search for a topic, select 1–10 sources, choose Markdown/HTML/JSON, and fetch. Inspect the content or the complete structured result.

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
npm run test:live
```

The CLI calls use deployment credentials. Never give a deployment admin key to the frontend.
