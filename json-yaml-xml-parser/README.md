简体中文 | [English](./README.en.md)

# JSON / YAML / XML Parser

把 JSON、YAML、XML 规整为 JSON 可序列化值的 TypeScript 库与 CLI（只解析、不回写）。

## 快速开始

```bash
pnpm install
pnpm dev -- parse ./sample.json
pnpm test && pnpm typecheck && pnpm build
```

```bash
data-parser parse <file> [--format json|yaml|xml]
```

细节见 [docs/architecture.md](./docs/architecture.md)。
