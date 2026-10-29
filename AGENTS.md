# Camoufox community node

This is FraserGrant's MIT-licensed n8n integration for the Camofox REST service
around Camoufox. It is independent of the private operations product and SDK.

- Use `npm ci`, `npm run check`, `npm run build`, and `npm run test:integration`.
- Keep the package free of runtime dependencies except the `n8n-workflow` peer.
- Follow n8n's node and credential contracts and official node CLI. Preserve
  paired items, expression evaluation per input item, continue-on-error, binary
  outputs and readable operation names on the workflow canvas.
- Keep browser actions sequential. Do not retry writes automatically or silently
  create another browser/session when a target is missing.
- Use n8n's authenticated HTTP helpers. Secrets belong in n8n credentials, never
  source, examples, ordinary node outputs or error payloads.
- Validate external data at boundaries; do not use casts or `any`.
- Keep practical source files below roughly 300 lines, split by responsibility.
- Integration checks must install the `npm pack` tarball into fresh n8n storage,
  start a real n8n server and Camofox instance, and run workflows against a local
  fixture site. Only remove uniquely named test-owned containers and volumes.
- Do not use live business containers, credentials, accounts or external websites
  as test fixtures. Keep temporary test evidence in ignored `.local/`.
- Publishing to npm must use GitHub Actions provenance. Never claim n8n verified
  status until n8n has actually approved the package.
