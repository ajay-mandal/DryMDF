const { randomUUID } = require("node:crypto");
const { chmod, rename, rm, writeFile } = require("node:fs/promises");
const { dirname, join } = require("node:path");

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

module.exports = { replaceFile };
