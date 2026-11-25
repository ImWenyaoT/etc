# Trumpet Twitter

独立的 Next.js 全栈应用（App Router）：React 前端与 `/api/*` 路由同进程。目录名保持不变。

## 环境与启动

需要 Node.js 22+ and pnpm 10+（使用内置 `node:sqlite`）。

```sh
pnpm install
pnpm seed   # 可选：空库写入演示账号
pnpm dev
```

访问 `http://localhost:18105`。

生产构建：

```sh
pnpm build
npm start
```

## 功能与接口

React 保留原有界面和状态机。Next.js Route Handlers + SQLite 实现注册、登录、退出、30 天 Cookie 会话、发帖、回复、关注/取关、点赞/取消点赞、关注时间线、用户主页和游标分页。

数据库文件由 `DB_FILE` 指定（默认 `data/trumpet.db`）。数据库表和 bcrypt 密码哈希与旧 Go 实现兼容（`bcryptjs` cost 12）。密码受 bcrypt 限制，最大 72 字节；账号为 3–20 位小写字母、数字或下划线，帖子最多 280 字。

前端通过同源 `/api` 调用后端（`credentials: "include"`）。跨源变更请求按 Origin 校验；反向代理部署需设置 `WEB_ORIGIN=https://实际域名`，HTTPS 设置 `COOKIE_SECURE=true`。`.env.example` 是配置参考。

首次使用在网页注册账号。也可在空数据库执行 `pnpm seed`，创建 mina / leo / ava（密码 password123）及演示帖子；数据库非空时拒绝操作，不覆盖数据。

## 检查

```sh
pnpm install
pnpm test
pnpm build
```

## 目录

- `src/app/`：页面与 `/api` Route Handlers
- `src/lib/`：SQLite、认证、帖子、用户、seed、HTTP 辅助
- `src/components/`、`src/hooks/`、`src/state/`：前端 UI 与状态机
- `src/cli-seed.ts`：`pnpm seed` 入口
