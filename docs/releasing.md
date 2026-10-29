# Releases

Publish from the public `FraserGrant/n8n-nodes-camoufox` repository using GitHub
Actions. The package is MIT-licensed; n8n verification is a separate submission.

## First npm publication

An npm maintainer must control the `@frasergrant` scope. Configure npm trusted
publishing for this repository and `.github/workflows/publish.yml`, or provide a
scoped publishing token through the repository's `NPM_TOKEN` Actions secret.
Credentials must never be committed. This setup is required before the first
registry publication; GitHub source availability alone is not an npm release.

## Release a version

1. Update `package.json`, its lockfile and `CHANGELOG.md` with the final behavior.
2. Run `npm run check` and `npm run test:integration`. Review the archive file list
   and final diff. All matrix jobs must pass.
3. Commit and push the reviewed source. Tag it `vX.Y.Z` to match `package.json`.
4. Create a GitHub release for that tag. `Publish to npm` reruns the complete
   matrix, then publishes its tested tarball with an npm provenance statement.
5. Verify the package's registry metadata and install that registry version in
   a fresh n8n instance. Only then describe it as published and installable by name.

The publish workflow can also be dispatched against an existing version tag.
It refuses branch refs and mismatched version tags. Never overwrite a published
version or claim verification by n8n before approval in its Creator Portal.
