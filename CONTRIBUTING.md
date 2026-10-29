# Contributing

Open an issue describing the intended browser task, n8n version and Camofox
version. Include a small workflow with account details and credentials removed.

Keep one browser integration per package. Use current n8n conventions, readable
action labels, explicit validation and small modules split by responsibility.
Production code uses n8n's HTTP and binary helpers and has no runtime dependencies.
Do not access the host filesystem or environment from a node.

Run `npm run check` and `npm run test:integration` before submitting a change.
New actions need a real workflow in the integration runner, rather than only
mocking the HTTP helper. Use the synthetic fixture website, not business accounts
or external websites. Preserve existing operation identifiers and node versions;
breaking behavior requires a versioning and migration decision.

Contributions are licensed under the repository's MIT licence. Keep bug reports,
test evidence and pull requests free of website passwords, cookies and API keys.
