const assert = require("node:assert/strict");
const { mkdtemp, readFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const test = require("node:test");
const { createAiProviders } = require("../ai-providers.cjs");

async function fixture(t, fetch) {
  const userData = await mkdtemp(join(tmpdir(), "drymdf-ai-test-"));
  t.after(() => rm(userData, { recursive: true, force: true }));
  const safeStorage = {
    isEncryptionAvailable: () => true,
    encryptString: (key) => Buffer.from(key.split("").reverse().join("")),
    decryptString: (key) => key.toString().split("").reverse().join(""),
  };
  const create = () => createAiProviders({ userData, safeStorage, fetch });
  return { userData, create };
}

const hosted = {
  provider: "hosted",
  endpoint: "https://provider.example/v1",
  model: "test",
  enabled: true,
};
const local = {
  provider: "ollama",
  endpoint: "http://127.0.0.1:11434",
  model: "local",
  enabled: true,
};

test("hosted credential persists across service re-creation and never follows the endpoint", async (t) => {
  let calls = 0;
  const { userData, create } = await fixture(t, async (url, headers) => {
    calls++;
    assert.equal(url, hosted.endpoint + "/models");
    assert.equal(headers.headers.Authorization, "Bearer fixture-token");
    assert.equal(headers.redirect, "manual");
    return Response.json({ data: [{ id: "test" }] });
  });
  assert.equal(
    (await create().saveSettings({ ...hosted, apiKey: "fixture-token" }))
      .status,
    "ok",
  );
  assert.doesNotMatch(
    await readFile(join(userData, "ai-settings.json"), "utf8"),
    /fixture-token/,
  );
  const app = create();
  assert.equal((await app.listModels(hosted)).status, "ok");
  const other = { ...hosted, endpoint: "https://provider.example/other" };
  assert.equal((await app.saveSettings(other)).settings.hasApiKey, false);
  assert.deepEqual(await app.listModels(other), { status: "auth" });
  assert.equal(calls, 1);
  assert.equal((await app.saveSettings(hosted)).settings.hasApiKey, true);
  await app.saveSettings({ ...hosted, apiKey: null });
  assert.deepEqual(await app.listModels(hosted), { status: "auth" });
});

test("Ollama lists local chat models, revalidates remote metadata, and streams only a fixed prompt", async (t) => {
  let remote = false;
  const { create } = await fixture(t, async (url, options) => {
    const path = new URL(url).pathname;
    if (path === "/api/tags")
      return Response.json({
        models: [
          { model: "local" },
          { model: "large:cloud" },
          { model: "alias", remote_host: "https://example.com" },
        ],
      });
    if (path === "/api/show")
      return Response.json({
        capabilities: ["completion"],
        ...(remote ? { remote_model: "cloud" } : {}),
      });
    assert.equal(path, "/api/chat");
    assert.doesNotMatch(options.body, /not-to-send/);
    return new Response(
      '{"message":{"content":"Hi"}}\n{"message":{"content":" there"},"done":true}',
    );
  });
  const app = create();
  assert.deepEqual(await app.listModels(local), { status: "invalid" });
  assert.deepEqual(
    await app.saveSettings({ ...local, endpoint: "http://example.com" }),
    { status: "invalid" },
  );
  await app.saveSettings(local);
  assert.deepEqual((await app.listModels(local)).models, [
    { id: "local", label: "local" },
  ]);
  const chunks = [];
  assert.deepEqual(
    await app.testConnection(
      { ...local, content: "not-to-send" },
      { onChunk: (chunk) => chunks.push(chunk) },
    ),
    { status: "ok", text: "Hi there" },
  );
  assert.deepEqual(chunks, ["Hi", " there"]);
  remote = true;
  assert.deepEqual(await app.testConnection(local), { status: "invalid" });
});

test("LM Studio separates unavailable and empty states, then parses a recovered SSE stream", async (t) => {
  let state = "offline";
  const { create } = await fixture(t, async (url) => {
    if (state === "offline") throw new TypeError("offline");
    if (url.endsWith("/api/v1/models"))
      return Response.json({
        models: [
          { key: "embedding", type: "embedding", size_bytes: 1 },
          ...(state === "ready"
            ? [{ key: "local", type: "llm", size_bytes: 1 }]
            : []),
        ],
      });
    assert.ok(url.endsWith("/v1/chat/completions"));
    return new Response(
      'data: {"choices":[{"delta":{"content":"hello"}}]}\r\n\r\ndata: [DONE]\r\n\r\n',
    );
  });
  const app = create();
  const target = {
    ...local,
    provider: "lm-studio",
    endpoint: "http://127.0.0.1:1234",
  };
  await app.saveSettings(target);
  assert.deepEqual(await app.listModels(target), { status: "unavailable" });
  state = "empty";
  assert.deepEqual(await app.listModels(target), { status: "empty" });
  state = "ready";
  assert.deepEqual(await app.testConnection(target), {
    status: "ok",
    text: "hello",
  });
});
