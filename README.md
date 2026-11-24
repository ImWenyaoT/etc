# Next.js 项目集

五个独立可运行的 Next.js 全栈应用（App Router + TypeScript + Tailwind CSS v4 + shadcn/ui）。需要 Node.js 22+。

| 项目 | 功能 | 端口 |
| --- | --- | --- |
| [nodejs-cli-file-search](./nodejs-cli-file-search/) | 文件搜索网页与 CLI | 18101 |
| [json-yaml-xml-parser](./json-yaml-xml-parser/) | 文档解析网页与 CLI | 18102 |
| [random-red-black-tree-sort](./random-red-black-tree-sort/) | 红黑树排序演示与 CLI | 18103 |
| [web-front-end-snake-game](./web-front-end-snake-game/) | 贪吃蛇与成绩 API | 18104 |
| [trumpet-twitter](./trumpet-twitter/) | 社交应用（SQLite） | 18105 |

## 启动一个项目

```sh
cd json-yaml-xml-parser
npm ci
npm run dev
```

在对应端口打开页面。页面与 API 由同一 Next.js 进程提供。

## 检查

每个项目目录内：

```sh
npm test
npm run build
```

目录约定见 [docs/nextjs-layout.md](./docs/nextjs-layout.md)。各项目细节见其 README。
