# React + Vite / Go 项目集

五个独立可运行的项目，前端统一使用 React + Vite + TypeScript + Tailwind CSS v4，基础组件采用 shadcn/ui（Base UI），后端和 CLI 使用 Go。需要 Go 1.25+、Node.js 24.15+。

| 项目                                                        | 功能                             | 前端端口 | Go 端口 |
| ----------------------------------------------------------- | -------------------------------- | -------- | ------- |
| [nodejs-cli-file-search](./nodejs-cli-file-search/)         | 文件搜索网页与 Go CLI            | 18101    | 18201   |
| [json-yaml-xml-parser](./json-yaml-xml-parser/)             | 文档解析网页、Go 库与 CLI        | 18102    | 18202   |
| [random-red-black-tree-sort](./random-red-black-tree-sort/) | 红黑树排序网页、Go 库与 CLI      | 18103    | 18203   |
| [web-front-end-snake-game](./web-front-end-snake-game/)     | React 贪吃蛇与 Go 成绩服务       | 18104    | 18204   |
| [trumpet-twitter](./trumpet-twitter/)                       | React 社交应用与 Go + SQLite API | 18105    | 18205   |

## 启动一个项目

```sh
cd json-yaml-xml-parser
go run ./cmd/server
```

另一终端：

```sh
cd json-yaml-xml-parser/web
npm ci
npm run dev
```

在对应前端地址打开页面。开发环境通过 Vite 代理访问 Go；运行 `make build` 后，可直接访问 Go 地址使用构建后的网页。

## 全仓库验证

```sh
./scripts/check.sh
```

检查包含 Go 静态分析、竞态测试、编译，以及前端测试和生产构建。依赖安装需要网络。详细接口、配置与 CLI 见各项目 README；迁移差异见 [MIGRATION.md](./MIGRATION.md)。

## 目录约定

根目录 `go.work` 联合五个独立 Go 模块，方便跨项目开发；每个项目仍能单独运行。目录遵循 [Go 官方模块布局说明](https://go.dev/doc/modules/layout)：

- `cmd/<command>/main.go`：HTTP 服务与 CLI 入口。
- 工具模块根目录：可复用、可测试的 Go 库。
- `internal/`：不对外导出的服务逻辑、HTTP 适配与存储。
- `web/src/`：React 界面；状态和异步流程从展示组件中分离。
- `web/public/`：静态资源；`web/dist/` 与 `bin/` 为忽略的构建产物。

`make check` 执行全仓检查，`make test` 在依赖已安装时运行全部测试，`make build` 构建所有项目。每个前端拥有独立锁文件，不要求额外的仓库级 npm 安装。

前端使用原生语义表单、显式异步状态、键盘焦点样式和响应式布局。三个工具会取消过期请求；贪吃蛇动画与输入由专用 Hook 管理；社交应用由状态机管理视图，按操作锁定重复提交。

本次本地检查与浏览器验收见 [验收记录](./docs/verification.md)。

五个前端通过 `@tailwindcss/vite` 编译样式，使用语义化主题变量保留各自配色。`web/components.json` 管理 shadcn 配置，`web/src/components/ui/` 保存可维护的组件源码；按钮、表单、卡片、提示、空状态与切换控件均实际使用这些组件。字体自托管，不依赖外部字体服务。
