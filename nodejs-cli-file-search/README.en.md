# File Search

Standalone Next.js fullstack app: case-insensitive filename substring search.

## Setup

Requires Node.js 22+.

```sh
npm ci
npm run dev
```

Open `http://localhost:18101`. Search root comes from `SEARCH_ROOT` (default `.`).

## CLI

```sh
npm run cli -- search <keyword> [--root|-r dir] [--max|-m N]
```

## Check

```sh
npm test
npm run build
```
