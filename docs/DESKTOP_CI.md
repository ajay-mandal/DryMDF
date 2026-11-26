# Desktop builds and releases

[Desktop CI runs](https://github.com/ajay-mandal/DryMDF/actions/workflows/ci.yml) show the lint, build, and installer verification logs. GitHub hosts the Apple Silicon runner, so your Mac can be offline.

Pull requests and pushes to development or main build the DMG. Open the run summary and download **DryMDF-mac-arm64** under **Artifacts** within seven days. Extract the archive and run `shasum -a 256 -c DryMDF-<version>-arm64.dmg.sha256` (replace `<version>` with the package version) in the extracted folder.

For a new release, update the version in `apps/desktop/package.json`, then tag the merged commit with the matching `v<version>` tag. For example, `v0.1.1` produces `DryMDF-0.1.1-arm64.dmg` and `DryMDF-0.1.1-arm64.dmg.sha256`. The pipeline rejects a tag that does not match the desktop package version. It builds once and attaches the verified files to a draft [GitHub Release](https://github.com/ajay-mandal/DryMDF/releases). Follow the [clean-Mac acceptance checks](DESKTOP_MIGRATION_PLAN.md) using the draft assets, then publish the draft. The release job uses GitHub’s automatic workflow token.
