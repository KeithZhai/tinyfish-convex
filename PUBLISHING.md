# Releasing tinyfish-convex

The npm package name is `tinyfish-convex`; the source repository is [KeithZhai/tinyfish-convex](https://github.com/KeithZhai/tinyfish-convex). Publishing through the author's account avoids requiring TinyFish organization permissions for the initial release. Ownership can be transferred later without changing the unscoped package import path.

Before a release:

1. Update the version and CHANGELOG.md using semver.
2. Run `npm ci`, `npm run check`, and `npm run verify:package`.
3. Run `npm run test:live` with a configured real key. Keep report output free of credentials and unnecessary fetched text.
4. Inspect `npm pack --dry-run`; exclude local environment files, deployment state and intermediate artifacts.
5. Commit the reviewed source, tag the version, and publish the package using the authorized npm account.

```sh
npm publish --access public
```

`prepublishOnly` performs the package checks. npm's own browser/passkey verification is completed by the account holder. A successful publish command can precede registry availability while npm reviews the artifact. Wait for `npm view tinyfish-convex@<version>` and the `latest` tag to resolve the intended version, then perform a fresh default-version registry install, verify its tarball hash, and run a real Search → Fetch in an independent consumer. Update the public release verification only after that passes. The repository's generated bindings allow consumer builds and CI to run without deployment credentials.

## Maintenance and directory submission

Use the public GitHub issue tracker for reproducible bugs. API-contract updates belong in the versioned OpenAPI snapshots; regenerate validators and response shapes together, then repeat live acceptance. Do not silently introduce beta fields into the supported interface.

Directory submission and an organization-level maintenance commitment are separate from publishing this package. Before submitting to [Convex Components](https://www.convex.dev/component-authoring), name the ongoing technical maintainer and backup, publish the demo destination, and supply the npm/repository links. Do not invent employee assignments or support guarantees.

## Supportable release description

> Typed TinyFish Search and Fetch for Convex actions. Search web, news, and research-paper sources, then read selected pages as Markdown, HTML, or JSON. Batch responses retain individual failures; selectors, metadata, and conditional requests are exposed through the same interface.

The included comparison checks a small fixed set of pages. It does not establish superior accuracy, speed, cost, or adoption over Firecrawl. Durable crawls and Agent job tracking require a later implementation.
