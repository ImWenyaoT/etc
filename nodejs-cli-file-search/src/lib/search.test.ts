import { mkdtemp, mkdir, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { files, IncompleteSearchError } from "./search";

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "file-search-"));
  await mkdir(path.join(root, "src"));
  await mkdir(path.join(root, "node_modules", "pkg"), { recursive: true });
  await writeFile(path.join(root, "README.md"), "x");
  await writeFile(path.join(root, "src", "readme.txt"), "x");
  await writeFile(path.join(root, "src", "App.tsx"), "x");
  await writeFile(path.join(root, "node_modules", "pkg", "readme.js"), "x");
  return root;
}

describe("files", () => {
  it("matches case-insensitively in lexical order and respects ignore + max", async () => {
    const root = await fixture();
    const items = await files({ root, query: "readme", max: 10 });
    expect(items).toEqual([
      path.join(root, "README.md"),
      path.join(root, "src", "readme.txt"),
    ]);
    const limited = await files({ root, query: "readme", max: 1 });
    expect(limited).toHaveLength(1);
    const unignored = await files({
      root,
      query: "readme",
      max: 10,
      ignored: [],
    });
    expect(unignored).toContain(
      path.join(root, "node_modules", "pkg", "readme.js"),
    );
  });

  it("returns empty for blank query and rejects bad max", async () => {
    const root = await fixture();
    expect(await files({ root, query: "  ", max: 5 })).toEqual([]);
    await expect(files({ root, query: "a", max: 0 })).rejects.toThrow(
      /max must be positive/,
    );
  });

  it("propagates abort and incomplete traversal", async () => {
    const root = await fixture();
    const controller = new AbortController();
    controller.abort();
    await expect(
      files({ root, query: "readme", max: 10 }, controller.signal),
    ).rejects.toBeTruthy();

    const blocked = path.join(root, "secret");
    await mkdir(blocked);
    await writeFile(path.join(blocked, "hidden.md"), "x");
    await chmod(blocked, 0);
    try {
      await expect(
        files({ root, query: "hidden", max: 10 }),
      ).rejects.toBeInstanceOf(IncompleteSearchError);
    } finally {
      await chmod(blocked, 0o700);
    }
  });
});
