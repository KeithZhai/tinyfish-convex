# Wayne's install and test path

The 0.2.0 candidate covers Search, Fetch, Read, Browser, durable Web Agent jobs and Browser Context Profiles. Check npm's latest version before installing; the release-verification record distinguishes published packages from local candidates.

1. Install `tinyfish-convex`, mount its config and set the deployment key as shown in the root README.
2. Run the Search → Read recipe with a domain filter. Inspect good pages and per-URL failures.
3. Mount `makeAgentAPI` with your normal auth. Start a task, retain its idempotency key and subscribe using `useQuery`. Refresh the page and recover by job ID.
4. Cancel a running task. Confirm cancellation from the provider, preserving a completion that won the race.
5. Create an isolated Browser, connect a Node/CDP worker, click a page control and close it.
6. Create a non-default Profile; set it up, save it and start an Agent with that explicit ID. Check `profileAttached` and the returned data.

For a local demo without configuring an auth provider:

```sh
git clone https://github.com/KeithZhai/tinyfish-convex.git
cd tinyfish-convex
npm ci
npm run demo -- --use-cli-key
```

The local bridge only invokes fixed internal functions. The hosted wrappers derive ownership from identity and guard individual resources. The API factory blocks account Profiles/Vault unless a server authorization callback is provided.

The benchmark report does not establish universal Firecrawl superiority: native Read matches 51/51 explicit content checks on the exploratory corpus; Search ties 7/7 target-found checks and trails Firecrawl in rank. The authenticated interactive flow is verified against a public login sandbox, not an enterprise SSO or bot-challenge suite.

Support: GitHub issues. Publication is maintained through Keith Zhai's accounts. A company-owned directory listing still needs an agreed maintenance owner; this package does not imply that organizational commitment.
