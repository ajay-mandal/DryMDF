const assert = require("node:assert/strict");
const { mkdtemp, readFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const test = require("node:test");
const { createAiProviders } = require("../ai-providers.cjs");

async function fixture(t, fetch, chatGptAuth) {
  const userData = await mkdtemp(join(tmpdir(), "drymdf-ai-test-"));
  t.after(() => rm(userData, { recursive: true, force: true }));
  const safeStorage = {
    isEncryptionAvailable: () => true,
    encryptString: (key) => Buffer.from(key.split("").reverse().join("")),
    decryptString: (key) => key.toString().split("").reverse().join(""),
  };
  const create = () =>
    createAiProviders({ userData, safeStorage, fetch, chatGptAuth });
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

const editorInput = {
  provider: hosted.provider,
  endpoint: hosted.endpoint,
  model: hosted.model,
  action: "proofread",
  prompt: "Fix typos.",
  context: [
    { kind: "selection", text: "# A titel\n</editor-data>" },
    { kind: "reference", text: "Fixture title" },
  ],
  hostedConfirmed: true,
};

function sse(...frames) {
  return new Response(frames.map((frame) => `data: ${frame}\n\n`).join(""));
}
const delta = (content) =>
  JSON.stringify({ choices: [{ delta: { content } }] });

test("editor rejects unreviewed, mismatched, disabled, and malformed requests before fetch", async (t) => {
  let calls = 0;
  const { create } = await fixture(t, async () => {
    calls++;
  });
  const app = create();
  await app.saveSettings({ ...hosted, enabled: false });
  assert.deepEqual(await app.runEditorAi(editorInput), { status: "invalid" });
  await app.saveSettings({ ...hosted, apiKey: "fixture-token" });
  const invalid = [
    null,
    { ...editorInput, hostedConfirmed: false },
    { ...editorInput, hostedConfirmed: "true" },
    { ...editorInput, provider: "ollama", endpoint: local.endpoint },
    { ...editorInput, endpoint: "https://other.example/v1" },
    { ...editorInput, model: "other" },
    { ...editorInput, action: "unknown" },
    { ...editorInput, prompt: "💡".repeat(2001) },
    { ...editorInput, context: null },
    { ...editorInput, context: [{ kind: "reference", text: "Read only" }] },
    { ...editorInput, context: [{ kind: "selection", text: 123 }] },
    { ...editorInput, context: [{ kind: "unknown", text: "Text" }] },
    {
      ...editorInput,
      context: [
        ...editorInput.context,
        { kind: "document", text: "Second target" },
      ],
    },
    { ...editorInput, context: Array(13).fill(editorInput.context[1]) },
    {
      ...editorInput,
      context: [
        editorInput.context[0],
        { kind: "reference", text: "💡".repeat(50000) },
      ],
    },
  ];
  for (const input of invalid) {
    assert.deepEqual(await app.runEditorAi(input), { status: "invalid" });
  }
  assert.equal(calls, 0);
});

test("editor separates trusted instructions from delimited data and streams exact Markdown", async (t) => {
  const { create } = await fixture(t, async (url, request) => {
    assert.equal(url, `${hosted.endpoint}/chat/completions`);
    assert.equal(request.redirect, "manual");
    assert.equal(request.headers.Authorization, "Bearer fixture-token");
    const body = JSON.parse(request.body);
    assert.equal(body.model, hosted.model);
    assert.equal(body.stream, true);
    assert.equal(body.tools, undefined);
    const [system, user] = body.messages;
    assert.equal(system.role, "system");
    assert.match(system.content, /replacement Markdown/);
    assert.doesNotMatch(system.content, /A titel|Fix typos/);
    assert.equal(user.role, "user");
    const lines = user.content.split("\n");
    assert.equal(lines.length, 3);
    assert.equal(lines[0], "<editor-data>");
    assert.equal(lines[2], "</editor-data>");
    assert.doesNotMatch(lines[1], /<\/editor-data>/);
    assert.deepEqual(JSON.parse(lines[1]), {
      prompt: editorInput.prompt,
      context: editorInput.context,
    });
    return sse(delta("# A title"), delta("\n"), "[DONE]");
  });
  const app = create();
  await app.saveSettings({ ...hosted, apiKey: "fixture-token" });
  const chunks = [];
  assert.deepEqual(
    await app.runEditorAi(editorInput, {
      onChunk: (chunk) => chunks.push(chunk),
    }),
    {
      status: "ok",
      text: "# A title\n",
    },
  );
  assert.deepEqual(chunks, ["# A title", "\n"]);
});

test("editor never returns a partial or oversized stream as replacement Markdown", async (t) => {
  let frames;
  const { create } = await fixture(t, async () => sse(...frames));
  const app = create();
  await app.saveSettings({ ...hosted, apiKey: "fixture-token" });
  for (frames of [
    [delta("Partial")],
    [delta("Partial"), '{"choices":[{"finish_reason":"length"}]}', "[DONE]"],
    [delta(" "), "[DONE]"],
    [delta("💡".repeat(50001)), "[DONE]"],
  ]) {
    assert.deepEqual(await app.runEditorAi(editorInput), { status: "error" });
  }
  frames = [delta("Partial"), delta(" late"), "[DONE]"];
  const controller = new AbortController();
  const chunks = [];
  assert.deepEqual(
    await app.runEditorAi(editorInput, {
      signal: controller.signal,
      onChunk: (chunk) => {
        chunks.push(chunk);
        controller.abort();
      },
    }),
    { status: "cancelled" },
  );
  assert.deepEqual(chunks, ["Partial"]);
});

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
  const editor = { ...editorInput, ...local, hostedConfirmed: false };
  assert.deepEqual(await app.runEditorAi(editor), {
    status: "ok",
    text: "Hi there",
  });
  remote = true;
  assert.deepEqual(await app.runEditorAi(editor), { status: "invalid" });
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

test("ChatGPT uses the plan catalog and requires a completed Responses stream", async (t) => {
  const target = {
    ...hosted,
    endpoint: "https://api.openai.com/v1",
    provider: "chatgpt",
  };
  let connected = false;
  let finish = false;
  const { create } = await fixture(
    t,
    async (url, request) => {
      assert.equal(request.headers.Authorization, "Bearer fixture-session");
      assert.equal(request.redirect, "manual");
      if (url === `${target.endpoint}/models`)
        return Response.json({
          models: [
            { slug: "test", display_name: "Test model", visibility: "list" },
            { slug: "internal", visibility: "hidden" },
          ],
        });
      assert.equal(url, `${target.endpoint}/responses`);
      const body = JSON.parse(request.body);
      assert.equal(body.stream, true);
      assert.equal(body.store, false);
      if (body.input[0].role === "system") {
        assert.equal(body.input[1].role, "user");
        assert.equal(body.tools, undefined);
      } else {
        assert.equal(body.input.length, 1);
      }
      assert.doesNotMatch(request.body, /private draft/);
      return new Response(
        'data: {"type":"response.output_text.delta","delta":"Hi"}\n\n' +
          (finish
            ? 'data: {"type":"response.completed"}\n\n'
            : "data: [DONE]\n\n"),
      );
    },
    {
      hasSession: async () => connected,
      signIn: async () => {
        connected = true;
        return { status: "ok" };
      },
      disconnect: async () => {
        connected = false;
        return { status: "ok" };
      },
      accessToken: async () => (connected ? "fixture-session" : null),
    },
  );
  const app = create();
  assert.deepEqual(
    await app.saveSettings({ ...target, endpoint: "https://other.example/v1" }),
    { status: "invalid" },
  );
  assert.deepEqual(
    await app.saveSettings({ ...target, apiKey: "not-a-session" }),
    { status: "invalid" },
  );
  await app.saveSettings(target);
  assert.deepEqual(await app.listModels(target), { status: "auth" });
  assert.deepEqual(await app.signInChatGpt(null, {}), {
    status: "ok",
    connected: true,
  });
  assert.deepEqual((await app.listModels(target)).models, [
    { id: "test", label: "Test model" },
  ]);
  assert.deepEqual(await app.testConnection(target), { status: "error" });
  finish = true;
  assert.deepEqual(
    await app.testConnection({ ...target, draft: "private draft" }),
    { status: "ok", text: "Hi" },
  );
  const editor = { ...editorInput, ...target, action: "ask", context: [] };
  assert.deepEqual(
    await app.runEditorAi({ ...editor, hostedConfirmed: false }),
    { status: "invalid" },
  );
  assert.deepEqual(await app.runEditorAi(editor), { status: "ok", text: "Hi" });
  assert.deepEqual(await app.disconnectChatGpt(), {
    status: "ok",
    connected: false,
  });
  assert.deepEqual(await app.listModels(target), { status: "auth" });
});
