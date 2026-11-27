const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const { runInNewContext } = require("node:vm");
const { registerAiIpc } = require("../ai-ipc.cjs");

function sender() {
  const instance = new EventEmitter();
  instance.isDestroyed = () => false;
  instance.messages = [];
  instance.mainFrame = {
    detached: false,
    send: (...args) => instance.messages.push(args),
  };
  return instance;
}

function fixture() {
  const handlers = new Map();
  const jobs = [];
  const operation = (_target, { signal, onChunk }) =>
    new Promise((resolve) => {
      const finish = () => resolve({ status: "ok", text: "done" });
      signal.addEventListener("abort", finish, { once: true });
      jobs.push({ signal, onChunk, finish });
    });
  const abortAll = registerAiIpc(handlers.set.bind(handlers), {
    getSettings: () => {
      throw new Error("internal storage details");
    },
    saveSettings: async () => {
      throw new Error("internal encryption details");
    },
    testConnection: operation,
    runEditorAi: operation,
    listModels: operation,
    signInChatGpt: operation,
  });
  return {
    invoke: (channel, ...args) => handlers.get(`drymdf:ai-${channel}`)(...args),
    jobs,
    abortAll,
  };
}

test("settings errors return a safe status without exposing exception text", async () => {
  const { invoke } = fixture();
  const owner = sender();
  assert.deepEqual(await invoke("get-settings", owner), { status: "error" });
  assert.deepEqual(await invoke("save-settings", owner, {}), {
    status: "error",
  });
});

test("AI stream and cancellation are scoped to the owning editor", async () => {
  const { invoke, jobs } = fixture();
  const first = sender();
  const second = sender();
  const result = invoke("run-editor", first, "connection-1", {});
  assert.equal(invoke("cancel-request", second, "connection-1"), false);
  assert.deepEqual(await invoke("test-connection", first, "connection-1", {}), {
    status: "invalid",
  });
  jobs[0].onChunk("hello");
  assert.deepEqual(first.messages, [
    ["drymdf:ai-chunk", "connection-1", "hello"],
  ]);
  assert.deepEqual(second.messages, []);
  assert.equal(invoke("cancel-request", first, "connection-1"), true);
  jobs[0].onChunk("late");
  assert.equal(first.messages.length, 1);
  assert.deepEqual(await result, { status: "cancelled" });
  assert.equal(invoke("cancel-request", first, "connection-1"), false);
  assert.equal(first.listenerCount("destroyed"), 0);
});

test("cancelling browser sign-in aborts only the owning editor’s request", async () => {
  const { invoke, jobs } = fixture();
  const owner = sender();
  const result = invoke("chatgpt-sign-in", owner, "sign-in");
  assert.equal(invoke("cancel-request", sender(), "sign-in"), false);
  assert.equal(jobs[0].signal.aborted, false);
  assert.equal(invoke("cancel-request", owner, "sign-in"), true);
  assert.deepEqual(await result, { status: "cancelled" });
});

test("AI work aborts on editor teardown, cross-document navigation, or app shutdown", async () => {
  const { invoke, jobs, abortAll } = fixture();
  const navigation = sender();
  const destroyed = sender();
  const crashed = sender();
  const shutdown = sender();
  const first = invoke("test-connection", navigation, "id", {});
  const others = [destroyed, crashed, shutdown].map((owner) =>
    invoke("list-models", owner, "id", {}),
  );
  navigation.emit("did-start-navigation", { isMainFrame: false });
  navigation.emit("did-start-navigation", {
    isMainFrame: true,
    isSameDocument: true,
  });
  assert.equal(jobs[0].signal.aborted, false);
  navigation.emit("did-start-navigation", {
    isMainFrame: true,
    isSameDocument: false,
  });
  destroyed.emit("destroyed");
  crashed.emit("render-process-gone");
  assert.deepEqual(
    jobs.map(({ signal }) => signal.aborted),
    [true, true, true, false],
  );
  abortAll();
  for (const result of await Promise.all([first, ...others])) {
    assert.deepEqual(result, { status: "cancelled" });
  }
});

test("preload routes matching chunks only and removes subscriptions after settlement", async () => {
  const ipcRenderer = new EventEmitter();
  let bridge;
  let settle;
  ipcRenderer.invoke = (channel, id, target) => {
    if (channel === "drymdf:ai-run-editor") {
      assert.equal(id, "editor-1");
      assert.equal(target.action, "ask");
      return Promise.resolve({ status: "ok", text: "answer" });
    }
    if (channel === "drymdf:ai-cancel-request") return id === "editor-1";
    assert.equal(channel, "drymdf:ai-test-connection");
    assert.equal(id, "expected");
    assert.equal(target.model, "test-model");
    return new Promise((resolve) => {
      settle = resolve;
    });
  };
  runInNewContext(readFileSync(join(__dirname, "../preload.cjs"), "utf8"), {
    require(name) {
      assert.equal(name, "electron");
      return {
        ipcRenderer,
        contextBridge: {
          exposeInMainWorld: (_name, api) => {
            bridge = api;
          },
        },
      };
    },
  });
  const chunks = [];
  const target = { model: "test-model" };
  const result = bridge.testAiConnection("expected", target, (...args) =>
    chunks.push(args),
  );
  assert.equal(
    (await bridge.testAiConnection("expected", target)).status,
    "invalid",
  );
  ipcRenderer.emit("drymdf:ai-chunk", {}, "other", "ignored");
  ipcRenderer.emit("drymdf:ai-chunk", {}, "expected", { invalid: true });
  ipcRenderer.emit("drymdf:ai-chunk", {}, "expected", "delivered");
  settle({ status: "ok", text: "delivered" });
  assert.deepEqual(await result, { status: "ok", text: "delivered" });
  assert.deepEqual(chunks, [["delivered"]]);
  assert.equal(ipcRenderer.listenerCount("drymdf:ai-chunk"), 0);

  const editorChunks = [];
  const unsubscribe = bridge.onAiChunk((...args) => editorChunks.push(args));
  const editor = bridge.runEditorAi("editor-1", { action: "ask" });
  ipcRenderer.emit("drymdf:ai-chunk", {}, "editor-1", "answer");
  ipcRenderer.emit("drymdf:ai-chunk", {}, "editor-1", {});
  assert.deepEqual(await editor, { status: "ok", text: "answer" });
  assert.equal(await bridge.cancelAiRequest("editor-1"), true);
  unsubscribe();
  ipcRenderer.emit("drymdf:ai-chunk", {}, "editor-1", "ignored");
  assert.deepEqual(editorChunks, [["editor-1", "answer"]]);
  assert.equal(ipcRenderer.listenerCount("drymdf:ai-chunk"), 0);
});

test("main registers AI behind the existing top-level editor request guard", async () => {
  const handlers = new Map();
  const app = new EventEmitter();
  app.isPackaged = true;
  app.getPath = () => "/test-user-data";
  let startup;
  app.whenReady = () => ({
    then: (start) => {
      startup = start;
    },
  });
  const desktop = join(__dirname, "..");
  const safeStorage = {};
  const electron = {
    app,
    safeStorage,
    BrowserWindow: class {
      webContents = { setWindowOpenHandler() {}, on() {} };
      async loadURL() {}
    },
    ipcMain: { handle: handlers.set.bind(handlers) },
    protocol: { registerSchemesAsPrivileged() {}, handle() {} },
    session: {
      defaultSession: {
        setPermissionRequestHandler() {},
        setPermissionCheckHandler() {},
        webRequest: { onBeforeRequest() {} },
      },
    },
  };
  runInNewContext(readFileSync(join(desktop, "main.cjs"), "utf8"), {
    __dirname: desktop,
    process: { resourcesPath: "/test-resources" },
    require(name) {
      if (name === "electron") return electron;
      if (name === "./ai-ipc.cjs") return { registerAiIpc };
      if (name === "./chatgpt-auth.cjs")
        return { createChatGptAuth: () => ({}) };
      if (name === "./ai-providers.cjs")
        return {
          createAiProviders: (options) => {
            assert.equal(options.userData, "/test-user-data");
            assert.equal(options.safeStorage, safeStorage);
            return { getSettings: () => ({ status: "ok" }) };
          },
        };
      if (name === "./exports.cjs")
        return { createExports: () => ({ attach() {} }) };
      if (
        name === "./documents.cjs" ||
        name === "/test-resources/print-layout.js"
      )
        return {};
      return require(name);
    },
  });
  startup();
  const owner = sender();
  owner.mainFrame.url = "drymdf://app/editor/";
  const getSettings = handlers.get("drymdf:ai-get-settings");
  assert.throws(
    () => getSettings({ sender: owner, senderFrame: { ...owner.mainFrame } }),
    /must come from/,
  );
  assert.deepEqual(
    await getSettings({ sender: owner, senderFrame: owner.mainFrame }),
    { status: "ok" },
  );
  owner.mainFrame.url = "drymdf://app/print/";
  assert.throws(
    () => getSettings({ sender: owner, senderFrame: owner.mainFrame }),
    /must come from/,
  );
});
