import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

export type Score = {
  name: string;
  score: number;
};

export class ValidationError extends Error {
  constructor(message = "昵称或得分有误，请检查。") {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Stores the best 100 submitted scores in a single JSON file.
 * Serializes concurrent calls within one process. Only one Store/process
 * may own a file; it does not provide cross-process locking or cheat detection.
 */
export class Store {
  private items: Score[] = [];
  private queue: Promise<unknown> = Promise.resolve();

  private constructor(
    private readonly file: string,
    items: Score[],
  ) {
    this.items = items;
  }

  /** Loads existing scores; a missing file starts an empty store. Invalid JSON is an error. */
  static async open(file: string): Promise<Store> {
    let items: Score[] = [];
    try {
      const raw = await readFile(file, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error("load scores: expected a JSON array");
      }
      items = parsed.map((entry) => {
        if (
          typeof entry !== "object" ||
          entry === null ||
          typeof (entry as Score).name !== "string" ||
          typeof (entry as Score).score !== "number"
        ) {
          throw new Error("load scores: invalid score entry");
        }
        return {
          name: (entry as Score).name,
          score: (entry as Score).score,
        };
      });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err?.code !== "ENOENT") {
        throw new Error(
          `load scores: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    }
    return new Store(file, items);
  }

  /** Returns a copy; callers cannot mutate stored scores through it. */
  list(): Score[] {
    return this.items.map((item) => ({ ...item }));
  }

  /**
   * Trims the name, validates the score, and atomically replaces the file.
   * Equal scores preserve submission order. Memory changes only after the write
   * succeeds; failures leave the previous scores intact.
   */
  async add(value: Score): Promise<Score> {
    const name = value.name.trim();
    const score = value.score;
    if (
      name === "" ||
      Array.from(name).length > 40 ||
      !Number.isInteger(score) ||
      score < 0 ||
      score > 5720 ||
      score % 10 !== 0
    ) {
      throw new ValidationError();
    }
    const accepted: Score = { name, score };

    return this.withLock(async () => {
      const items = [...this.items, accepted];
      items.sort((a, b) => b.score - a.score);
      const next = items.slice(0, 100);
      await atomicWrite(this.file, JSON.stringify(next));
      this.items = next;
      return accepted;
    });
  }

  private withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

async function atomicWrite(file: string, data: string): Promise<void> {
  const dir = path.dirname(file);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const temp = path.join(dir, `.scores-${randomBytes(6).toString("hex")}`);
  try {
    const handle = await open(temp, "w", 0o600);
    try {
      await handle.writeFile(data, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temp, file);
  } catch (error) {
    await unlink(temp).catch(() => undefined);
    throw error;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __snakeScoresStore: Store | undefined;
  // eslint-disable-next-line no-var
  var __snakeScoresStorePromise: Promise<Store> | undefined;
}

export function scoresFilePath(): string {
  return process.env.SCORES_FILE?.trim() || "data/scores.json";
}

/** Process-wide store singleton (one owner per file, matching the Go server). */
export function getStore(): Promise<Store> {
  if (globalThis.__snakeScoresStore) {
    return Promise.resolve(globalThis.__snakeScoresStore);
  }
  if (!globalThis.__snakeScoresStorePromise) {
    globalThis.__snakeScoresStorePromise = Store.open(scoresFilePath()).then(
      (store) => {
        globalThis.__snakeScoresStore = store;
        return store;
      },
    );
  }
  return globalThis.__snakeScoresStorePromise;
}
