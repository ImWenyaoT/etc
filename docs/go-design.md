# 历史说明：原 Go Module 设计

本仓库已改为 Next.js 全栈；下列内容仅作迁移前设计备忘。现行约定见 [nextjs-layout.md](./nextjs-layout.md)。

原先五个项目各自为独立 Go 模块，按 Depth / Interface / Seam 集中行为：

| Module | Interface / Seam | 要点 |
| --- | --- | --- |
| 文件搜索 | `Files(ctx, Options)` | 忽略目录、排序遍历、上限、取消与失败不返回部分结果 |
| 文档转换 | `Parse` / `Detect` | JSON/YAML/XML；XML `$attributes` / `$text` |
| 红黑树 | `Insert` / `Values` / `Stats` / `Validate` / `Demo` | 左倾红黑树；固定 seed 可复现插入顺序 |
| 成绩文件 | `Open` / `List` / `Add` | Top 100、原子替换 |
| Trumpet | SQLite + HTTP | Cookie 会话、bcrypt、游标分页 |

TypeScript 移植应保持上述对外契约（HTTP JSON、校验文案、SQLite schema）。
