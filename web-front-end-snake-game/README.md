# 贪吃蛇

独立的 Next.js 全栈应用：经典贪吃蛇，含本机最高分与成绩榜。

## 环境与启动

需要 Node.js 22+ and pnpm 10+。

```sh
pnpm install
pnpm dev
```

打开 `http://localhost:18104`。成绩文件由 `SCORES_FILE` 指定（默认 `data/scores.json`）。

## 功能与接口

React 管理游戏生命周期；纯 TypeScript 引擎和 Canvas 渲染器分离。支持方向键 / WASD、Enter 开始、空格暂停、触屏按钮、重新开始、本机最高分。离开页面自动暂停，组件卸载会清理动画与事件监听。

`GET /api/scores` 与 `POST /api/scores`。提交格式为 `{"name":"玩家","score":10}`，按分数保留前 100 条，原子写入 `SCORES_FILE`。名称 1–40 字；分数必须为 0–5720 的 10 的倍数。

成绩是客户端提交的练习数据，未提供防作弊验证。仅支持单个服务进程写入成绩文件。

## 检查

```sh
pnpm test
pnpm build
```

## 目录

- `src/app/`：页面与 `GET|POST /api/scores` Route Handler
- `src/lib/scores.ts`：成绩存储
- `src/game/`、`src/renderer/`、`src/input.ts`、`src/useSnakeGame.ts`：游戏逻辑
- `src/components/`：界面与 shadcn/ui 组件

开发与生产都由 Next.js 同一进程提供页面和 API。

成绩 Module 的 Interface 为 `open/list/add`。`list` 返回副本，`add` 只在原子替换文件成功后更新内存；保存失败不改变上一份成绩。损坏 JSON 会报错，不自动覆盖。单文件只允许一个 Store/进程持有；不提供断电持久性或防作弊保证。
