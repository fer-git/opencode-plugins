# Changesets

User-facing work in a package should include a changeset:

```sh
pnpm changeset
```

That opens a Version PR on `main` (via GitHub Actions). Merging it bumps versions, updates CHANGELOG, and creates git tags (`opencode-xai-extras@x.y.z`) plus GitHub Releases.

Packages stay private until npm publish is enabled. Tags still happen.
