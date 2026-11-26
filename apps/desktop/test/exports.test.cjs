const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { mkdir, readFile, readdir, rm, writeFile } = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const { join, resolve } = require("node:path");
const { test } = require("node:test");
const { createExports } = require("../exports.cjs");

async function fixture(t) {
  const root = resolve(__dirname, `.export-${randomUUID()}`);
  await mkdir(root);
  t.after(() => rm(root, { recursive: true, force: true }));
  const savePanels = [],
    openPanels = [],
    reveals = [],
    stages = [];
  const dialog = {
    showSaveDialog: t.mock.fn(async (_window, options) => {
      const next = savePanels.shift();
      assert.ok(next);
      return next(options);
    }),
    showOpenDialog: async () => openPanels.shift(),
  };
  const service = createExports({
    parentWindow: () => ({}),
    downloads: () => root,
    dialog,
    shell: { showItemInFolder: (path) => reveals.push(path) },
    exportHtml: async (body) => `<!doctype html>${body}`,
  });
  const sender = () => {
    const contents = new EventEmitter();
    contents.send = (...args) => stages.push(args);
    service.attach(contents);
    return contents;
  };
  return {
    root,
    savePanels,
    openPanels,
    reveals,
    stages,
    service,
    sender,
    dialog,
  };
}

for (const [format, data, expected] of [
  ["pdf", new Uint8Array([37, 80, 68, 70]).buffer, "%PDF"],
  ["html", "<p>Hello</p>", "<!doctype html><p>Hello</p>"],
  ["md", "# Ridge walk\n\nCafé\n", "# Ridge walk\n\nCafé\n"],
]) {
  test(`writes ${format} to the exact approved path and only reveals by sender's handle`, async (t) => {
    const { service, sender, root, savePanels, reveals, stages, dialog } =
      await fixture(t);
    const owner = sender();
    const path = join(root, "name from dialog");
    await writeFile(path, "previous file");
    savePanels.push(() => ({ filePath: path }));
    const result = await service.save(
      owner,
      "request",
      `report.${format}`,
      format,
      data,
    );
    assert.equal(
      dialog.showSaveDialog.mock.calls[0].arguments[1].defaultPath,
      join(root, `report.${format}`),
    );
    assert.equal(result.status, "saved");
    assert.equal(result.name, "name from dialog");
    assert.equal(result.folder, root.split("/").at(-1));
    assert.equal(await readFile(path, "utf8"), expected);
    assert.deepEqual(await readdir(root), ["name from dialog"]);
    assert.deepEqual(stages, [["drymdf:export-saving", "request"]]);
    assert.equal(await service.reveal(sender(), result.handle), false);
    assert.equal(await service.reveal(owner, path), false);
    assert.equal(await service.reveal(owner, result.handle), true);
    assert.deepEqual(reveals, [path]);
    service.release(owner, result.handle);
    assert.equal(await service.reveal(owner, result.handle), false);
  });
}

test("cancellation leaves existing output alone; write failure can recover in another folder", async (t) => {
  const { root, service, sender, savePanels, openPanels, stages, dialog } =
    await fixture(t);
  const owner = sender();
  const existing = join(root, "existing.md");
  const blocked = join(root, "directory.md");
  await writeFile(existing, "old");
  await mkdir(blocked);
  savePanels.push(
    () => ({ canceled: true, filePath: existing }),
    () => ({ filePath: blocked }),
  );
  const save = (name) =>
    service.save(owner, "request", name, "md", "original draft");
  assert.deepEqual(await save("existing"), { status: "canceled" });
  assert.equal(await readFile(existing, "utf8"), "old");
  assert.deepEqual(stages, []);
  const failure = await save("directory");
  assert.equal(failure.status, "failed");
  assert.equal(failure.name, "directory.md");
  assert.deepEqual(await readdir(root), ["directory.md", "existing.md"]);
  const recovery = join(root, "recovery");
  await mkdir(recovery);
  openPanels.push({ filePaths: [recovery] });
  assert.deepEqual(await service.chooseFolder(owner), {
    status: "chosen",
    folder: "recovery",
  });
  const saved = join(recovery, failure.name);
  savePanels.push(() => ({ filePath: saved }));
  assert.equal((await save(failure.name)).status, "saved");
  assert.equal(
    dialog.showSaveDialog.mock.calls.at(-1).arguments[1].defaultPath,
    saved,
  );
  assert.equal(await readFile(saved, "utf8"), "original draft");
});

test("navigation invalidates handles and prevents saving from an abandoned dialog", async (t) => {
  const { root, service, sender, savePanels } = await fixture(t);
  const owner = sender();
  const path = join(root, "report.md");
  savePanels.push(() => ({ filePath: path }));
  const save = (name, data) => service.save(owner, "request", name, "md", data);
  const saved = await save("report", "initial");
  const navigate = () =>
    owner.emit("did-start-navigation", {
      isMainFrame: true,
      isSameDocument: false,
    });
  navigate();
  assert.equal(await service.reveal(owner, saved.handle), false);
  assert.deepEqual(await save("../report", "bad"), { status: "invalid" });
  const pending = Promise.withResolvers();
  savePanels.push(() => pending.promise);
  const staleSave = save("report", "stale");
  navigate();
  assert.equal((await save("report", "concurrent")).status, "failed");
  pending.resolve({ filePath: path });
  assert.equal((await staleSave).status, "canceled");
  assert.equal(await readFile(path, "utf8"), "initial");
});
