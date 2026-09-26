import { describe, expect, it } from 'vitest'
import { formatMs, time } from '../src/benchmark.js'

describe('time', () => {
  it('returns the operation value and a nonnegative elapsed time', () => {
    const result = time(() => 42)

    expect(result.value).toBe(42)
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0)
  })

  it('propagates operation errors to the caller', () => {
    expect(() =>
      time(() => {
        throw new Error('boom')
      }),
    ).toThrow('boom')
  })
})

describe('formatMs', () => {
  it('formats milliseconds with two decimal places', () => {
    expect(formatMs(0)).toBe('0.00ms')
    expect(formatMs(1.234)).toBe('1.23ms')
    expect(formatMs(1.235)).toBe('1.24ms')
    expect(formatMs(1234.5)).toBe('1234.50ms')
  })
})
