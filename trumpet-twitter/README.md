# Trumpet Twitter

独立的 React + Vite 前端和 Go 后端。目录名保持不变。

## 环境与启动

需要 Go 1.25+ 和 Node.js 24.15+。

```sh
# 当前项目目录，终端一
go run ./cmd/server

# 终端二
cd web
npm ci
npm run dev
```

前端：`http://localhost:18105`；后端：`http://127.0.0.1:18205`。Go 监听地址可通过 `ADDR` 覆盖。

构建后可仅运行 Go 服务：

```sh
make build
./bin/server
# 在浏览器访问后端地址
```

## 功能与接口

React + Vite 保留原有界面和状态机。Go `net/http` + SQLite 实现注册、登录、退出、30 天 Cookie 会话、发帖、回复、关注/取关、点赞/取消点赞、关注时间线、用户主页和游标分页。

数据库文件由 `DB_FILE` 指定（默认 `data/trumpet.db`）。数据库表和 bcrypt 密码哈希沿用旧实现。旧项目默认数据库位于 `apps/api/data/trumpet.db` 时，请备份后通过 `DB_FILE` 指向该文件。密码受 bcrypt 限制，最大 72 字节；账号为 3–20 位小写字母、数字或下划线，帖子最多 280 字。

开发时 Vite 代理 `/api` 到 Go 服务；构建后 Go 同时提供静态前端和 `/api/*`。后端也保留旧版无 `/api` 前缀路由。开发前端端口为 18105。跨源变更请求按 Origin 校验；反向代理部署需设置 `WEB_ORIGIN=https://实际域名`，HTTPS 设置 `COOKIE_SECURE=true`。`.env.example` 是配置参考，Go 不自动加载 `.env`。

首次使用在网页注册账号。也可在空数据库执行 `go run ./cmd/seed`，创建 mina / leo / ava（密码 password123）及演示帖子；数据库非空时拒绝操作，不覆盖数据。侧栏支持按账号查找真实用户。现有前端单元测试与 Go 集成测试覆盖核心流程。

## 检查

```sh
go vet ./...
go test -race ./...
go build ./...
cd web
npm ci
npm test
npm run build
```

## 目录

- `cmd/`：Go 服务和 CLI 入口。
- `web/`：React + Vite 页面、前端依赖与锁文件。
- `internal/`：仅供项目内部使用的实现。
- 根目录 Go 文件：可复用业务逻辑（Twitter 位于 `internal/app`）。

迁移差异见仓库根目录 `MIGRATION.md`。

Go 应用通过 `app.Open(file, app.Config{CookieSecure: ..., WebOrigin: ...})` 创建；环境变量只由 `cmd/server` 读取，配置在启动时校验并复制。正常业务和存储失败返回 `error`，HTTP Adapter 统一映射状态码与安全提示。请求 Context 传入所有请求中的 SQL 操作；`SeedDemo(ctx)` 通过事务执行并支持取消。测试使用相同的 HTTP Interface 和真实临时 SQLite，不引入单一实现的仓储 Interface。
