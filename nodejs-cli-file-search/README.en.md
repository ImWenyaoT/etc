[简体中文](./README.md) | English

# Node.js CLI File Search

TypeScript CLI that recursively searches directories by filename (zero runtime deps).

## Quick start

```bash
pnpm install
pnpm dev -- search <keyword> --root .
pnpm test && pnpm typecheck && pnpm build
```

```bash
file-search search <keyword> [--root <dir>] [--max <n>]
```

Skips `.git` / `node_modules` / `dist` / `coverage` by default. `--max` must be a positive integer.

See [docs/architecture.md](./docs/architecture.md).
