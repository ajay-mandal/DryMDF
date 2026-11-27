const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  Notification,
  protocol,
  safeStorage,
  session,
  shell,
} = require("electron");
const { randomUUID } = require("node:crypto");
const { readFile, stat } = require("node:fs/promises");
const { createRequire } = require("node:module");
const { dirname, join, resolve, sep } = require("node:path");
const { pathToFileURL } = require("node:url");
const {
  chooseMarkdown,
  chooseWorkspaceFiles,
  checkWorkspaceFile,
  locateWorkspaceFile,
  saveWorkspaceFile,
  openMarkdown,
  listRecents,
  reopenMarkdown,
  readImage,
} = require("./documents.cjs");
const { createExports } = require("./exports.cjs");
const { registerAiIpc } = require("./ai-ipc.cjs");
const { createAiProviders } = require("./ai-providers.cjs");
const { createChatGptAuth } = require("./chatgpt-auth.cjs");
const { getBaseStyles, getDesktopPrintLayout } = require(
  join(
    app.isPackaged ? process.resourcesPath : join(__dirname, "build"),
    "print-layout.js",
  ),
);

const editorUrl = "drymdf://app/editor/";
const printDocuments = new Map();
let documentStyles;
let lastNotification;
const exportsService = createExports({
  parentWindow: (sender) => BrowserWindow.fromWebContents(sender),
  downloads: () => app.getPath("downloads"),
  dialog,
  shell,
  exportHtml,
});

protocol.registerSchemesAsPrivileged([
  {
    scheme: "drymdf",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

function localPaths() {
  if (app.isPackaged) {
    return {
      renderer: join(process.resourcesPath, "out"),
      katex: process.resourcesPath,
      highlight: join(process.resourcesPath, "github.css"),
    };
  }

  const frontend = join(__dirname, "../frontend");
  const requireFromFrontend = createRequire(join(frontend, "package.json"));
  return {
    renderer: join(frontend, "out"),
    katex: join(
      dirname(requireFromFrontend.resolve("katex/package.json")),
      "dist",
    ),
    highlight: requireFromFrontend.resolve("highlight.js/styles/github.css"),
  };
}

function fetchLocalFile(path) {
  return net.fetch(pathToFileURL(path).href);
}

async function serveFile(root, pathname) {
  const path = resolve(root, "." + decodeURIComponent(pathname));
  if (path !== root && !path.startsWith(root + sep)) {
    return new Response(null, { status: 404 });
  }
  const entry = await stat(path).catch(() => null);
  if (entry?.isDirectory()) {
    return fetchLocalFile(join(path, "index.html"));
  }
  if (entry?.isFile()) {
    return fetchLocalFile(path);
  }
  return new Response(null, { status: 404 });
}

function registerRoutes() {
  const paths = localPaths();
  protocol.handle("drymdf", async (request) => {
    const { hostname, pathname } = new URL(request.url);
    if (hostname === "app") return serveFile(paths.renderer, pathname);
    if (hostname !== "print") return new Response(null, { status: 404 });

    const html = printDocuments.get(pathname);
    if (html !== undefined) {
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy":
            "default-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src data:; base-uri 'none'; form-action 'none'",
        },
      });
    }
    if (pathname === "/highlight.css") return fetchLocalFile(paths.highlight);
    if (pathname === "/katex.min.css" || pathname.startsWith("/fonts/")) {
      return serveFile(paths.katex, pathname);
    }
    return new Response(null, { status: 404 });
  });
}

function lockNavigation(window) {
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1080,
    height: 690,
    minWidth: 560,
    minHeight: 420,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 14, y: 16 },
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      plugins: true,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  lockNavigation(window);
  exportsService.attach(window.webContents);
  void window.loadURL(editorUrl).catch((error) => console.error(error));
  return window;
}

function renderDocument(html, styles, assets = "") {
  return `<!doctype html>
    <html lang="en"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${assets}
    <style>${styles}</style>
    </head><body><div class="pdf-page-content">${html}</div></body></html>`;
}

async function bundleDocumentStyles() {
  const paths = localPaths();
  const [katex, highlight] = await Promise.all([
    readFile(join(paths.katex, "katex.min.css"), "utf8"),
    readFile(paths.highlight, "utf8"),
  ]);
  const fontPattern = /url\((fonts\/[-\w]+\.\w+)\)/g;
  const files = [
    ...new Set([...katex.matchAll(fontPattern)].map((match) => match[1])),
  ];
  const fonts = new Map(
    await Promise.all(
      files.map(async (path) => {
        const data = await readFile(join(paths.katex, path));
        return [path, data.toString("base64")];
      }),
    ),
  );
  return (
    katex.replace(
      fontPattern,
      (_, path) =>
        `url(data:application/octet-stream;base64,${fonts.get(path)})`,
    ) + highlight
  );
}

async function exportHtml(html) {
  documentStyles ??= bundleDocumentStyles().catch((error) => {
    documentStyles = undefined;
    throw error;
  });
  return renderDocument(
    html,
    (await documentStyles) + getBaseStyles(),
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:; base-uri 'none'; form-action 'none'">`,
  );
}

async function printPdf(html, options) {
  const path = `/${randomUUID()}.html`;
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  lockNavigation(window);
  const { styles, pdfOptions } = getDesktopPrintLayout(options);
  printDocuments.set(
    path,
    renderDocument(
      html,
      styles,
      '<link rel="stylesheet" href="/katex.min.css"><link rel="stylesheet" href="/highlight.css">',
    ),
  );

  try {
    await window.loadURL(`drymdf://print${path}`);
    await window.webContents.executeJavaScript(
      "document.fonts.ready.then(() => true)",
    );
    const pdf = await window.webContents.printToPDF(pdfOptions);
    return new Uint8Array(pdf).buffer;
  } finally {
    printDocuments.delete(path);
    window.destroy();
  }
}

function handleEditorRequest(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    if (
      event.senderFrame !== event.sender.mainFrame ||
      event.senderFrame?.url !== editorUrl
    ) {
      throw new Error("This request must come from the DryMDF editor.");
    }
    return handler(event.sender, ...args);
  });
}

app.whenReady().then(() => {
  registerRoutes();
  session.defaultSession.setPermissionRequestHandler(
    (_contents, _permission, callback) => {
      callback(false);
    },
  );
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onBeforeRequest(
    {
      urls: [
        "http://*/*",
        "https://*/*",
        "ws://*/*",
        "wss://*/*",
        "file://*/*",
      ],
    },
    (details, callback) =>
      callback({ cancel: details.webContentsId !== undefined }),
  );
  const userData = app.getPath("userData");
  const chatGptAuth = createChatGptAuth({
    userData,
    safeStorage,
    openExternal: (url) => shell.openExternal(url),
  });
  const abortAiRequests = registerAiIpc(
    handleEditorRequest,
    createAiProviders({ userData, safeStorage, chatGptAuth }),
  );
  app.on("will-quit", abortAiRequests);
  handleEditorRequest("drymdf:print-pdf", (_sender, html, options = {}) => {
    if (typeof html !== "string" || !options || typeof options !== "object") {
      throw new Error("Invalid PDF request");
    }
    return printPdf(html, options);
  });
  handleEditorRequest("drymdf:open-markdown", (_sender, path) =>
    openMarkdown(path),
  );
  handleEditorRequest("drymdf:choose-markdown", chooseMarkdown);
  handleEditorRequest("drymdf:choose-workspace-files", chooseWorkspaceFiles);
  handleEditorRequest("drymdf:check-workspace-file", checkWorkspaceFile);
  handleEditorRequest("drymdf:locate-workspace-file", locateWorkspaceFile);
  handleEditorRequest("drymdf:save-workspace-file", saveWorkspaceFile);
  handleEditorRequest("drymdf:notification-settings", () =>
    shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.notifications",
    ),
  );
  handleEditorRequest("drymdf:list-recents", listRecents);
  handleEditorRequest("drymdf:reopen-markdown", (_sender, id) =>
    reopenMarkdown(id),
  );
  handleEditorRequest("drymdf:read-image", (_sender, id, source) =>
    readImage(id, source),
  );
  handleEditorRequest(
    "drymdf:choose-export-folder",
    exportsService.chooseFolder,
  );
  handleEditorRequest("drymdf:save-document", exportsService.save);
  handleEditorRequest("drymdf:reveal-export", exportsService.reveal);
  handleEditorRequest("drymdf:release-export", exportsService.release);
  handleEditorRequest("drymdf:notify", (_sender, type) => {
    if ((type !== "test" && type !== "export") || !Notification.isSupported())
      return false;
    lastNotification = new Notification({
      title: "DryMDF",
      body:
        type === "test"
          ? "Test notification from DryMDF."
          : "Your export was saved.",
    });
    lastNotification.show();
    return true;
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
