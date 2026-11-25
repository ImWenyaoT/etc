# JSON / YAML / XML 解析器

独立的 Next.js 全栈应用：将 JSON、YAML、XML 文档转换成易读的 JSON。

## 环境与启动

需要 Node.js 22+ and pnpm 10+。

```sh
pnpm install
pnpm dev
```

打开 `http://localhost:18102`。

## CLI

```sh
pnpm cli -- parse <file> [--format|-f json|yaml|xml]
```

按扩展名判断格式（`yml` → `yaml`），也可用 `--format` / `-f` 覆盖。将解析结果以格式化 JSON 打印到标准输出。

## 功能与接口

`detect` / `parse` 支持 JSON、YAML、XML。网页与 API 使用 `POST /api/parse`，请求体为 `{"source":"name: Ada","format":"yaml"}`。成功返回 `{format, data, sourcePath?}`；失败返回 `400 {error:{message}}`。

XML 属性保存为 `$attributes`、文本为 `$text`、重复元素为数组。拒绝格式错误、多根 XML、DTD 指令、超过 256 层 XML 和多文档 YAML。空 YAML 为 `null`。

## 检查

```sh
pnpm test
pnpm build
```

## 目录

- `src/app/`：页面与 `POST /api/parse` Route Handler
- `src/lib/parser.ts`：可复用的解析逻辑
- `src/cli.ts`：命令行入口
- `src/components/`：界面与 shadcn/ui 组件

开发与生产都由 Next.js 同一进程提供页面和 API。
