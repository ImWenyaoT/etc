import { promises as fs } from "node:fs";
import path from "node:path";

export type SearchOptions = {
  root: string;
  query: string;
  max: number;
  /** `undefined` uses defaults; empty array disables exclusions. */
  ignored?: string[] | null;
};

export class IncompleteSearchError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "IncompleteSearchError";
  }
}

const DEFAULT_IGNORED = [".git", "node_modules", "dist", "coverage", ".next"];

/**
 * Case-insensitive filename substring search. Returns absolute paths in
 * lexical directory traversal order, stopping at `max` matches.
 */
export async function files(
  options: SearchOptions,
  signal?: AbortSignal,
): Promise<string[]> {
  if (signal?.aborted) throw signal.reason ?? new Error("aborted");

  const root = path.resolve(options.root);
  const rootStat = await fs.stat(root);
  if (!rootStat.isDirectory()) {
    throw new Error("root must be a directory");
  }
  if (options.max < 1) {
    throw new Error("max must be positive");
  }

  const query = options.query.trim().toLowerCase();
  if (!query) return [];

  const ignoredList =
    options.ignored === undefined || options.ignored === null
      ? DEFAULT_IGNORED
      : options.ignored;
  const ignored = new Set(ignoredList);

  const result: string[] = [];

  async function walk(dir: string): Promise<void> {
    if (signal?.aborted) throw signal.reason ?? new Error("aborted");
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      throw new IncompleteSearchError(`search incomplete: ${String(error)}`, {
        cause: error,
      });
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      if (signal?.aborted) throw signal.reason ?? new Error("aborted");
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (ignored.has(entry.name)) continue;
        await walk(full);
        if (result.length >= options.max) return;
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().includes(query)) {
        result.push(full);
        if (result.length >= options.max) return;
      }
    }
  }

  await walk(root);
  return result;
}
