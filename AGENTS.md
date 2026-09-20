# Agent notes

- OpenCode **V2** plugins only. No V1 hook maps (`event`, `tool.execute.before`).
- User plugins on OpenCode **2.0.9** must **not** `import "@opencode/plugin"` or `@opencode/plugin/effect` (Bun cannot resolve the host SDK). Export `{ id, setup }` until https://github.com/anomalyco/opencode/pull/49097 ships in a release we run.
- npm `name` is `opencode-xai-extras`. Plugin `id` is `ferspective07.xai-extras`. Web search **engine** id stays `xai`. Never `editor.default.set`.
- Brand in user-facing copy: **xAI** (company), **Grok** / **SuperGrok** / **Grok Imagine** (products), **X (Twitter)** (not “Twitter-only”, not “xAI search”). Machine ids and npm stay lowercase `xai`. Prose “web search”; tool/config key `` `websearch` ``. Never XAI, Xai, or xAi.
- Auth: `ctx.integration.connection` for xAI SuperGrok. Do not read `~/.grok`, spawn `grok`, or log Bearer tokens.
- New plugins are new directories under `packages/`. Do not dump a second plugin into `xai-extras` unless it is the same server `id`.
- Stack: pnpm, `tsc --noEmit`, oxlint, oxfmt, vitest. No bun as package manager. No `Bun.spawn` in server plugins.
- Paths must work on Windows, macOS, and Linux: `node:path` `join`, `pathToFileURL` for attachments, `fileURLToPath` for `file://` inputs. Do not concatenate `file://` onto a native path.
- Shared constants live in `src/lib/constants.ts` (`UPPER_SNAKE` or a const object). Feature-local enums and limits stay in that feature file. Tiny helpers go in `src/lib/util.ts`. Keep `src/lib/` flat.
- Tests live in each package’s `test/` directory (not next to `src/`). Unit-only (builders/errors). Prefer `it.each` for tables. Do not mock xAI HTTP in CI. Live SuperGrok is a local smoke.
- Package READMEs are for OpenCode V2 **end users**. No local home paths, no loader-bug notes, no changelog-in-README. Put maintainer notes here.
- User-facing package changes need `pnpm changeset` (patch/minor/major). Do not hand-edit version numbers or invent tags. Release PRs come from `.github/workflows/release.yml`.
