import { describe, expect, it } from 'vitest'
import { createRandomInsertionOrder, range, shuffle } from '../src/random.js'

const seededRandom = (seed: number): (() => number) => {
  let state = seed

  return () => {
    state = (state * 16_807) % 2_147_483_647
    return (state - 1) / 2_147_483_646
  }
}

describe('range', () => {
  it('builds a zero-based ordered range and treats sub-one counts as empty', () => {
    expect(range(0)).toEqual([])
    expect(range(0.5)).toEqual([])
    expect(range(5)).toEqual([0, 1, 2, 3, 4])
  })
})

describe('shuffle', () => {
  it('does not mutate the source array', () => {
    const source = [1, 2, 3, 4, 5]
    const shuffled = shuffle(source, seededRandom(123))

    expect(source).toEqual([1, 2, 3, 4, 5])
    expect(shuffled).not.toBe(source)
  })

  it('keeps every original value exactly once', () => {
    const source = range(100)
    const shuffled = shuffle(source, seededRandom(456))

    expect([...shuffled].sort((left, right) => left - right)).toEqual(source)
  })

  it('is repeatable when supplied the same random source', () => {
    const source = range(20)

    expect(shuffle(source, seededRandom(42))).toEqual(shuffle(source, seededRandom(42)))
  })
})

describe('createRandomInsertionOrder', () => {
  it('creates a permutation with the requested size', () => {
    expect(createRandomInsertionOrder(0)).toEqual([])

    const values = createRandomInsertionOrder(1_000)

    expect(values).toHaveLength(1_000)
    expect([...values].sort((left, right) => left - right)).toEqual(range(1_000))
  })
})
