# Architecture

- `apps/web`：React + Vite UI
- `apps/api`：Express REST + better-sqlite3
- `packages/shared`：Zod 契约与共享类型

核心能力：cookie 会话、Following 时间线（游标分页）、帖子/回复、点赞、关注、公开主页。

工具链：pnpm workspace、TypeScript strict、oxlint、oxfmt、Vitest。
