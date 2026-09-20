# opencode-plugins

OpenCode **V2** plugins.

| Package                                      | Plugin id                  | What it adds                                                                     |
| -------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| [opencode-xai-extras](./packages/xai-extras) | `ferspective07.xai-extras` | xAI SuperGrok web search, X search, Grok Imagine, speech-to-text, text-to-speech |

Each package has its own README (install, `/connect`, tools, options).

## Development

```sh
pnpm install
pnpm check
```

Requires [pnpm](https://pnpm.io). `pnpm check` runs typecheck, oxlint, oxfmt, and Vitest.

After a user-facing change, record it:

```sh
pnpm changeset
```

On GitHub, merging to `main` opens a **Version packages** PR. Merging that PR bumps versions, updates each package CHANGELOG, and creates git tags plus GitHub Releases (`opencode-xai-extras@x.y.z`). Nothing is published to npm while packages are `"private": true`.
