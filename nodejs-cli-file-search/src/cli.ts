#!/usr/bin/env node
import { files } from "./lib/search";

function usage(): never {
  console.error(
    "usage: npm run cli -- search <keyword> [--root|-r dir] [--max|-m N]",
  );
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] !== "search") usage();

  let root = ".";
  let max = 50;
  let query = "";
  const rest = args.slice(1);
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg === "--root" || arg === "-r") {
      root = rest[++i] ?? usage();
    } else if (arg === "--max" || arg === "-m") {
      max = Number(rest[++i]);
      if (!Number.isFinite(max)) usage();
    } else if (arg.startsWith("-")) {
      usage();
    } else if (!query) {
      query = arg;
    } else {
      usage();
    }
  }
  if (!query) usage();

  try {
    const items = await files({ root, query, max });
    for (const item of items) console.log(item);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

void main();
