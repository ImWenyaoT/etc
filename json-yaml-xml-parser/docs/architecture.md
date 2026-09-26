# Architecture

- 适配器：`adapters/json|yaml|xml.ts`
- `detectFormat`：扩展名或 `--format` 覆盖
- `ParserError`：统一错误与 cause
- CLI 通过依赖注入 IO，便于测试
- Lint/format：`oxlint` + `oxfmt`
