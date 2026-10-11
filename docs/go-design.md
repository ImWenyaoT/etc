# Go Module 设计整理

按 codebase-design 的 Depth、Interface、Seam 原则集中行为，避免增加无实际替代 Adapter 的抽象。

| Module | Interface / Seam | Implementation 与测试 |
| --- | --- | --- |
| 文件搜索 | `Files(ctx, Options)` | 路径解析、忽略目录、排序遍历、结果上限、取消与失败处理留在 Module 内；临时真实文件夹测试 |
| 文档转换 | `Parse` / `Detect` 与可分类错误 | 三格式解码和 XML 规则留在内部；从公开 Interface 验证结果及错误链 |
| 红黑树 | `Insert` / `Values` / `Stats` / `Validate` | 节点与计数私有，快照不泄漏可变状态；零值和算法不变量测试 |
| 成绩文件 | `Open` / `List` / `Add` | 排序、上限和原子替换集中；真实文件失败测试，不暴露写文件钩子 |
| Trumpet | `Open(file, Config)`、`ServeHTTP`、`Close`、`SeedDemo(ctx)` | SQLite 是 local-substitutable dependency；真实临时 SQLite 测试；HTTP Adapter 统一转换普通 error；Context 传到请求 SQL |

未引入通用 Repository Interface：SQLite 已能直接用于测试，没有第二种生产存储 Adapter 需求。未将五个独立项目的 HTTP 启动代码强行共享；保持各自可单独安装和构建。

配置由命令入口读取；App 不再隐式读取环境变量。内部 SQL 查询仍留在同一个 Module，返回普通 error；正常校验/未找到不再通过 panic 跳转。测试改用外部 `_test` 包，穿过调用者使用的相同 Seam，不断言私有字段。

有意保留的限制：红黑树不是并发容器；成绩文件只有单进程同步且没有防作弊；bcrypt 运算本身无法中途取消，但后续 SQL 会检查请求 Context；原子文件替换不承诺掉电后目录元数据持久化。
