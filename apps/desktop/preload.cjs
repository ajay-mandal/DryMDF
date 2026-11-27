const { contextBridge, ipcRenderer, webUtils } = require("electron");

const activeAiTests = new Set();

async function testAiConnection(requestId, target, onChunk) {
  if (
    typeof requestId !== "string" ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(requestId) ||
    activeAiTests.has(requestId) ||
    activeAiTests.size >= 8 ||
    (onChunk !== undefined && typeof onChunk !== "function")
  ) {
    return { status: "invalid" };
  }
  const listener = (_event, id, chunk) => {
    if (id !== requestId || typeof chunk !== "string") return;
    try {
      onChunk(chunk);
    } catch {
      // A renderer callback must not surface provider output in preload errors.
    }
  };
  activeAiTests.add(requestId);
  if (onChunk) ipcRenderer.on("drymdf:ai-chunk", listener);
  try {
    return await ipcRenderer.invoke(
      "drymdf:ai-test-connection",
      requestId,
      target,
    );
  } finally {
    if (onChunk) ipcRenderer.removeListener("drymdf:ai-chunk", listener);
    activeAiTests.delete(requestId);
  }
}

contextBridge.exposeInMainWorld("drymdfDesktop", {
  printPdf: (html, options) =>
    ipcRenderer.invoke("drymdf:print-pdf", html, options),
  openMarkdown: (file) =>
    ipcRenderer.invoke("drymdf:open-markdown", webUtils.getPathForFile(file)),
  chooseMarkdown: () => ipcRenderer.invoke("drymdf:choose-markdown"),
  chooseWorkspaceFiles: (multiple, legacy) =>
    ipcRenderer.invoke("drymdf:choose-workspace-files", multiple, legacy),
  checkWorkspaceFile: (id) =>
    ipcRenderer.invoke("drymdf:check-workspace-file", id),
  locateWorkspaceFile: (id) =>
    ipcRenderer.invoke("drymdf:locate-workspace-file", id),
  saveWorkspaceFile: (id, revision, content) =>
    ipcRenderer.invoke("drymdf:save-workspace-file", id, revision, content),
  openNotificationSettings: () =>
    ipcRenderer.invoke("drymdf:notification-settings"),
  listRecents: () => ipcRenderer.invoke("drymdf:list-recents"),
  reopenMarkdown: (id) => ipcRenderer.invoke("drymdf:reopen-markdown", id),
  readImage: (id, source) =>
    ipcRenderer.invoke("drymdf:read-image", id, source),
  chooseExportFolder: () => ipcRenderer.invoke("drymdf:choose-export-folder"),
  saveDocument: async (requestId, filename, format, data, onSaving) => {
    const listener = (_event, id) => {
      if (id === requestId) onSaving();
    };
    ipcRenderer.on("drymdf:export-saving", listener);
    try {
      return await ipcRenderer.invoke(
        "drymdf:save-document",
        requestId,
        filename,
        format,
        data,
      );
    } finally {
      ipcRenderer.removeListener("drymdf:export-saving", listener);
    }
  },
  revealExport: (handle) => ipcRenderer.invoke("drymdf:reveal-export", handle),
  releaseExport: (handle) =>
    ipcRenderer.invoke("drymdf:release-export", handle),
  notify: (type) => ipcRenderer.invoke("drymdf:notify", type),
  getAiSettings: () => ipcRenderer.invoke("drymdf:ai-get-settings"),
  signInChatGpt: (requestId) =>
    ipcRenderer.invoke("drymdf:ai-chatgpt-sign-in", requestId),
  disconnectChatGpt: () => ipcRenderer.invoke("drymdf:ai-chatgpt-disconnect"),
  saveAiSettings: (settings) =>
    ipcRenderer.invoke("drymdf:ai-save-settings", settings),
  listAiModels: (requestId, target) =>
    ipcRenderer.invoke("drymdf:ai-list-models", requestId, target),
  testAiConnection,
  runEditorAi: (requestId, input) =>
    ipcRenderer.invoke("drymdf:ai-run-editor", requestId, input),
  onAiChunk: (onChunk) => {
    if (typeof onChunk !== "function")
      throw new TypeError("Expected a callback");
    const listener = (_event, id, chunk) => {
      if (typeof id !== "string" || typeof chunk !== "string") return;
      try {
        onChunk(id, chunk);
      } catch {
        // Do not surface provider output in preload errors.
      }
    };
    ipcRenderer.on("drymdf:ai-chunk", listener);
    return () => {
      ipcRenderer.removeListener("drymdf:ai-chunk", listener);
    };
  },
  cancelAiRequest: (requestId) =>
    ipcRenderer.invoke("drymdf:ai-cancel-request", requestId),
});
