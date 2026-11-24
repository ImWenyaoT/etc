#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "./lib/parser";

function usage(): never {
  console.error(
    "usage: npm run cli -- parse <file> [--format|-f json|yaml|xml]",
  );
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] !== "parse") usage();

  let format = "";
  let file = "";
  const rest = args.slice(1);
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg === "--format" || arg === "-f") {
      format = rest[++i] ?? usage();
    } else if (arg.startsWith("-")) {
      usage();
    } else if (!file) {
      file = arg;
    } else {
      usage();
    }
  }
  if (!file) usage();

  try {
    const abs = path.resolve(file);
    const source = await readFile(abs, "utf8");
    const result = parse(source, abs, format);
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

void main();
