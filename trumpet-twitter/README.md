简体中文 | [English](./README.en.md)

# Trumpet

React + Express + SQLite 的小号 Twitter：注册登录、关注流、发帖/回复、点赞、用户主页。

## 快速开始

```bash
pnpm install
pnpm build
pnpm --filter @trumpet/api seed
pnpm dev
```

- Web：http://localhost:5173
- API：http://localhost:4000

```bash
pnpm test && pnpm typecheck && pnpm lint
```

包结构与接口约定见 [docs/architecture.md](./docs/architecture.md)。
