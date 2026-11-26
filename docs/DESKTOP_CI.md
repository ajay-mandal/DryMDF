# Desktop builds and releases

[Desktop CI runs](https://github.com/ajay-mandal/DryMDF/actions/workflows/ci.yml) show the lint, build, and installer verification logs. GitHub hosts the Apple Silicon runner, so your Mac can be offline.

Pull requests and pushes to development or main build the DMG. Open the run summary and download **DryMDF-mac-arm64** under **Artifacts** within seven days. Extract the archive and run `shasum -a 256 -c DryMDF-mac-arm64.dmg.sha256` in the extracted folder.

Pushing a new release tag such as `v0.1.0` builds once and attaches that verified installer and checksum to a draft [GitHub Release](https://github.com/ajay-mandal/DryMDF/releases). Follow the [clean-Mac acceptance checks](DESKTOP_MIGRATION_PLAN.md) using the draft assets, then publish the draft. The release job uses GitHub’s automatic workflow token.
