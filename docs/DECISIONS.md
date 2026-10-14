# Engineering decisions

Search/Fetch stay stateless and backward compatible. Read converts one upstream HTML extraction into Markdown, preserving code and table fields. Research composes Search and Read. The package's primary improvement is a complete Convex-native workflow with durable Web Agent jobs and saved browser state.

Agent start is a mutation: insertion, caller-key deduplication and scheduler dispatch commit atomically. Owner IDs come from host authentication. Async dispatch runs separately; the provider's run ID is persisted before polling. There is no documented caller idempotency field in the checked-in async contract, so uncertain submissions are never retried automatically. An atomic queue watchdog recovers action failures before the submission claim, with three bounded attempts. A separate submission watchdog marks unresolved acceptance explicitly. Recovery uses API-verified operator reconciliation.

Tracking has a lease, revision fencing, bounded read retries, stale-action watchdogs and terminal-state guards. Cancellation is provider-confirmed. Background reads suppress screenshots/HTML; structured results above 128 KB use file storage. Steps have a separate indexed table. Public pagination uses convex-helpers because core database paginate is unsupported inside components.

TinyFish's current webhook contract has no documented signing mechanism. This release uses authenticated scheduled polling instead of accepting unsigned callback results. No fabricated HMAC mechanism or production webhook claim is made.

Browser and Profile methods use the official API contracts. CDP connections run in the caller's Node worker; the component itself uses standard Convex actions. Connection URLs and raw browser state are not persisted in component tables. Profile/Vault ownership belongs to the provider account; the host must maintain grants. The API factory denies sensitive account resources until a request authorizer is installed. The hosted example checks owner/profile/setup/browser relationships.

The local demo is developer tooling: fixed localhost routes, Host/Origin/JSON/size checks, no shell interpolation or arbitrary function paths. Agent updates come from a real Convex CLI query subscription. Processes are terminated as groups when streams close. Production builds exclude the bridge and use the authenticated host wrappers.

CI is an inactive template in docs/ci.example.yml; it has not run on GitHub. The publishing token does not have workflow scope. Automated local checks, isolated tarball consumer verification, real API acceptance and registry consumer verification are separate evidence. Benchmark limits are in EVALUATION.md.
