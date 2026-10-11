# 红黑树随机排序架构

```mermaid
flowchart LR
  UI[React 页面] --> Proxy[Vite 开发代理 / Go 静态服务]
  Proxy --> API[Go net/http API]
  API --> Core[业务逻辑]
```

前后端通过 JSON HTTP 接口通信，前端不依赖 Node.js 服务端。每个项目独立安装、构建和运行。Go 模块与 npm 锁文件分开维护，CI 对五个项目分别执行 Go 检查及前端构建。

Go 库实现左倾红黑树，提供 `Tree.Insert`、`Tree.Values`、`Tree.Validate`、`Demo(count, seed)`。重复值不插入。使用 Fisher–Yates 随机排列插入 `[0, count)`，中序遍历输出排序结果。

```sh
go run ./cmd/rb-sort --count 10000 --seed 42
```

`POST /api/sort` 接收 `{"count":10000,"seed":42}`，返回插入/遍历耗时、树高、旋转/重染色计数、黑高、排序和不变量验证、首尾十个值。数量范围 1–1,000,000。固定种子保证插入顺序可复现；耗时依赖运行环境。

`Tree` 的零值可直接使用；`Stats()` 返回独立的统计快照，`Values()` 返回独立切片。调用者无法通过快照修改内部状态；同一棵树不支持并发修改。HTTP 结果字段保持不变。
