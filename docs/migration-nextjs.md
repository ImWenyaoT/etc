# 迁移到 Next.js 全栈

## 变更摘要

- 顶层只保留五个项目目录 + `docs/`（及 README / LICENSE / CI）。
- 移除根目录 `go.work`、`Makefile`、`scripts/` 与各项目 Go 模块、Vite `web/` 双进程结构。
- 每个项目改为独立 Next.js App Router 应用：同一进程提供页面与 `/api/*`。
- 原 Go CLI 改为 `npm run cli`（`tsx`）；Trumpet seed 改为 `npm run seed`。
- 运行时依赖从「Go 1.25+ + Node」改为仅需 Node.js 22+。

## 端口

前端与 API 合并后仍使用原前端端口：`18101`–`18105`。

## 行为保留

HTTP 路径、成功/错误 JSON、校验文案、贪吃蛇成绩文件规则、Trumpet SQLite schema 与 bcrypt 会话语义尽量保持不变，便于对照旧实现与已有前端测试。
