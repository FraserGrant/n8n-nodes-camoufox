import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";

export async function waitForServer(url) {
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      const response = await fetch(`${url}/rest/settings`, {
        signal: AbortSignal.timeout(2000),
      });
      if (
        response.ok &&
        response.headers.get("content-type")?.includes("application/json")
      ) {
        const settings = await response.json();
        if (
          typeof settings.data?.userManagement?.showSetupOnFirstLoad ===
          "boolean"
        )
          return;
      }
    } catch {
      /* service is starting */
    }
    await setTimeout(1000);
  }
  throw new Error("n8n did not become healthy within 90 seconds.");
}

export async function n8nClient(baseUrl) {
  let cookie = "";
  async function rest(path, method = "GET", body) {
    const response = await fetch(`${baseUrl}/rest/${path}`, {
      method,
      headers: { "content-type": "application/json", cookie },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(30000),
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length > 0)
      cookie = cookies.map((value) => value.split(";")[0]).join("; ");
    const text = await response.text();
    assert.equal(
      response.ok,
      true,
      `${method} /rest/${path}: ${response.status} ${text.slice(0, 600)}`,
    );
    return JSON.parse(text).data;
  }
  await rest("owner/setup", "POST", {
    email: "node-tests@example.test",
    firstName: "Node",
    lastName: "Tests",
    password: "Disposable-Node-Test-Password-37",
  });
  if (cookie === "")
    await rest("login", "POST", {
      emailOrLdapLoginId: "node-tests@example.test",
      password: "Disposable-Node-Test-Password-37",
    });
  const credential = await rest("credentials", "POST", {
    name: "Integration browser",
    type: "camoufoxApi",
    data: { baseUrl: "http://browser:9377", apiKey: "integration-test-key" },
  });
  return {
    rest,
    credential,
    get cookie() {
      return cookie;
    },
  };
}

export async function waitForNodeCatalog(baseUrl, cookie) {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/types/nodes.json`, {
        headers: { cookie },
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const types = await response.json();
        if (Array.isArray(types)) {
          const node = types.find(
            (type) => type.name === "@frasergrant/n8n-nodes-camoufox.camoufox",
          );
          if (node) return node;
        }
      }
    } catch {
      /* n8n generates its editor catalog asynchronously during startup */
    }
    await setTimeout(1000);
  }
  throw new Error(
    "The installed node did not appear in the signed-in n8n editor catalog.",
  );
}

const fields = [
  "userId",
  "tabId",
  "url",
  "sessionKey",
  "targetType",
  "target",
  "text",
  "typingMode",
  "key",
  "option",
  "direction",
  "amount",
  "selector",
  "waitTimeout",
  "width",
  "height",
  "fullPage",
];

export async function createActionWorkflow(
  client,
  id,
  operation,
  overrides = {},
) {
  const webhookPath = `${id}-${operation}-${overrides.suffix ?? "normal"}`;
  const parameters = Object.fromEntries(
    fields.map((name) => [name, `={{ $json.body.${name} }}`]),
  );
  const workflow = await client.rest("workflows", "POST", {
    name: `Camoufox integration - ${operation}`,
    settings: { executionOrder: "v1", saveDataSuccessExecution: "all" },
    nodes: [
      {
        id: "trigger",
        name: "Test request",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [0, 0],
        webhookId: webhookPath,
        parameters: {
          httpMethod: "POST",
          path: webhookPath,
          responseMode: "lastNode",
          options: {},
        },
      },
      {
        id: "action",
        name: "Camoufox",
        type: "@frasergrant/n8n-nodes-camoufox.camoufox",
        typeVersion: 1,
        position: [240, 0],
        parameters: {
          ...parameters,
          operation,
          binaryPropertyName: "data",
          options: {},
        },
        credentials: {
          camoufoxApi: {
            id: overrides.credentialId ?? client.credential.id,
            name: "Integration browser",
          },
        },
        ...(overrides.continueOnFail === true
          ? { onError: "continueRegularOutput" }
          : {}),
      },
    ],
    connections: {
      "Test request": {
        main: [[{ node: "Camoufox", type: "main", index: 0 }]],
      },
    },
  });
  await client.rest(`workflows/${workflow.id}/activate`, "POST", {
    versionId: workflow.versionId,
  });
  return { id: workflow.id, path: webhookPath };
}

export async function invokeAction(baseUrl, workflow, body) {
  // A newly published webhook can appear just after its activation response.
  // Only retry an explicit unregistered-webhook response, before any workflow ran.
  for (let attempt = 0; attempt < 20; attempt++) {
    const response = await fetch(`${baseUrl}/webhook/${workflow.path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180000),
    });
    const text = await response.text();
    if (
      response.status === 404 &&
      text.includes("is not registered") &&
      attempt < 19
    ) {
      await setTimeout(250);
      continue;
    }
    assert.equal(
      response.ok,
      true,
      `Workflow returned ${response.status}: ${text.slice(0, 600)}`,
    );
    const output = JSON.parse(text);
    return Array.isArray(output) ? output[0] : output;
  }
  throw new Error("The published webhook did not become ready.");
}
