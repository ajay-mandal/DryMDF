const { createRequire } = require("node:module");
const { dirname, join } = require("node:path");

const frontend = join(__dirname, "../frontend");
const requireFromFrontend = createRequire(join(frontend, "package.json"));
const katex = dirname(requireFromFrontend.resolve("katex/package.json"));

module.exports = {
  packagerConfig: {
    asar: true,
    icon: join(__dirname, "DryMDF.icns"),
    appBundleId: "com.drymdf.desktop",
    osxSign: {
      identity: "-",
      identityValidation: false,
      preAutoEntitlements: false,
      // The offline DMG uses an ad-hoc signature with no signing team.
      optionsForFile: () => ({ hardenedRuntime: false }),
    },
    prune: false,
    ignore: (path) =>
      ![
        "",
        "/package.json",
        "/main.cjs",
        "/preload.cjs",
        "/documents.cjs",
        "/exports.cjs",
        "/atomic-file.cjs",
      ].includes(path),
    extraResource: [
      join(frontend, "out"),
      join(__dirname, "build/print-layout.js"),
      join(katex, "dist/fonts"),
      join(katex, "dist/katex.min.css"),
      requireFromFrontend.resolve("highlight.js/styles/github.css"),
    ],
  },
};
