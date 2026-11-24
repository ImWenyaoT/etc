import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Store, ValidationError } from "./scores";

const temps: string[] = [];

afterEach(async () => {
  await Promise.all(
    temps.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function tempFile(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "snake-scores-"));
  temps.push(dir);
  return path.join(dir, "scores.json");
}

describe("Store", () => {
  it("persists concurrent adds and rejects invalid scores", async () => {
    const file = await tempFile();
    const store = await Store.open(file);
    await Promise.all(
      Array.from({ length: 20 }, () => store.add({ name: "Ada", score: 10 })),
    );
    const reopened = await Store.open(file);
    expect(reopened.list()).toHaveLength(20);
    await expect(store.add({ name: "", score: -1 })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("keeps last successful state when atomic replacement fails", async () => {
    const file = await tempFile();
    const store = await Store.open(file);
    await store.add({ name: "Ada", score: 10 });
    const expected = store.list();
    const backup = file + ".backup";
    await rename(file, backup);
    await mkdir(file);
    await expect(store.add({ name: "Bob", score: 20 })).rejects.toBeTruthy();
    expect(store.list()).toEqual(expected);
    await rm(file, { recursive: true });
    await rename(backup, file);
    const reopened = await Store.open(file);
    expect(reopened.list()).toEqual(expected);
    const leftovers = await readdir(path.dirname(file));
    expect(leftovers.filter((name) => name.startsWith(".scores-"))).toEqual([]);
  });

  it("returns list copies and rejects corrupt JSON without overwriting", async () => {
    const file = await tempFile();
    const store = await Store.open(file);
    await store.add({ name: " Ada ", score: 10 });
    const copy = store.list();
    copy[0].name = "Changed";
    expect(store.list()[0].name).toBe("Ada");
    const corrupt = "not json";
    await writeFile(file, corrupt, "utf8");
    await expect(Store.open(file)).rejects.toThrow(/load scores/);
    expect(await readFile(file, "utf8")).toBe(corrupt);
  });

  it("keeps top 100 by score desc and preserves tie submission order", async () => {
    const file = await tempFile();
    const store = await Store.open(file);
    for (let i = 0; i < 101; i += 1) {
      await store.add({ name: "Player", score: i * 10 });
    }
    let items = store.list();
    expect(items).toHaveLength(100);
    expect(items[0].score).toBe(1000);
    expect(items[99].score).toBe(10);
    await store.add({ name: "First", score: 1100 });
    await store.add({ name: "Second", score: 1100 });
    items = store.list();
    expect(items[0].name).toBe("First");
    expect(items[1].name).toBe("Second");
  });

  it("rejects invalid scores without changing saved state", async () => {
    const file = await tempFile();
    const store = await Store.open(file);
    const invalid = [
      { name: "", score: 10 },
      { name: "字".repeat(41), score: 10 },
      { name: "Ada", score: -10 },
      { name: "Ada", score: 11 },
      { name: "Ada", score: 5730 },
    ];
    for (const value of invalid) {
      await expect(store.add(value)).rejects.toBeInstanceOf(ValidationError);
    }
    expect(store.list()).toHaveLength(0);
    await store.add({ name: "字".repeat(40), score: 5720 });
    const reopened = await Store.open(file);
    expect(reopened.list()).toHaveLength(1);
  });

  it("treats a missing file as an empty store", async () => {
    const file = await tempFile();
    const store = await Store.open(file);
    expect(store.list()).toEqual([]);
  });
});
