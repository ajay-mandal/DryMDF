const { randomUUID } = require("node:crypto");
const { stat } = require("node:fs/promises");
const { basename, dirname, join, parse } = require("node:path");
const { replaceFile } = require("./atomic-file.cjs");

const formats = { pdf: "PDF", html: "HTML", md: "Markdown" };
const canceled = { status: "canceled" };
const failed = { status: "failed" };
const folderLabel = (path) => basename(path) || parse(path).root;

function createExports({ parentWindow, downloads, dialog, shell, exportHtml }) {
  const states = new WeakMap();

  function attach(sender) {
    const state = { generation: 0, busy: false };
    states.set(sender, state);
    sender.on("did-start-navigation", (details) => {
      if (details.isMainFrame && !details.isSameDocument) {
        state.generation++;
        state.folder = state.result = undefined;
      }
    });
    sender.on("render-process-gone", () => {
      state.generation++;
      state.folder = state.result = undefined;
    });
    sender.once("destroyed", () => states.delete(sender));
  }

  async function run(sender, action) {
    const state = states.get(sender);
    const parent = state && !state.busy && parentWindow(sender);
    if (!parent) return failed;
    const generation = state.generation;
    const current = () =>
      states.get(sender) === state && state.generation === generation;
    state.busy = true;
    try {
      return await action(state, parent, current);
    } catch {
      return current() ? failed : canceled;
    } finally {
      state.busy = false;
    }
  }

  function chooseFolder(sender) {
    return run(sender, async (state, parent, current) => {
      const choice = await dialog.showOpenDialog(parent, {
        title: "Choose Export Folder",
        defaultPath: state.folder ?? downloads(),
        properties: ["openDirectory", "createDirectory"],
      });
      if (!current() || choice.canceled || !choice.filePaths[0])
        return canceled;
      state.folder = choice.filePaths[0];
      return { status: "chosen", folder: folderLabel(state.folder) };
    });
  }

  function save(sender, requestId, filename, format, data) {
    if (
      typeof requestId !== "string" ||
      requestId.length > 64 ||
      typeof format !== "string" ||
      !Object.hasOwn(formats, format) ||
      typeof filename !== "string" ||
      !filename ||
      filename !== basename(filename) ||
      filename === "." ||
      filename === ".." ||
      /[:\\\x00-\x1f]/.test(filename) ||
      (format === "pdf"
        ? !(data instanceof ArrayBuffer)
        : typeof data !== "string")
    )
      return { status: "invalid" };

    return run(sender, async (state, parent, current) => {
      state.result = undefined;
      const name = filename.toLowerCase().endsWith(`.${format}`)
        ? filename
        : `${filename}.${format}`;
      const { canceled: dismissed, filePath } = await dialog.showSaveDialog(
        parent,
        {
          defaultPath: join(state.folder ?? downloads(), name),
          filters: [{ name: formats[format], extensions: [format] }],
        },
      );
      if (!current() || dismissed || !filePath) return canceled;

      // Never rewrite the path approved by the native Save panel.
      state.folder = dirname(filePath);
      const location = {
        name: basename(filePath),
        folder: folderLabel(state.folder),
      };
      try {
        sender.send("drymdf:export-saving", requestId);
        const bytes =
          format === "html"
            ? await exportHtml(data)
            : format === "pdf"
              ? Buffer.from(data)
              : data;
        if (!current()) return canceled;
        await replaceFile(filePath, bytes, {
          beforeRename() {
            if (!current()) throw new Error("Export no longer active.");
          },
        });
      } catch {
        return current() ? { ...failed, ...location } : canceled;
      }
      if (!current()) return canceled;
      const handle = randomUUID();
      state.result = { handle, path: filePath };
      return { status: "saved", ...location, handle };
    });
  }

  async function reveal(sender, handle) {
    const state = states.get(sender);
    const result = state?.result;
    if (!result || result.handle !== handle) return false;
    try {
      if (
        !(await stat(result.path)).isFile() ||
        states.get(sender) !== state ||
        state.result !== result
      )
        return false;
      shell.showItemInFolder(result.path);
      return true;
    } catch {
      return false;
    }
  }

  function release(sender, handle) {
    const state = states.get(sender);
    if (state?.result && state.result.handle === handle)
      state.result = undefined;
  }

  return { attach, chooseFolder, save, reveal, release };
}

module.exports = { createExports };
