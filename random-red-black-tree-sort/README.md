# 红黑树随机排序

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

前端：`http://localhost:18103`；后端：`http://127.0.0.1:18203`。Go 监听地址可通过 `ADDR` 覆盖。

构建后可仅运行 Go 服务：

```sh
make build
./bin/server
# 在浏览器访问后端地址
```

## 功能与接口

Go 库实现左倾红黑树，提供 `Tree.Insert`、`Tree.Values`、`Tree.Validate`、`Demo(count, seed)`。重复值不插入。使用 Fisher–Yates 随机排列插入 `[0, count)`，中序遍历输出排序结果。

```sh
go run ./cmd/rb-sort --count 10000 --seed 42
```

`POST /api/sort` 接收 `{"count":10000,"seed":42}`，返回插入/遍历耗时、树高、旋转/重染色计数、黑高、排序和不变量验证、首尾十个值。数量范围 1–1,000,000。固定种子保证插入顺序可复现；耗时依赖运行环境。

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

`Tree` 的零值可直接使用；`Stats()` 返回独立的统计快照，`Values()` 返回独立切片。调用者无法通过快照修改内部状态；同一棵树不支持并发修改。HTTP 结果字段保持不变。
