const { createHash, randomUUID } = require("node:crypto");
const { app, BrowserWindow, dialog } = require("electron");
const {
  readFile,
  realpath,
  chmod,
  rename,
  rm,
  stat,
  writeFile,
} = require("node:fs/promises");
const {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} = require("node:path");

const imageTypes = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const exportTypes = { ".md": "Markdown", ".html": "HTML", ".pdf": "PDF" };

function documentStatePath() {
  return join(app.getPath("userData"), "document-folder.json");
}

async function replaceFile(path, data, { mode, beforeRename } = {}) {
  const temporary = join(dirname(path), `.drymdf-${randomUUID()}`);
  try {
    await writeFile(temporary, data, { flag: "wx", mode });
    if (mode !== undefined) await chmod(temporary, mode);
    await beforeRename?.();
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function rememberedDocuments() {
  try {
    const state = JSON.parse(await readFile(documentStatePath(), "utf8"));
    // The single-file build remembered only the last document's image root.
    return state.documents ?? [state];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function listRecents() {
  return (await rememberedDocuments())
    .filter((doc) => doc.path)
    .slice(0, 30)
    .map(({ id, path }) => ({
      id,
      name: basename(path),
      folder: basename(dirname(path)),
    }));
}

let pendingMutation = Promise.resolve();

function mutateDocuments(operation) {
  const next = pendingMutation.then(operation);
  pendingMutation = next.catch(() => {});
  return next;
}

function writeDocuments(documents) {
  return replaceFile(documentStatePath(), JSON.stringify({ documents }));
}

function revision(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readMarkdown(path) {
  const bytes = await readFile(path);
  return { content: bytes.toString("utf8"), revision: revision(bytes) };
}

function describeDocument(entry, snapshot) {
  return {
    id: entry.id,
    name: basename(entry.path),
    folder: basename(entry.root),
    ...snapshot,
  };
}

async function selectedMarkdown(sender, title, multiple = false) {
  const { canceled, filePaths } = await dialog.showOpenDialog(
    BrowserWindow.fromWebContents(sender),
    {
      title,
      properties: multiple ? ["openFile", "multiSelections"] : ["openFile"],
      filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
    },
  );
  return canceled ? [] : filePaths;
}

function openMarkdown(path) {
  return registerMarkdown([path]).then(([document]) => document);
}

async function chooseMarkdown(sender) {
  const [path] = await selectedMarkdown(sender, "Open a Markdown file");
  return path ? openMarkdown(path) : null;
}

async function chooseWorkspaceFiles(sender, multiple, legacy) {
  const paths = await selectedMarkdown(
    sender,
    multiple ? "Add Markdown files" : "Open a Markdown file",
    multiple === true,
  );
  return paths.length ? registerMarkdown(paths, legacy) : [];
}

async function reopenMarkdown(id) {
  const entry = (await rememberedDocuments()).find((doc) => doc.id === id);
  if (!entry?.path) throw new Error("Choose the file again with Open.");
  return openMarkdown(entry.path);
}

async function markdownPath(path) {
  if (
    typeof path !== "string" ||
    !isAbsolute(path) ||
    !/\.(md|markdown)$/i.test(path)
  ) {
    throw new Error("Choose a .md or .markdown file.");
  }
  // Canonical paths keep a file's ID stable across repeated selection.
  const canonical = await realpath(path);
  if (!/\.(md|markdown)$/i.test(canonical)) {
    throw new Error("Choose a .md or .markdown file.");
  }
  return canonical;
}

function registerMarkdown(paths, legacy) {
  return mutateDocuments(async () => {
    const canonical = [...new Set(await Promise.all(paths.map(markdownPath)))];
    const [documents, snapshots] = await Promise.all([
      rememberedDocuments(),
      Promise.all(canonical.map(readMarkdown)),
    ]);
    const legacyEntry = documents.find(
      (doc) => doc.id === legacy?.id && !doc.path,
    );
    const legacyMatches = legacyEntry
      ? canonical.filter(
          (path) =>
            dirname(path) === legacyEntry.root &&
            basename(path, extname(path)) === legacy.filename,
        )
      : [];
    const opened = canonical.map((path) => ({
      id:
        documents.find((doc) => doc.path === path)?.id ??
        (legacyMatches.length === 1 && legacyMatches[0] === path
          ? legacyEntry.id
          : randomUUID()),
      root: dirname(path),
      path,
    }));
    const openedIds = new Set(opened.map(({ id }) => id));
    await writeDocuments([
      ...opened,
      ...documents.filter((doc) => !openedIds.has(doc.id)),
    ]);
    return opened.map((entry, index) =>
      describeDocument(entry, snapshots[index]),
    );
  });
}

async function checkWorkspaceFile(_sender, id) {
  const entry = (await rememberedDocuments()).find((doc) => doc.id === id);
  if (!entry?.path) return { status: "missing" };
  try {
    if ((await realpath(entry.path)) !== entry.path)
      return { status: "missing" };
    return {
      status: "available",
      document: describeDocument(entry, await readMarkdown(entry.path)),
    };
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      return { status: "missing" };
    }
    throw error;
  }
}

async function locateWorkspaceFile(sender, id) {
  const [selected] = await selectedMarkdown(sender, "Locate Markdown file");
  if (!selected) return null;
  return mutateDocuments(async () => {
    const path = await markdownPath(selected);
    const documents = await rememberedDocuments();
    if (!documents.some((doc) => doc.id === id)) {
      throw new Error("This document is no longer registered.");
    }
    if (documents.some((doc) => doc.path === path && doc.id !== id)) {
      throw new Error(
        "That file is already registered. Choose the document’s new location.",
      );
    }
    const snapshot = await readMarkdown(path);
    const entry = { id, path, root: dirname(path) };
    await writeDocuments([entry, ...documents.filter((doc) => doc.id !== id)]);
    return describeDocument(entry, snapshot);
  });
}

function saveWorkspaceFile(sender, id, expectedRevision, content) {
  if (typeof expectedRevision !== "string" || typeof content !== "string") {
    throw new Error("Invalid save request.");
  }

  return mutateDocuments(async () => {
    const documents = await rememberedDocuments();
    const entry = documents.find((doc) => doc.id === id);
    const disk = await checkWorkspaceFile(sender, id);
    if (
      disk.status === "missing" ||
      disk.document.revision !== expectedRevision
    ) {
      return disk;
    }
    const bytes = Buffer.from(content, "utf8");
    // Keep existing permissions and check again immediately before replacing.
    const stale = Symbol("stale document");
    let changed;
    try {
      const mode = (await stat(entry.path)).mode & 0o777;
      await replaceFile(entry.path, bytes, {
        mode,
        beforeRename: async () => {
          changed = await checkWorkspaceFile(sender, id);
          if (
            changed.status === "missing" ||
            changed.document.revision !== expectedRevision
          ) {
            throw stale;
          }
        },
      });
    } catch (error) {
      if (error === stale) return changed;
      if (error.code === "ENOENT" || error.code === "ENOTDIR") {
        return { status: "missing" };
      }
      throw error;
    }
    return { status: "saved", revision: revision(bytes) };
  });
}

async function readImage(id, source) {
  if (typeof id !== "string" || typeof source !== "string") return null;
  try {
    const state = (await rememberedDocuments()).find((doc) => doc.id === id);
    if (!state) return null;
    const path = decodeURIComponent(source.split(/[?#]/, 1)[0]);
    if (!path || isAbsolute(path) || /^[a-z][a-z0-9+.-]*:/i.test(path))
      return null;
    const image = await realpath(resolve(state.root, path));
    const withinRoot = relative(state.root, image);
    if (
      !withinRoot ||
      withinRoot === ".." ||
      withinRoot.startsWith(".." + sep) ||
      isAbsolute(withinRoot)
    ) {
      return null;
    }
    const mime = imageTypes[extname(image).toLowerCase()];
    if (!mime) return null;
    const entry = await stat(image);
    if (!entry.isFile() || entry.size > 20 * 1024 * 1024) return null;
    return `data:${mime};base64,${(await readFile(image)).toString("base64")}`;
  } catch {
    return null;
  }
}

async function saveDocument(sender, filename, extension, data) {
  if (
    !Object.hasOwn(exportTypes, extension) ||
    typeof filename !== "string" ||
    !filename ||
    filename !== basename(filename) ||
    filename.includes("\0")
  ) {
    throw new Error("Enter a valid export filename.");
  }
  const name = filename.toLowerCase().endsWith(extension)
    ? filename
    : filename + extension;
  const { canceled, filePath } = await dialog.showSaveDialog(
    BrowserWindow.fromWebContents(sender),
    {
      defaultPath: name,
      filters: [
        { name: exportTypes[extension], extensions: [extension.slice(1)] },
      ],
    },
  );
  if (canceled || !filePath) return false;
  await replaceFile(
    filePath,
    typeof data === "string" ? data : Buffer.from(data),
  );
  return true;
}

module.exports = {
  chooseMarkdown,
  chooseWorkspaceFiles,
  checkWorkspaceFile,
  locateWorkspaceFile,
  saveWorkspaceFile,
  openMarkdown,
  listRecents,
  reopenMarkdown,
  readImage,
  saveDocument,
};
