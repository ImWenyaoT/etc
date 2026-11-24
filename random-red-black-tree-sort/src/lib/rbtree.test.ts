import { describe, expect, it } from "vitest";
import { Tree, demo, permute } from "./rbtree";

function shuffleCopy(values: number[]): number[] {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

describe("Tree invariants", () => {
  it("keeps red-black invariants for random and extreme orders", () => {
    const orders = [
      shuffleCopy(Array.from({ length: 10000 }, (_, i) => i)),
      [1, 2, 3, 4, 5, 6],
      [6, 5, 4, 3, 2, 1],
    ];
    for (const order of orders) {
      const tree = new Tree();
      for (const v of order) {
        tree.insert(v);
        if (order.length < 100) {
          const { error } = tree.validate();
          expect(error).toBeUndefined();
        }
      }
      const { error } = tree.validate();
      expect(error).toBeUndefined();
      expect(tree.insert(order[0]!)).toBe(false);
      const a = tree.values();
      for (let i = 1; i < a.length; i++) {
        expect(a[i - 1]!).toBeLessThan(a[i]!);
      }
    }
  });

  it("does not let callers mutate the tree through snapshots", () => {
    const tree = new Tree();
    for (const value of [3, 1, 2]) tree.insert(value);
    const original = tree.stats();
    const stats = tree.stats();
    stats.insertions = 999;
    stats.rotations = 999;
    const values = tree.values();
    values[0] = 999;
    expect(tree.stats()).toEqual(original);
    expect(tree.values()[0]).toBe(1);
    expect(tree.insert(2)).toBe(false);
    expect(tree.stats().insertions).toBe(original.insertions);
  });
});

describe("demo", () => {
  it("sorts and validates a seeded run", () => {
    const r = demo(10000, 42);
    expect(r.validRedBlackTree).toBe(true);
    expect(r.sortedOutput).toBe(true);
    expect(r.inserted).toBe(10000);
    expect(r.treeHeight).toBeLessThanOrEqual(28);
    expect(r.firstValues).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(r.lastValues).toEqual([
      9990, 9991, 9992, 9993, 9994, 9995, 9996, 9997, 9998, 9999,
    ]);
  });

  it("rejects invalid count", () => {
    expect(() => demo(-1, 1)).toThrow("count must be between 1 and 1000000");
    expect(() => demo(0, 1)).toThrow("count must be between 1 and 1000000");
    expect(() => demo(1_000_001, 1)).toThrow(
      "count must be between 1 and 1000000",
    );
  });

  it("is reproducible for the same seed", () => {
    const a = permute(100, 42);
    const b = permute(100, 42);
    const c = permute(100, 43);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});
