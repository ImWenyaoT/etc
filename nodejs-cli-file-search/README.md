简体中文 | [English](./README.en.md)

# Node.js CLI File Search

按文件名递归搜索目录的 TypeScript CLI（零运行时依赖）。

## 快速开始

```bash
pnpm install
pnpm dev -- search <keyword> --root .
pnpm test && pnpm typecheck && pnpm build
```

```bash
file-search search <keyword> [--root <dir>] [--max <n>]
```

默认跳过 `.git` / `node_modules` / `dist` / `coverage`；`--max` 须为正整数。

更多行为约定见 [docs/architecture.md](./docs/architecture.md)。
