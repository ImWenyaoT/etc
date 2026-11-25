# Next.js 全栈目录约定

仓库顶层只保留五个独立项目目录与 `docs/`（以及 README、LICENSE、CI 等仓库元数据）。五个项目通过根目录 `pnpm-workspace.yaml` 组成 workspace；Lint/Format 使用根目录 Oxc 配置（`.oxlintrc.json`、`.oxfmtrc.json`）。每个项目是可单独启动、测试的 Next.js App Router 应用；不再使用 Go、Vite 双进程或根目录 `go.work`。

## 每个项目

| 路径 | 作用 |
| --- | --- |
| `src/app/` | 页面与 Route Handlers（`api/**/route.ts`） |
| `src/components/` | UI（含 shadcn/ui） |
| `src/lib/` | 业务逻辑与客户端请求封装 |
| `src/cli.ts` | 可选 CLI（工具类项目） |
| `package.json` | 独立依赖与脚本；`dev` 绑定固定端口 `18101`–`18105` |

## 端口

| 项目 | 端口 |
| --- | --- |
| nodejs-cli-file-search | 18101 |
| json-yaml-xml-parser | 18102 |
| random-red-black-tree-sort | 18103 |
| web-front-end-snake-game | 18104 |
| trumpet-twitter | 18105 |

## 技术栈

- Next.js（App Router）+ React + TypeScript
- Tailwind CSS v4 + shadcn/ui（Base UI）
- 测试：Vitest
- 持久化：文件搜索/解析/红黑树无存储；贪吃蛇 JSON 文件；Trumpet SQLite（`node:sqlite`）+ bcryptjs

## 根目录不再放置

`go.work`、根 `Makefile`、`scripts/`、各项目 `cmd/` / `internal/` / `go.mod` / 独立 `web/` Vite 应用。
