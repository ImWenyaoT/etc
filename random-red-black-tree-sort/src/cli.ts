#!/usr/bin/env node
import { demo } from "./lib/rbtree";

function usage(): never {
  console.error("usage: npm run cli -- [--count N] [--seed N]");
  process.exit(1);
}

function main() {
  let count = 10000;
  let seed = 42;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--count") {
      count = Number(args[++i]);
      if (!Number.isFinite(count)) usage();
    } else if (arg === "--seed") {
      seed = Number(args[++i]);
      if (!Number.isFinite(seed)) usage();
    } else if (arg.startsWith("-")) {
      usage();
    } else {
      usage();
    }
  }

  try {
    const result = demo(Math.trunc(count), Math.trunc(seed));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
