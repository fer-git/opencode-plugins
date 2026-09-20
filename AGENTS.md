# Agent notes

Maintainer rules for this repo. End-user copy lives in each package README.

## Product

- OpenCode **V2** server plugins only. No V1 hook maps (`event`, `tool.execute.before`).
- First package: `opencode-xai-extras`. Plugin `id`: `ferspective07.xai-extras`. Disable with `-ferspective07.xai-extras`.
- Web search **engine** `id` is `xai` (`"websearch": { "provider": "xai" }`). Offer only. Never `editor.default.set`.
- Auth is OpenCode `/connect` xAI SuperGrok (`ctx.integration.connection`). Not Grok Build. Do not read `~/.grok`, spawn `grok`, or log Bearer tokens.
- File STT/TTS only. No microphone, prompt dictation, Speech-to-Speech, or TUI playback.
- New plugins are new directories under `packages/`. Do not dump a second plugin into `xai-extras` unless it is the same server `id`.
- Scaffold with `pnpm new-plugin <kebab-name>` (npm `opencode-<name>`, plugin id `ferspective07.<name>`). Then add a root README table row. Shared code that two plugins need becomes a new workspace package under `packages/` (not a copy of extras). Do not introduce bun, Nx, or Turbo. Independently version via Changesets (already configured).

## Brand

Humans see **xAI** (company), **Grok** / **SuperGrok** / **Grok Imagine** (products), **X (Twitter)** (not Twitter-only, not “xAI search”). Host is **OpenCode**. Prose “web search”; tool/config key `` `websearch` ``.

Machine ids and npm stay lowercase `xai`. Never write XAI, Xai, or xAi in **our** copy.

OpenCode’s TUI title-cases the engine **id** (`xai` → “Xai”) as `Web Search via Xai`. That is the host, not extras. Do not change `id` to “fix” it. The picker `name` is already `"xAI"`.

## Host SDK

User plugins on OpenCode **2.0.9** must **not** `import "@opencode/plugin"` or `@opencode/plugin/effect` (Bun cannot resolve the host SDK). Export `{ id, setup }` until https://github.com/anomalyco/opencode/pull/49097 is in a release we run.

Keep the package-root `index.ts` re-export (`packages/xai-extras/index.ts`). 2.0.9 loads that file; `package.json` `exports` alone is not enough. Do not mention this loader quirk in user READMEs.

## Layout (`packages/xai-extras`)

```
src/index.ts          L1 OpenCode adapter (register, bearer, timeouts, host DTOs)
src/lib/              platform — keep flat
src/features/*.ts     one xAI product each — keep flat
test/                 unit tests, not next to src/
```

Features: `websearch`, `xsearch`, `imagine`, `video`, `stt`, `tts`. Each exposes a JSON schema, a pure `build*` (no `fs`/`fetch`), and an I/O `run*`.

Shared constants: `src/lib/constants.ts` (`UPPER_SNAKE` or a const object). Feature-local enums and limits stay in that feature file. `CONNECT_MESSAGE` lives in constants (auth and errors both import it).

### Import law

- Features must not import `types.ts`, `auth.ts`, `options.ts`, `tool-content.ts`, or `websearch-host.ts`.
- `index.ts` must not call `xaiResponses` or write files.
- Auth must not import `errors.ts`.
- Artifacts return `{ path, mime, name }` only. OpenCode `{ type: "file" }` parts are `tool-content.ts`. OpenCode websearch `{ time }` rows are `websearch-host.ts`.

## Stack

pnpm (`packageManager` in root `package.json`). `pnpm check` = `tsc --noEmit`, oxlint `--deny-warnings`, oxfmt, Vitest. No bun as package manager. No `Bun.spawn` in server plugins. Node `>=22.12.0`.

TypeScript 7, `target`/`lib` **ES2025** (not `ESNext`). `strict` plus `exactOptionalPropertyTypes`, unused locals/params, `isolatedModules`, `erasableSyntaxOnly`. Do not enable `noPropertyAccessFromIndexSignature` (JSON `Record` access).

Oxlint: `correctness` and `suspicious` as errors. Do not enable `pedantic` (false positives on sequential video poll and JSON Records).

Paths: Windows, macOS, and Linux. `node:path` `join`, `pathToFileURL` for attachments, `fileURLToPath` for `file://` inputs. Do not concatenate `file://` onto a native path.

## Tests and docs

Tests are unit-only (builders, errors, host mappers). Prefer `it.each` for tables. Assert public contracts as **literals** (plugin id), not identity with the same constant. Do not mock xAI HTTP in CI. Live SuperGrok is a local smoke.

Package READMEs are for OpenCode V2 **end users**. No local home paths, no loader-bug notes, no changelog-in-README.

## Changesets and release notes

A push to `main` is **not** a release. The intent signal is a changeset file in the **same** commit as the work.

- **User-facing** (tools, errors, README, options, install): add `.changeset/<slug>.md`. Agents write that file; do not run interactive `pnpm changeset`.
- **Internal-only** (AGENTS.md, CI, tests, comments): no changeset → no version, no changelog line, no npm publish.

The markdown **after** the frontmatter **is** the release note. Changesets concatenates those into `packages/<name>/CHANGELOG.md` and the GitHub Release body. Do not hand-edit `CHANGELOG.md`, version numbers, or git tags.

```md
---
"opencode-xai-extras": patch
---

Short web search queries return no results instead of HTTP 503.
```

Use `patch` / `minor` / `major` as appropriate. Name the package(s) that actually changed.

Ship loop from this TUI: edit → `pnpm check` → changeset file if user-facing → commit → `git push origin main`. GitHub then: CI → Version packages PR → automerge after CI green → tag + GitHub Release + npm (OIDC). Do not `npm publish` from a laptop. Do not open the website to merge or publish.
