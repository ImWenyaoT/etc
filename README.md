# TypeScript 项目模板集

[![CI](https://github.com/ImWenyaoT/templates/actions/workflows/ci.yml/badge.svg)](https://github.com/ImWenyaoT/templates/actions/workflows/ci.yml)

五个自包含 TypeScript 模板：CLI、纯前端游戏、全栈小应用、算法与解析库。每个目录可独立安装与运行。

## 技术栈约束

- 语言 / 运行时：TypeScript、Node.js
- 前端：React；需要 SSR 时可用 Next.js
- 包管理：pnpm
- Lint / Format：Oxc（`oxlint`、`oxfmt`）

## 项目

| 目录 | 说明 |
| --- | --- |
| [nodejs-cli-file-search](./nodejs-cli-file-search/) | 递归文件名搜索 CLI |
| [web-front-end-snake-game](./web-front-end-snake-game/) | 纯前端贪吃蛇 |
| [trumpet-twitter](./trumpet-twitter/) | React + Express + SQLite 小号 Twitter |
| [random-red-black-tree-sort](./random-red-black-tree-sort/) | 红黑树随机插入排序 |
| [json-yaml-xml-parser](./json-yaml-xml-parser/) | JSON / YAML / XML 解析库与 CLI |

每个子项目含中文 `README.md` 与英文 `README.en.md`，细节见各自 `docs/`。
