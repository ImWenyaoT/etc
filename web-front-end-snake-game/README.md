# 贪吃蛇

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

前端：`http://localhost:18104`；后端：`http://127.0.0.1:18204`。Go 监听地址可通过 `ADDR` 覆盖。

构建后可仅运行 Go 服务：

```sh
make build
./bin/server
# 在浏览器访问后端地址
```

## 功能与接口

React 管理游戏生命周期；纯 TypeScript 引擎和 Canvas 渲染器分离。支持方向键 / WASD、Enter 开始、空格暂停、触屏按钮、重新开始、本机最高分。离开页面自动暂停，组件卸载会清理动画与事件监听。

Go 提供 `GET /api/scores` 和 `POST /api/scores`。提交格式为 `{"name":"玩家","score":10}`，按分数保留前 100 条，原子写入 `SCORES_FILE`（默认 `data/scores.json`）。名称 1–40 字；分数必须为 0–5720 的 10 的倍数。

成绩是客户端提交的练习数据，未提供防作弊验证。仅支持单个服务进程写入成绩文件。

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
