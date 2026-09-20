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

On GitHub, pushing user-facing changes to `main` opens a **Version packages** PR. CI must pass; that PR is then merged automatically. That bump updates CHANGELOG, creates git tags plus GitHub Releases (`opencode-xai-extras@x.y.z`), and publishes to npm via trusted publishing.
