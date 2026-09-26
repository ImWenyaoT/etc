import { describe, expect, it } from 'vitest'
import { createRandomInsertionOrder } from '../src/random.js'
import { RedBlackTree } from '../src/red-black-tree.js'

const numberComparator = (left: number, right: number): number => left - right
const heightLimit = (size: number): number => 2 * Math.ceil(Math.log2(size + 1))
const seededRandom = (seed: number): (() => number) => {
  let state = seed
  return () => {
    state = (state * 16_807) % 2_147_483_647
    return (state - 1) / 2_147_483_646
  }
}

const buildTree = (values: readonly number[]): RedBlackTree<number> => {
  const tree = new RedBlackTree(numberComparator)
  values.forEach((value) => tree.insert(value))
  return tree
}

const expectValidSortedTree = (values: readonly number[]): void => {
  const tree = buildTree(values)
  const sorted = tree.toArray()
  const validation = tree.validate()

  expect(sorted).toEqual([...values].sort(numberComparator))
  expect(validation.valid).toBe(true)
  expect(validation.errors).toEqual([])
  expect(tree.size()).toBe(values.length)
  if (values.length > 0) {
    expect(tree.height()).toBeLessThanOrEqual(heightLimit(values.length))
  }
}

describe('RedBlackTree', () => {
  it('starts empty and keeps a single-node tree valid', () => {
    const empty = new RedBlackTree(numberComparator)
    expect(empty.toArray()).toEqual([])
    expect(empty.metrics()).toEqual({ rotations: 0, recolors: 0, insertions: 0 })
    expect(empty.validate()).toEqual({ valid: true, blackHeight: 1, errors: [] })

    const one = buildTree([42])
    expect(one.toArray()).toEqual([42])
    expect(one.validate().valid).toBe(true)
  })

  it('sorts mixed values, duplicates, and custom comparators', () => {
    expectValidSortedTree([7, 3, 18, 10, 22, 8, 11, 26])
    expectValidSortedTree([0, -10, 4, -3, 12, 8, -1])
    expectValidSortedTree([5, 1, 5, 3, 1])

    const records = new RedBlackTree<{ id: string; score: number }>(
      (left, right) => left.score - right.score,
    )
    ;[
      { id: 'middle', score: 50 },
      { id: 'low', score: 10 },
      { id: 'high', score: 90 },
      { id: 'also-middle', score: 50 },
    ].forEach((value) => records.insert(value))
    expect(records.toArray().map((value) => value.id)).toEqual([
      'low',
      'middle',
      'also-middle',
      'high',
    ])
  })

  it.each([
    [[1, 2, 3], 1],
    [[3, 2, 1], 1],
    [[3, 1, 2], 2],
    [[1, 3, 2], 2],
  ] as const)('balances triplet %j with %i rotation(s)', (values, rotations) => {
    const tree = buildTree([...values])
    expect(tree.toArray()).toEqual([1, 2, 3])
    expect(tree.height()).toBe(2)
    expect(tree.metrics().rotations).toBe(rotations)
    expect(tree.validate().valid).toBe(true)
  })

  it('keeps invariants on sequential, reverse, mixed, and random workloads', () => {
    expectValidSortedTree(Array.from({ length: 256 }, (_, index) => 255 - index))
    expectValidSortedTree(Array.from({ length: 1_000 }, (_, index) => index))
    expectValidSortedTree([17, 4, 29, 1, 9, 22, 31, 7, 12, 20, 24, 30, 35])

    const heavy = buildTree(Array.from({ length: 128 }, (_, index) => index))
    expect(heavy.metrics().insertions).toBe(128)
    expect(heavy.metrics().rotations).toBeGreaterThan(0)

    const random = createRandomInsertionOrder(10_000, seededRandom(2024))
    expect(createRandomInsertionOrder(10_000, seededRandom(2024))).toEqual(random)
    expectValidSortedTree(random)

    ;[
      [11, 4, 22, 7, 15, 1, 30, 19, 3, 9],
      [Number.MAX_SAFE_INTEGER, -1_000_000, 42, 0, 7_777],
    ].forEach(expectValidSortedTree)
  })
})
