# File Search

Standalone Next.js fullstack app: case-insensitive filename substring search.

## Setup

Requires Node.js 22+ and pnpm 10+.

```sh
pnpm install
pnpm dev
```

Open `http://localhost:18101`. Search root comes from `SEARCH_ROOT` (default `.`).

## CLI

```sh
pnpm cli -- search <keyword> [--root|-r dir] [--max|-m N]
```

## Check

```sh
pnpm test
pnpm build
```
