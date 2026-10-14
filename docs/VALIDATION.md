# Validation record — October 13, 2026

| Check | Result |
| --- | --- |
| Package and example TypeScript checks | Passed |
| Vitest / convex-test / local bridge boundary tests | 57 passed |
| Vite production build | Passed |
| Official Convex component codegen | Passed |
| Local Convex component deployment | Passed with a real TinyFish key |
| Isolated tarball install and consumer types | Passed |
| Minimum Convex 1.42 consumer TypeScript check | Passed |
| Installed component test helper | Passed in an isolated consumer |
| Live Convex → TinyFish acceptance | 8/8 cases passed |
| Shared-source live extraction comparison | TinyFish 5/5 and Firecrawl 5/5 phrase checks |
| Real browser workflow | Connected local Convex Search and Fetch |
| Local bridge boundary | Foreign Origin/Host, simple forms, oversized bodies and arbitrary function paths rejected |

The live acceptance suite exercised the actual component through Convex and TinyFish's real REST APIs. It checked official-source domain filtering, research-paper year bounds, Markdown extraction from three documentation pages, a JavaScript-rendered quote page and a PDF, mixed success/404 batches, HTML, JSON document trees, selectors, metadata, links and all-failure batches.

Automated tests also cover authenticated host wrappers, API-key isolation, query encoding, option forwarding, conditional null results, additive/malformed provider responses, HTTP 401/402/403/429/500/503, non-JSON gateways, network failures, missing credentials and deadline cleanup.

The comparison records predetermined phrase presence and output character counts on five pages. Cache policies, tiers and call paths differ, so it makes no relative latency claim. It is not a comprehensive semantic-accuracy benchmark. See [EVALUATION.md](EVALUATION.md).

The real key was read from the user's authorized local TinyFish CLI configuration and sent to the local Convex environment over stdin. No key, local admin credential or private deployment state is included in the npm tarball or source archive.

To rerun the real acceptance cases after setting the deployment key: `npm run test:live`. To inspect the demo: `npm run demo -- --use-cli-key` (or use a securely supplied shell environment key).
