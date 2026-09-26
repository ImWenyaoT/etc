import { describe, expect, it } from 'vitest'
import { formatDemoResult, isSorted, runDemo } from '../src/demo.js'

describe('isSorted', () => {
  it('accepts empty, single-value, and equal adjacent arrays', () => {
    expect(isSorted([])).toBe(true)
    expect(isSorted([1])).toBe(true)
    expect(isSorted([1, 1, 2, 2, 3])).toBe(true)
  })

  it('rejects descending pairs', () => {
    expect(isSorted([1, 3, 2])).toBe(false)
  })
})

describe('runDemo', () => {
  it('returns valid metrics for a small workload', () => {
    const result = runDemo(32)

    expect(result.elementCount).toBe(32)
    expect(result.inserted).toBe(32)
    expect(result.validRedBlackTree).toBe(true)
    expect(result.sortedOutput).toBe(true)
    expect(result.validationErrors).toEqual([])
    expect(result.firstValues).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(result.lastValues).toEqual([22, 23, 24, 25, 26, 27, 28, 29, 30, 31])
  })
})

describe('formatDemoResult', () => {
  it('formats the CLI contract', () => {
    const output = formatDemoResult({
      elementCount: 3,
      inserted: 3,
      insertTimeMs: 1.2,
      traversalTimeMs: 0.4,
      treeHeight: 2,
      rotations: 1,
      recolors: 2,
      validRedBlackTree: true,
      blackHeight: 2,
      sortedOutput: true,
      firstValues: [0, 1, 2],
      lastValues: [0, 1, 2],
      validationErrors: [],
    })

    expect(output).toContain('Red-black tree random insertion sort')
    expect(output).toContain('Elements: 3')
    expect(output).toContain('Insert time: 1.20ms')
    expect(output).toContain('Valid red-black tree: true')
    expect(output).toContain('Sorted output: true')
  })
})
