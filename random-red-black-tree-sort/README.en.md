# Random Red-Black Tree Sort

Standalone Next.js fullstack app: left-leaning red-black tree sort of shuffled unique integers.

## Setup

Requires Node.js 22+ and pnpm 10+.

```sh
pnpm install
pnpm dev
```

Open `http://localhost:18103`.

## CLI

```sh
pnpm cli -- --count 10000 --seed 42
```

Prints indented Result JSON. Defaults: `--count 10000`, `--seed 42`.

## Check

```sh
pnpm test
pnpm build
```
