#!/bin/sh
set -eu

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
  "$build_output/DryMDF-mac-arm64.dmg"
(cd "$build_output" && shasum -a 256 DryMDF-mac-arm64.dmg > DryMDF-mac-arm64.dmg.sha256)
mv -f "$build_output/DryMDF-mac-arm64.dmg" out/make/
mv -f "$build_output/DryMDF-mac-arm64.dmg.sha256" out/make/
