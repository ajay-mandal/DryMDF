# Repository Guidelines

## Project Structure

- `apps/frontend/src` contains the Next.js App Router, Markdown editor, previews, and export UI. Static assets live in `apps/frontend/public`.
- `apps/backend/src/modules` contains the NestJS API, PDF generation, Bull queues, and WebSocket progress updates. API end-to-end tests live in `apps/backend/test`.
- `packages/shared/src` holds shared TypeScript types and constants. See `docs/` for project and API documentation and `docker/` for container configuration.

## Build and Development

Use Node.js 20.9 or newer and pnpm 8.15.4. Run commands from the repository root.

- `pnpm install` installs workspace dependencies.
- Copy `apps/backend/.env.example` to `apps/backend/.env` for local setup. `docker compose up -d redis` starts Redis on port 6380. Keep credentials out of Git.
- `pnpm dev` starts the frontend on port 3000 and API on port 4000. `pnpm build` builds the workspace.
- `pnpm format:check` checks Prettier formatting. `pnpm type-check` runs configured TypeScript checks. `pnpm lint` runs ESLint and can rewrite backend files. Use `pnpm --filter @drymdf/backend lint:check` for a read-only backend check.

## Coding Style

Use strict TypeScript and follow Prettier's two-space indentation, double quotes, semicolons, and trailing commas. Match existing kebab-case filenames such as `markdown-preview.tsx` and NestJS suffixes such as `convert.service.ts`. Search for existing logic before adding helpers or constants.

## Testing

`pnpm test` runs Jest unit tests matching `*.spec.ts` under `apps/backend/src`. Run API tests with `pnpm --filter @drymdf/backend test:e2e` and measure unit coverage with `pnpm --filter @drymdf/backend test:cov`. Jest has no configured coverage threshold.

## Commits and Pull Requests

Use Conventional Commits, for example `fix: correct PDF export margins`. Before coding, state the ticket problem and exact failing cases. Keep the diff scoped to the ticket. Test common variants and verify adjacent behavior on the merge result with the current base branch.

Before pushing, individually mutate every alternative in changed regexes, word sets, and enums, including existing guards left by removed checks. Run focused tests. Link the ticket and report verification in the PR. Update documentation and the changelog when applicable. Keep PRs independent of unmerged work and obtain fresh approval before pushing again after approval.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:

- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. When the answer is under a Markdown heading, `graphify section "<heading>"` prints that section's text, so the .md need not be opened. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

# graphify

- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
  When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.
