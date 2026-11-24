# 文件搜索

独立的 Next.js 全栈应用：按文件名子串查找目录中的普通文件。

## 环境与启动

需要 Node.js 22+。

```sh
npm ci
npm run dev
```

打开 `http://localhost:18101`。查找根目录由 `SEARCH_ROOT` 指定（默认当前工作目录）；浏览器不能改这个路径。

## CLI

```sh
npm run cli -- search <keyword> [--root|-r dir] [--max|-m N]
```

默认 `--root .`、`--max 50`，打印绝对路径。

## 检查

```sh
npm test
npm run build
```

## 目录

- `src/app/`：页面与 `POST /api/search` Route Handler
- `src/lib/search.ts`：可复用的搜索逻辑
- `src/cli.ts`：命令行入口
- `src/components/`：界面与 shadcn/ui 组件

开发与生产都由 Next.js 同一进程提供页面和 API。
