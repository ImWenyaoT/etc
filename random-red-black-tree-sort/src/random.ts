export const range = (count: number): number[] => Array.from({ length: count }, (_, index) => index)

export const shuffle = <T>(values: readonly T[], random = Math.random): T[] => {
  const shuffled = [...values]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = shuffled[index] as T
    const swap = shuffled[swapIndex] as T

    shuffled[index] = swap
    shuffled[swapIndex] = current
  }

  return shuffled
}

export const createRandomInsertionOrder = (count: number, random = Math.random): number[] =>
  shuffle(range(count), random)
