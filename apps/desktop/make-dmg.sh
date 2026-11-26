#!/bin/sh
set -eu

version="$(node -p 'require("./package.json").version')"
installer="DryMDF-${version}-arm64.dmg"
if [ "${1:-}" = "--name" ]; then
  printf '%s\n' "$installer"
  exit 0
fi

staging="$(mktemp -d)"
trap 'rm -rf "$staging"' EXIT

ditto out/DryMDF-darwin-arm64/DryMDF.app "$staging/DryMDF.app"
codesign --verify --deep --strict "$staging/DryMDF.app"
ELECTRON_RUN_AS_NODE=1 "$staging/DryMDF.app/Contents/MacOS/DryMDF" \
  -e 'if (!process.versions.electron || process.arch !== "arm64") process.exit(1)'
ln -s /Applications "$staging/Applications"
mkdir -p out/make
build_output="$(mktemp -d out/make/.drymdf-build.XXXXXX)"
trap 'rm -rf "$staging" "$build_output"' EXIT
hdiutil create -volname DryMDF -srcfolder "$staging" -format UDZO \
  "$build_output/$installer"
(cd "$build_output" && shasum -a 256 $installer > $installer.sha256)
mv -f "$build_output/$installer" out/make/
mv -f "$build_output/$installer.sha256" out/make/
