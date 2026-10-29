# Camoufox for n8n

Build browser workflows with named actions instead of assembling HTTP requests.
Each Camoufox step shows its selected action on the canvas, such as **Open Tab**,
**Click Element** or **Take Screenshot**.

![A Camoufox workflow with readable Open Tab, Get Snapshot and Close Tab steps](https://raw.githubusercontent.com/FraserGrant/n8n-nodes-camoufox/main/docs/workflow.png)

This MIT-licensed package connects to the [Camofox REST service](https://github.com/jo-inc/camofox-browser)
around the Camoufox Firefox browser. It does not install a browser into n8n and
does not connect to a raw Playwright WebSocket server.

Package: [@frasergrant/n8n-nodes-camoufox](https://www.npmjs.com/package/@frasergrant/n8n-nodes-camoufox).
Maintained by [FraserGrant](https://fraser-grant.com).

## Installation

Self-hosted n8n administrators can install the package under
**Settings → Community nodes** using its full package name.

For a downloaded release archive, install the tarball in n8n's community-package
directory, then restart your n8n instance so it discovers the package. See
[n8n's manual installation guide](https://docs.n8n.io/integrations/community-nodes/installation/manual-install/).

The package is a community integration. It has not been verified by n8n. n8n
Cloud availability requires a separate verification process.

## Credentials

Create a **Camoufox API** credential:

- **Service URL:** the Camofox HTTP address reachable from n8n, for example
  `http://browser:9377` when both services share a Docker network. `localhost`
  inside an n8n container refers to that container.
- **Access Key:** the service's `CAMOFOX_ACCESS_KEY`, when enabled. This is the
  key for normal browser actions, rather than Camofox's separate cookie-import
  or administration keys. n8n stores it as an encrypted credential.

The credential connection test checks the authenticated service status without
opening a page. A successful test confirms the connection, not a website login.
Services without an access key should remain on a trusted private network.

## First workflow

Import [the example workflow](examples/read-a-page.json) to start with Open Tab,
Get Snapshot and Close Tab already connected, then select your API credential.

1. Add **Camoufox → Open Tab**, select your credential and enter a URL.
2. Set **Browser User ID** to a stable identity and **Session Name** to a group
   for this work. The default identity is `n8n`.
3. Add **Get Snapshot**. The default Tab ID expression reads the previous step's
   `tabId`; Browser User ID also carries forward.
4. Add an action such as **Click Element** or **Type Text**. Choose a CSS selector
   or use a current snapshot reference, such as `e3`.
5. Add **Close Tab** when finished. This closes that tab and retains session login
   state according to your Camofox server's persistence configuration.

Run one task at a time against a shared tab. Sharing an identity shares browser
state; it does not provide a task lock between workflows, agents and people.

## Actions

| Purpose             | Actions                                                                      |
| ------------------- | ---------------------------------------------------------------------------- |
| Connection and tabs | Check Connection, Open Tab, List Tabs, Get Tab, Close Tab                    |
| Navigation          | Navigate, Go Back, Go Forward, Refresh Page                                  |
| Page content        | Get Snapshot, Get Links, Get Images, Take Screenshot                         |
| Interaction         | Click Element, Type Text, Press Key, Select Option, Scroll, Wait for Element |

Each input item runs sequentially with its own evaluated parameters and paired
output item. Ordinary actions return the browser response plus the tab/user
context. List Tabs returns its `tabs` array in one item. Take Screenshot returns
an n8n binary PNG in `data`, or your chosen output field, with metadata in JSON.
Get Snapshot exposes Camofox's truncation/continuation fields; use **Options →
Snapshot Offset** with `nextOffset` to read the next chunk.

Requests have bounded timeouts and do not automatically retry writes. Missing
tabs and stale references produce actionable errors. n8n's **On Error → Continue**
can handle a failed item without repeating earlier actions. Navigate checks that
the tab exists before calling Camofox's navigation endpoint, which can otherwise
create a replacement tab implicitly.

## Login and secret handling

The API credential authenticates n8n to Camofox. It does not contain website
passwords or implement Hermes's `browser_vault`. This package does not change
Hermes's credential rules. Type Text is a regular workflow parameter: text
entered there can be retained with workflow definitions or execution data.
Use the shared browser's human sign-in flow for website passwords until a
dedicated credential-autofill integration is provided.

## Compatibility

CI tests n8n **2.44.5** and **2.45.5**, and Camofox **1.18.1**, with image digests
pinned in the test runner and workflow. Other versions require validation.
The npm peer declaration follows n8n's required `n8n-workflow: "*"` convention;
it is not a claim that every n8n version is supported.

Select Option uses the option's visible label. The tested Camofox version can
time out before falling back from a missing label to an HTML value.
Viewport resizing is excluded from this release because the tested service's
Playwright/browser protocol rejects that operation. Arbitrary JavaScript,
session deletion and cookie/trace export are also outside this package's actions.

The [LPilic Camoufox package](https://github.com/LPilic/n8n-nodes-camoufox)
uses a different Playwright WebSocket interface. This is an independent
implementation for the REST service used by our operations stack. Its workflows
are not drop-in replacements for this package.

## Development and CI

Use Node.js 24 and npm:

```sh
npm ci --ignore-scripts
npm run check
npm run test:integration
```

`check` runs formatting, strict typed engineering lint, TypeScript, the official
n8n community-node lint, the official node build and focused contract tests.
The official strict n8n lint configuration remains unchanged; the additional
engineering rules live in a separate configuration.

Integration tests require Docker. They pack the publishable archive, install it
into a fresh n8n community-package directory, start real n8n and Camofox servers,
publish workflows and execute all actions through n8n webhooks against a local
fixture website. They also check shared synthetic login state, authentication
failure, missing tabs, credential-safe errors and the action label in the real
n8n editor using Playwright. Install its Chromium browser first with
`npx playwright install chromium`. Only uniquely named test
containers, networks and volumes are removed. Evidence stays in ignored `.local/`.

The GitHub Actions matrix repeats the real installation and workflows for both
supported n8n versions. The tested tarball and integration evidence are retained
as workflow artifacts.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [the release instructions](docs/releasing.md).
