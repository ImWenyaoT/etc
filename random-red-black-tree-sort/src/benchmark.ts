export interface TimedResult<T> {
  readonly value: T
  readonly elapsedMs: number
}

export const time = <T>(operation: () => T): TimedResult<T> => {
  const start = performance.now()
  const value = operation()
  const elapsedMs = performance.now() - start

  return {
    value,
    elapsedMs,
  }
}

export const formatMs = (elapsedMs: number): string => `${elapsedMs.toFixed(2)}ms`
