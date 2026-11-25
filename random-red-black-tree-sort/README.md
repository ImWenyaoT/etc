# 红黑树随机排序

独立的 Next.js 全栈应用：用左倾红黑树对打乱的整数排序并检查不变量。

## 环境与启动

需要 Node.js 22+。

```sh
npm ci
npm run dev
```

打开 `http://localhost:18103`。

## CLI

```sh
npm run cli -- --count 10000 --seed 42
```

默认 `--count 10000`、`--seed 42`，打印缩进的 Result JSON。

## 功能与接口

`src/lib/rbtree.ts` 实现左倾红黑树，提供 `Tree.insert`、`Tree.values`、`Tree.validate`、`demo(count, seed)`。重复值不插入。使用 Fisher–Yates 随机排列插入 `[0, count)`，中序遍历输出排序结果。同一 seed 在本实现内可复现插入顺序。

`POST /api/sort` 接收 `{"count":10000,"seed":42}`，返回插入/遍历耗时、树高、旋转/重染色计数、黑高、排序和不变量验证、首尾十个值。数量范围 1–1,000,000。耗时依赖运行环境。

## 检查

```sh
npm test
npm run build
```

## 目录

- `src/app/`：页面与 `POST /api/sort` Route Handler
- `src/lib/rbtree.ts`：可复用的红黑树与 Demo 逻辑
- `src/cli.ts`：命令行入口
- `src/components/`：界面与 shadcn/ui 组件

开发与生产都由 Next.js 同一进程提供页面和 API。
