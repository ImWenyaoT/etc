# JSON / YAML / XML 解析器

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

前端：`http://localhost:18102`；后端：`http://127.0.0.1:18202`。Go 监听地址可通过 `ADDR` 覆盖。

构建后可仅运行 Go 服务：

```sh
make build
./bin/server
# 在浏览器访问后端地址
```

## 功能与接口

Go 库提供 `Detect(path, format)` 和 `Parse(source, path, format)`。支持按扩展名判断格式和显式覆盖。CLI 将数据输出为格式化 JSON。

```sh
go run ./cmd/data-parser parse input.yaml
go run ./cmd/data-parser parse input.txt --format xml
```

网页使用 `POST /api/parse`，请求体为 `{"source":"name: Ada","format":"yaml"}`。XML 属性保存为 `$attributes`、文本为 `$text`、重复元素为数组。拒绝格式错误、多根 XML、DTD 指令、超过 256 层 XML 和多文档 YAML。YAML 映射键必须能转换为 JSON 对象键。请求体限制为 1 MiB。

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

Go 调用者可通过 `errors.Is` 判断 `ErrUnsupportedFormat` 与 `ErrInvalidDocument`；原始解析错误仍保留在错误链中。XML 映射、空 YAML 与单文档限制见 `parser.Parse` 的 Go 文档。
