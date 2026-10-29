import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { test } from "node:test";
import { Camoufox } from "../dist/nodes/Camoufox/Camoufox.node.js";
import { canvasSubtitle } from "../dist/nodes/Camoufox/actions.js";
import { httpUrl, planRequest } from "../dist/nodes/Camoufox/request-plan.js";
import { serviceUrl } from "../dist/nodes/Camoufox/transport.js";

function context(items, respond, continueOnFail = false) {
  const calls = [];
  return {
    calls,
    getInputData: () => items.map((json) => ({ json })),
    getCredentials: async () => ({
      baseUrl: "http://browser:9377",
      apiKey: "credential-secret",
    }),
    getNode: () => ({
      name: "Camoufox",
      type: "@frasergrant/n8n-nodes-camoufox.camoufox",
      typeVersion: 1,
      position: [0, 0],
      parameters: {},
    }),
    getNodeParameter(name, index, fallback) {
      return items[index][name] ?? fallback;
    },
    continueOnFail: () => continueOnFail,
    helpers: {
      async httpRequestWithAuthentication(credential, options) {
        assert.equal(credential, "camoufoxApi");
        calls.push(options);
        return respond(options);
      },
      async prepareBinaryData(buffer, fileName, mimeType) {
        return { data: buffer.toString("base64"), fileName, mimeType };
      },
    },
  };
}

function reader(values) {
  return {
    text: (name) => values[name],
    number: (name) => values[name],
    boolean: (name) => values[name],
  };
}

test("each item evaluates its own parameters and retains item linking", async () => {
  const instance = context(
    [
      {
        operation: "openTab",
        userId: "one",
        sessionKey: "work",
        url: "http://fixture/one",
      },
      {
        operation: "openTab",
        userId: "two",
        sessionKey: "work",
        url: "http://fixture/two",
      },
    ],
    (options) => ({ tabId: options.body.userId }),
  );
  const [result] = await new Camoufox().execute.call(instance);
  assert.deepEqual(
    result.map((item) => [
      item.json.userId,
      item.json.tabId,
      item.pairedItem.item,
    ]),
    [
      ["one", "one", 0],
      ["two", "two", 1],
    ],
  );
  assert.deepEqual(
    instance.calls.map((call) => call.body.url),
    ["http://fixture/one", "http://fixture/two"],
  );
});

test("writes are sequential, occur once, and continuation does not repeat an earlier item", async () => {
  let writes = 0;
  const instance = context(
    [0, 1].map((index) => ({
      operation: "click",
      userId: "one",
      tabId: `tab${index}`,
      targetType: "ref",
      target: "@e3",
    })),
    async (options) => {
      writes++;
      if (options.url.includes("tab0"))
        throw { statusCode: 409, body: "credential-secret" };
      return { ok: true };
    },
    true,
  );
  const [result] = await new Camoufox().execute.call(instance);
  assert.equal(writes, 2);
  assert.match(result[0].json.error, /fresh snapshot/);
  assert.equal(result[1].json.tabId, "tab1");
  assert.deepEqual(
    result.map((item) => item.pairedItem.item),
    [0, 1],
  );
  assert.equal(JSON.stringify(result).includes("credential-secret"), false);
  assert.equal(instance.calls[0].body.ref, "e3");
});

test("upstream errors cannot copy request credentials or typed text into errors", async () => {
  const instance = context(
    [
      {
        operation: "typeText",
        userId: "one",
        tabId: "tab",
        targetType: "selector",
        target: "#input",
        typingMode: "fill",
        text: "sensitive-test-value",
      },
    ],
    () => {
      throw {
        statusCode: 401,
        message: "credential-secret sensitive-test-value",
        response: { body: "credential-secret" },
      };
    },
  );
  await assert.rejects(new Camoufox().execute.call(instance), (error) => {
    assert.match(error.message, /access key/);
    assert.equal(JSON.stringify(error).includes("credential-secret"), false);
    assert.equal(JSON.stringify(error).includes("sensitive-test-value"), false);
    return true;
  });
});

test("screenshots use n8n binary storage and never put image bytes in JSON", async () => {
  const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
  const instance = context(
    [
      {
        operation: "takeScreenshot",
        userId: "one",
        tabId: "tab",
        fullPage: true,
        binaryPropertyName: "image",
      },
    ],
    () => image,
  );
  const [[item]] = await new Camoufox().execute.call(instance);
  assert.equal(item.binary.image.data, image.toString("base64"));
  assert.equal(item.binary.image.mimeType, "image/png");
  assert.equal(item.json.tabId, "tab");
  assert.equal(
    JSON.stringify(item.json).includes(image.toString("base64")),
    false,
  );
  assert.equal(instance.calls[0].encoding, "arraybuffer");
});

test("invalid screenshot responses and destination HTTP errors fail visibly", async () => {
  const image = context(
    [
      {
        operation: "takeScreenshot",
        userId: "one",
        tabId: "tab",
        fullPage: false,
      },
    ],
    () => Buffer.from("<html>error</html>"),
  );
  await assert.rejects(new Camoufox().execute.call(image), /PNG screenshot/);
  const page = context(
    [
      {
        operation: "openTab",
        userId: "one",
        sessionKey: "work",
        url: "http://fixture/missing",
      },
    ],
    () => ({ tabId: "tab", navigationOk: false, httpStatus: 404 }),
  );
  await assert.rejects(new Camoufox().execute.call(page), /HTTP error page/);
});

test("navigation checks existence before the API can implicitly create a replacement tab", async () => {
  const instance = context(
    [
      {
        operation: "navigate",
        userId: "one",
        tabId: "missing",
        url: "http://fixture",
      },
    ],
    () => {
      throw { statusCode: 404 };
    },
  );
  await assert.rejects(
    new Camoufox().execute.call(instance),
    /no longer available/,
  );
  assert.equal(instance.calls.length, 1);
  assert.equal(instance.calls[0].method, "GET");
  assert.match(instance.calls[0].url, /\/stats$/);
});

test("addresses and target paths are validated without changing service identity", () => {
  for (const url of [
    "file:///etc/passwd",
    "ws://browser:9222",
    "https://user:secret@example.com",
  ])
    assert.throws(() => httpUrl(url));
  for (const url of [
    "http://browser:9377?token=secret",
    "http://browser:9377/#fragment",
  ])
    assert.throws(() => serviceUrl(url));
  assert.equal(
    serviceUrl("http://browser:9377/api/"),
    "http://browser:9377/api",
  );
  const plan = planRequest(
    "click",
    reader({
      userId: "a/b",
      tabId: "../other?userId=other",
      targetType: "ref",
      target: "@e4",
    }),
  );
  assert.equal(plan.path, "/tabs/..%2Fother%3FuserId%3Dother/click");
  assert.deepEqual(plan.body, { userId: "a/b", ref: "e4" });
});

test("canvas subtitles identify the selected action using its readable name", () => {
  assert.match(canvasSubtitle, /"openTab":"Open Tab"/);
  assert.match(canvasSubtitle, /"takeScreenshot":"Take Screenshot"/);
  assert.match(canvasSubtitle, /\$parameter\["operation"\]/);
});
