/** Left-leaning red-black tree of unique integers. */

type Node = {
  value: number;
  red: boolean;
  left: Node | null;
  right: Node | null;
};

export type Statistics = {
  insertions: number;
  rotations: number;
  recolors: number;
};

export type Result = {
  elementCount: number;
  inserted: number;
  insertTimeMs: number;
  traversalTimeMs: number;
  treeHeight: number;
  rotations: number;
  recolors: number;
  validRedBlackTree: boolean;
  blackHeight: number;
  sortedOutput: boolean;
  firstValues: number[];
  lastValues: number[];
  validationErrors: string[];
};

function isRed(n: Node | null): boolean {
  return n !== null && n.red;
}

/** Deterministic xorshift64* PRNG; same seed always yields the same sequence. */
export class SeededRng {
  private state: bigint;

  constructor(seed: number | bigint) {
    let s =
      typeof seed === "bigint"
        ? seed
        : BigInt(Math.trunc(seed)) & 0xffffffffffffffffn;
    if (s === 0n) s = 1n;
    this.state = s;
  }

  /** Uniform uint64 in [0, 2^64). */
  nextUint64(): bigint {
    let x = this.state;
    x ^= x >> 12n;
    x ^= (x << 25n) & 0xffffffffffffffffn;
    x ^= x >> 27n;
    this.state = x & 0xffffffffffffffffn;
    return (this.state * 2685821657736338717n) & 0xffffffffffffffffn;
  }

  /** Uniform integer in [0, n). */
  nextInt(n: number): number {
    if (n <= 0) throw new Error("n must be positive");
    return Number(this.nextUint64() % BigInt(n));
  }
}

/** Fisher–Yates permutation of [0, count). */
export function permute(count: number, seed: number | bigint): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  const rng = new SeededRng(seed);
  for (let i = count - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    const tmp = order[i]!;
    order[i] = order[j]!;
    order[j] = tmp;
  }
  return order;
}

/**
 * Tree is ready at construction. Not safe for concurrent mutation.
 */
export class Tree {
  private root: Node | null = null;
  private insertions = 0;
  private rotations = 0;
  private recolors = 0;

  /** Snapshot of insertions and balancing work so far. */
  stats(): Statistics {
    return {
      insertions: this.insertions,
      rotations: this.rotations,
      recolors: this.recolors,
    };
  }

  private rotateLeft(h: Node): Node {
    const x = h.right!;
    h.right = x.left;
    x.left = h;
    x.red = h.red;
    h.red = true;
    this.rotations++;
    return x;
  }

  private rotateRight(h: Node): Node {
    const x = h.left!;
    h.left = x.right;
    x.right = h;
    x.red = h.red;
    h.red = true;
    this.rotations++;
    return x;
  }

  private insertNode(h: Node | null, v: number): [Node, boolean] {
    if (h === null) {
      return [{ value: v, red: true, left: null, right: null }, true];
    }
    let added = false;
    if (v < h.value) {
      const [left, a] = this.insertNode(h.left, v);
      h.left = left;
      added = a;
    } else if (v > h.value) {
      const [right, a] = this.insertNode(h.right, v);
      h.right = right;
      added = a;
    } else {
      return [h, false];
    }
    let node: Node = h;
    if (isRed(node.right) && !isRed(node.left)) {
      node = this.rotateLeft(node);
    }
    if (isRed(node.left) && isRed(node.left!.left)) {
      node = this.rotateRight(node);
    }
    if (isRed(node.left) && isRed(node.right)) {
      node.red = !node.red;
      node.left!.red = !node.left!.red;
      node.right!.red = !node.right!.red;
      this.recolors += 3;
    }
    return [node, added];
  }

  /** Store unique values. Duplicate insertions are a no-op. */
  insert(v: number): boolean {
    const [root, added] = this.insertNode(this.root, v);
    this.root = root;
    if (isRed(this.root)) {
      this.root.red = false;
      this.recolors++;
    }
    if (added) this.insertions++;
    return added;
  }

  /** Ascending order of every stored integer (new array). */
  values(): number[] {
    const out: number[] = [];
    const walk = (n: Node | null) => {
      if (n === null) return;
      walk(n.left);
      out.push(n.value);
      walk(n.right);
    };
    walk(this.root);
    return out;
  }

  /**
   * Checks ordering and red-black invariants.
   * Returns [blackHeight (incl. root and nil), max non-nil depth].
   */
  validate(): { blackHeight: number; height: number; error?: string } {
    if (isRed(this.root)) {
      return { blackHeight: 0, height: 0, error: "root is red" };
    }
    const check = (
      n: Node | null,
      lo: number | null,
      hi: number | null,
    ): { blackHeight: number; height: number; error?: string } => {
      if (n === null) return { blackHeight: 1, height: 0 };
      if ((lo !== null && n.value <= lo) || (hi !== null && n.value >= hi)) {
        return { blackHeight: 0, height: 0, error: "invalid ordering" };
      }
      if (isRed(n) && (isRed(n.left) || isRed(n.right))) {
        return { blackHeight: 0, height: 0, error: "consecutive red nodes" };
      }
      const left = check(n.left, lo, n.value);
      if (left.error) return left;
      const right = check(n.right, n.value, hi);
      if (right.error) return right;
      if (left.blackHeight !== right.blackHeight) {
        return { blackHeight: 0, height: 0, error: "unequal black heights" };
      }
      let bh = left.blackHeight;
      if (!isRed(n)) bh++;
      return {
        blackHeight: bh,
        height: 1 + Math.max(left.height, right.height),
      };
    };
    return check(this.root, null, null);
  }
}

/**
 * Shuffles unique integers using seed, inserts them, and checks the result.
 * Count must be between 1 and 1,000,000; timings include only the named operation.
 */
export function demo(count: number, seed: number): Result {
  if (count < 1 || count > 1_000_000) {
    throw new Error("count must be between 1 and 1000000");
  }
  const order = permute(count, seed);
  const tree = new Tree();
  const insertStart = performance.now();
  for (const v of order) tree.insert(v);
  const insertTimeMs = performance.now() - insertStart;
  const traverseStart = performance.now();
  const values = tree.values();
  const traversalTimeMs = performance.now() - traverseStart;
  const { blackHeight, height, error } = tree.validate();
  const validationErrors: string[] = [];
  if (error) validationErrors.push(error);
  let sortedOutput = true;
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1]! >= values[i]!) sortedOutput = false;
  }
  const n = Math.min(10, count);
  const stats = tree.stats();
  return {
    elementCount: count,
    inserted: stats.insertions,
    insertTimeMs,
    traversalTimeMs,
    treeHeight: height,
    rotations: stats.rotations,
    recolors: stats.recolors,
    validRedBlackTree: error === undefined,
    blackHeight,
    sortedOutput,
    firstValues: values.slice(0, n),
    lastValues: values.slice(count - n),
    validationErrors,
  };
}
