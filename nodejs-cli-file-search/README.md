# 文件搜索

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

前端：`http://localhost:18101`；后端：`http://127.0.0.1:18201`。Go 监听地址可通过 `ADDR` 覆盖。

构建后可仅运行 Go 服务：

```sh
make build
./bin/server
# 在浏览器访问后端地址
```

## 功能与接口

Go 库提供 `Files(ctx, Options)`；CLI 保留 `search <keyword> --root <directory> --max <number>`，也支持 `-r`、`-m`。匹配不区分大小写，按目录字典序遍历，忽略 `.git`、`node_modules`、`dist`、`coverage`，不跟随符号链接。根目录或子目录读取失败均返回错误，不返回部分结果；`errors.Is(err, search.ErrIncomplete)` 可识别遍历失败。请求取消会停止遍历。

```sh
go run ./cmd/file-search search readme --root . --max 20
```

网页通过 `POST /api/search` 搜索 `SEARCH_ROOT`（默认当前项目目录）。请求体为 `{"query":"readme","max":50}`，最多 1000 条，返回相对路径。浏览器不能任意指定服务端路径。

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
