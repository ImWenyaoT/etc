# React + Vite / Go 迁移说明

五个项目目录保持不变。所有前端位于 `web/`，每个项目根目录拥有独立 Go 模块。旧 TypeScript 服务端、工具库及 pnpm 配置已由 Go 实现和 npm 前端配置替代；旧源代码可从 Git 历史恢复。

| 原入口                            | 新入口                                               |
| --------------------------------- | ---------------------------------------------------- |
| 文件搜索 `pnpm dev -- search ...` | `go run ./cmd/file-search search ...`                |
| 文档解析 `pnpm dev -- parse ...`  | `go run ./cmd/data-parser parse ...`                 |
| 红黑树 `pnpm start`               | `go run ./cmd/rb-sort --count 10000 --seed 42`       |
| 贪吃蛇根目录 `pnpm dev`           | `cd web && npm run dev`，Go 为 `go run ./cmd/server` |
| Twitter `apps/api`                | 根目录 `cmd/server` 与 `internal/app`                |
| Twitter `apps/web`                | `web`                                                |

三个工具不再提供 npm 库导出，改为 Go 包。CLI 的选项放在关键词或文件路径之后；未知选项和非法参数会失败。文件搜索 CLI 支持旧有短选项，解析器支持 `-f`。文件遍历顺序使用 Go 的字典序，非原 JS localeCompare 区域排序。随机排序的 PRNG 改为 PCG，旧 JS 随机序列不能复现。

解析器保留 XML `$attributes` / `$text` / 重复节点数组格式，严格拒绝 DTD、多根 XML、多文档 YAML 和超过深度限制的 XML。YAML 非字符串映射键若不能 JSON 序列化会返回错误。

Twitter 沿用原 SQLite 表结构与 bcrypt 哈希，但默认路径由旧后端工作目录切换为项目根目录 `data/trumpet.db`。迁移真实数据前备份，再用 `DB_FILE` 指向原数据库；不要同时启动旧、新服务写入同一数据库。所有原 API 端点保留，并新增 `/api` 同源入口。不自动创建演示账号；保留 Go `cmd/seed`，仅对空数据库生效。密码最大 72 字节，替代旧版 120 字符上限，符合 bcrypt 限制。游标格式不变，无效游标明确返回 400。

贪吃蛇仍在浏览器运行游戏逻辑；Go 负责成绩存储。成绩服务是练习用途，未验证客户端成绩真实性，也不支持多进程同时写同一 JSON 文件。

CI 已改为 Go + npm 矩阵。各前端使用 `package-lock.json`，通过 `npm ci` 可重复安装。

视觉回归检查沿用 Git 历史 `77ca9c9` 的完整 Twitter 与贪吃蛇样式作为基线，修复后续简化丢失的按钮、头像、布局和游戏外观；移动端保留退出与用户查找入口。三个工具改为独立结果工作区。Twitter 删除默认假推荐，实际通过账号查找用户。

Go 模块路径使用 `github.com/ImWenyaoT/etc/<项目>`，根目录添加 `go.work`。贪吃蛇成绩逻辑移至 `internal/scores`；Twitter HTTP 按认证、帖子和用户拆分。HTTP 服务收到 SIGINT/SIGTERM 时最多等待 10 秒完成正在处理的请求。

## Tailwind 与 shadcn/ui

五个 `web/` 均使用 Tailwind CSS v4 官方 Vite 插件和 shadcn/ui 的 Base UI 组件源码。组件位于 `src/components/ui/`，页面通过 Tailwind 布局类和语义化 CSS 变量组合界面；已移除旧的通用按钮、输入框与卡片 CSS。各项目保留独立的 `components.json`、npm 锁文件和主题。解析格式和登录/注册模式使用 ToggleGroup；表单标签、错误关联、焦点状态及加载反馈由对应组件提供。

## Go Interface 整理

HTTP 路径、正常响应字段、默认端口和用户操作保持不变。Go 调用者需要调整：

- 文件搜索：`Files(ctx, Options)`，取消或目录读取失败时返回错误及空结果；子目录失败不再静默跳过。
- 红黑树：公开计数字段改为 `Stats()` 返回的独立快照。
- 文档转换：可用 `errors.Is` 分类格式和文档错误，原始错误仍在错误链中。
- Trumpet：`Open(file, Config)` 显式注入配置，`SeedDemo(ctx)` 接收取消 Context。`WEB_ORIGIN` 必须是不含路径、凭据、查询或片段的 HTTP(S) origin；`COOKIE_SECURE` 接受 Go 的布尔值格式，拼写错误会阻止启动。

这些 Interface 变更集中在本仓库 Go 调用者；远端下游 Go 使用者需同步调整。配置校验和子目录错误属于有意收紧的失败语义。
