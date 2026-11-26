# DryMDF desktop CI

Woodpecker runs on your hardware. This configuration uses a local SQLite volume and an Apple Silicon build agent. It needs no hosted CI minutes or paid storage service. The Mac and its internet connection must be available during builds.

## Connect GitHub

1. Route a stable HTTPS address through your existing reverse proxy or tunnel to port 8120 on the server host. GitHub delivers webhooks to that address. Keep the agent connection on loopback.
2. Register a [GitHub OAuth app](https://github.com/settings/applications/new) under the personal account. Use the public address for its homepage and append `/authorize` for its callback.
3. In a private environment file outside the checkout, set `WOODPECKER_HOST`, `WOODPECKER_GITHUB_CLIENT`, and `WOODPECKER_GITHUB_SECRET`. Restrict the file to its owner. Start the dashboard from the repo root:

   ```sh
   docker compose --env-file ~/.config/drymdf-ci/server.env -f ci/woodpecker/compose.yaml up -d
   ```

4. Sign in as `ajay-mandal` and activate `ajay-mandal/DryMDF`. Enable push, pull request and tag hooks. Require approval for forked PRs. Review the entire proposed change before approving a run because the native agent executes contributor code directly. Leave repository trust disabled. Use a dedicated build account or isolated macOS VM with no personal credentials.
5. Under **User settings → Agents**, register a personal agent. Restrict it to this repository using the repo filter. On the build account, install the matching [Woodpecker agent for Darwin ARM64](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.21.0), Git, Node 22.12 or later within 22.x, pnpm 8.15.4, and the GitHub CLI. Provide the agent token privately as `WOODPECKER_AGENT_SECRET`. Start the agent on the same Mac as the server:

   ```sh
   mkdir -p ~/.config/drymdf-ci
   WOODPECKER_AGENT_CONFIG_FILE="$HOME/.config/drymdf-ci/agent.conf" \
     WOODPECKER_SERVER=127.0.0.1:9120 WOODPECKER_BACKEND=local woodpecker-agent
   ```

   Keep the agent running under the build account. Check **Agents** for its online status.

6. Add a repository secret named `drymdf_release_token` in Woodpecker. Use a fine-grained GitHub token limited to this repository with Contents read/write and restrict the Woodpecker secret to **tag** events. Limit creation of release tags to maintainers.

## Track a build or release

Open DryMDF in the dashboard to see the commit and each step's logs. PRs targeting development or main and pushes to those branches check code quality, build the Apple Silicon installer and verify its checksum and disk image. After activation, redeliver a GitHub webhook or push a commit to see the first run.

A maintainer pushing a new version tag such as `v0.1.0` runs the same checks, then uploads the verified DMG and SHA-256 file to a draft GitHub Release. Download that draft, perform the clean-Mac acceptance checks in the [migration plan](../../docs/DESKTOP_MIGRATION_PLAN.md), then publish that draft in GitHub. An existing release with the same tag makes the upload step fail. Inspect its assets before retrying.
