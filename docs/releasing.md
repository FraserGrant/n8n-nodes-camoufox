# Releases

Publish from the public `FraserGrant/n8n-nodes-camoufox` repository using GitHub
Actions. The package is MIT-licensed; n8n verification is a separate submission.

## First npm publication

An npm maintainer must control the `@frasergrant` scope. Releases use GitHub
Actions OIDC through [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
No long-lived npm token or `NPM_TOKEN` Actions secret is needed.

npm requires the package to exist before a trusted publisher can be configured.
An authenticated npm maintainer must first create or reserve this new package.
This initial account action requires npm sign-in; GitHub CLI authentication does
not grant npm account access. Do not publish the real release locally: n8n
verification requires its provenance-bearing GitHub Actions publication.

Once the package exists, add this trusted publisher in its npm package settings:

| Setting           | Value                                      |
| ----------------- | ------------------------------------------ |
| Provider          | GitHub Actions                             |
| Organization      | `FraserGrant`                              |
| Repository        | `n8n-nodes-camoufox`                       |
| Workflow filename | `publish.yml`                              |
| Environment       | Leave empty                                |
| Allowed action    | Allow direct publishing with `npm publish` |

New npm trust configurations allow staged publishing by default, so explicitly
enable direct publishing for this workflow. Complete its first publish within
npm's two-day trust-configuration window. Future releases receive short-lived
credentials from GitHub automatically and include provenance.

The [npm trust CLI prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/#prerequisites)
document the existing-package requirement. An initial reservation can use
[npm staged publishing](https://docs.npmjs.com/staged-publishing/), which creates
a public `0.0.0-stage` placeholder for a new package; publishing or approving a
staged version is a distinct action. Do not approve a local staged copy as the
real node release when a GitHub provenance release is required.

GitHub source availability alone is not an npm release. npm trusted publishing
must be configured by an authorised maintainer before this workflow can publish.

## Release a version

1. Update `package.json`, its lockfile and `CHANGELOG.md` with the final behavior.
2. Run `npm run check` and `npm run test:integration`. Review the archive file list
   and final diff. All matrix jobs must pass.
3. Commit and push the reviewed source. Tag it `vX.Y.Z` to match `package.json`.
4. Create a GitHub release for that tag. `Publish to npm` reruns the complete
   matrix, then publishes its tested tarball with an npm provenance statement.
5. Verify the package's registry metadata and install that registry version in
   a fresh n8n instance. Only then describe it as published and installable by name.

Run the same integration suite against the published registry archive with
`N8N_TEST_PACKAGE=@frasergrant/n8n-nodes-camoufox@X.Y.Z npm run test:integration`.
The default CI path packs the current source; this option downloads the named
registry package instead and records its source in the integration report.

The publish workflow can also be dispatched against an existing version tag.
It refuses branch refs and mismatched version tags. Never overwrite a published
version or claim verification by n8n before approval in its Creator Portal.
