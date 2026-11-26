const { contextBridge, ipcRenderer, webUtils } = require("electron");

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
  saveDocument: (filename, extension, data) =>
    ipcRenderer.invoke("drymdf:save-document", filename, extension, data),
  notify: (type) => ipcRenderer.invoke("drymdf:notify", type),
});
