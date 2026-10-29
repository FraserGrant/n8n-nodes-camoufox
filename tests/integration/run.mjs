import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { actions } from "../../dist/nodes/Camoufox/actions.js";
import { browserImage, startServices } from "./docker.mjs";
import { verifyEditor } from "./editor.mjs";
import {
  createActionWorkflow,
  invokeAction,
  n8nClient,
  waitForServer,
  waitForNodeCatalog,
} from "./n8n.mjs";

const services = await startServices();
const verified = [];
let retainPreview = false;
try {
  await waitForServer(services.baseUrl);
  const client = await n8nClient(services.baseUrl);
  const type = await waitForNodeCatalog(services.baseUrl, client.cookie);
  assert.match(type.subtitle, /Open Tab/);
  const workflows = {};
  for (const operation of Object.keys(actions))
    workflows[operation] = await createActionWorkflow(
      client,
      services.id,
      operation,
    );
  const defaults = {
    userId: services.id,
    sessionKey: "test-session",
    url: "http://fixture:8080",
    targetType: "selector",
    typingMode: "fill",
    fullPage: false,
  };
  async function action(operation, values = {}) {
    const result = await invokeAction(services.baseUrl, workflows[operation], {
      ...defaults,
      ...values,
    });
    assert.equal(
      result.error,
      undefined,
      `${operation} failed: ${result.error}`,
    );
    if (!verified.includes(operation)) verified.push(operation);
    return result;
  }
  console.info("Executing all actions through published n8n webhook workflows");
  await action("checkConnection");
  const tab = await action("openTab");
  assert.equal(typeof tab.tabId, "string");
  defaults.tabId = tab.tabId;
  const tabs = await action("listTabs");
  assert.ok(tabs.tabs.some((item) => item.tabId === tab.tabId));
  const initial = await action("getSnapshot");
  assert.match(initial.snapshot, /Browser node test/);
  await action("waitForElement", { selector: "#name", waitTimeout: 10000 });
  await action("typeText", { target: "#name", text: "Node tester" });
  await action("typeText", {
    target: "#password",
    text: "synthetic-fixture-value",
  });
  await action("pressKey", { key: "Tab" });
  await action("selectOption", { target: "#colour", option: "Green" });
  assert.match((await action("getSnapshot")).snapshot, /Selected green/);
  const links = await action("getLinks");
  assert.ok(JSON.stringify(links).includes("/next"));
  const images = await action("getImages");
  assert.ok(JSON.stringify(images).includes("pixel.svg"));
  await action("scroll", { direction: "down", amount: 200 });
  const screenshot = await action("takeScreenshot");
  assert.equal(screenshot.mimeType, "image/png");
  await action("click", { target: "#save" });
  assert.match((await action("getSnapshot")).snapshot, /Signed in/);
  await action("navigate", { url: "http://fixture:8080/next" });
  assert.match((await action("getSnapshot")).snapshot, /Next page/);
  await action("back");
  assert.match((await action("getSnapshot")).snapshot, /Signed in/);
  await action("forward");
  await action("refresh");
  const stats = await action("getTab");
  assert.match(stats.url, /\/next$/);
  const second = await action("openTab", {
    sessionKey: "another-workflow",
    url: "http://fixture:8080/account",
  });
  assert.match(
    (await action("getSnapshot", { tabId: second.tabId })).snapshot,
    /Signed in/,
  );
  await action("closeTab", { tabId: second.tabId });

  console.info(
    "Checking authentication rejection, stale tabs and credential-safe errors",
  );
  const invalidCredential = await client.rest("credentials", "POST", {
    name: "Deliberately incorrect test key",
    type: "camoufoxApi",
    data: { baseUrl: "http://browser:9377", apiKey: "invalid-test-key" },
  });
  const forbidden = await createActionWorkflow(
    client,
    services.id,
    "listTabs",
    {
      credentialId: invalidCredential.id,
      continueOnFail: true,
      suffix: "auth",
    },
  );
  const failure = await invokeAction(services.baseUrl, forbidden, defaults);
  assert.match(failure.error, /access key/);
  assert.equal(JSON.stringify(failure).includes("invalid-test-key"), false);
  const missing = await createActionWorkflow(client, services.id, "navigate", {
    continueOnFail: true,
    suffix: "missing",
  });
  const notFound = await invokeAction(services.baseUrl, missing, {
    ...defaults,
    tabId: "nonexistent-tab",
  });
  assert.match(notFound.error, /no longer available/);
  assert.equal(
    (await action("listTabs")).tabs.length,
    1,
    "Navigation must not implicitly create a missing tab",
  );
  await action("closeTab");
  assert.equal((await action("listTabs")).tabs.length, 0);
  assert.equal(verified.length, Object.keys(actions).length);
  console.info(
    "Checking the installed node and readable action label in the n8n editor",
  );
  await verifyEditor(
    services.baseUrl,
    client.cookie,
    workflows.openTab.id,
    services.evidence,
  );
  const report = {
    verifiedAt: new Date().toISOString(),
    n8nImage: services.n8nImage,
    browserImage,
    operations: verified,
    packageFiles: services.packageFiles.map((file) => file.path),
    editorActionLabel: "Open Tab",
  };
  await writeFile(
    path.join(services.evidence, "report.json"),
    JSON.stringify(report, undefined, 2),
  );
  console.info(
    `Passed: installed package discovered by n8n, ${verified.length} real browser actions, shared login, binary screenshot and failure handling.`,
  );
  if (process.env.KEEP_TEST_SERVICES === "1") {
    await writeFile(
      path.join(services.evidence, "preview.json"),
      JSON.stringify({
        baseUrl: services.baseUrl,
        cookie: client.cookie,
        workflowId: workflows.openTab.id,
        resources: services.resources,
      }),
    );
    console.info(
      `Preview remains available at ${services.baseUrl}; cleanup is pending.`,
    );
    retainPreview = true;
  }
} finally {
  if (!retainPreview) await services.cleanup();
}
