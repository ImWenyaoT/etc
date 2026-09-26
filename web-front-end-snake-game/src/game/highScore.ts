const storageKey = 'snake.bestScore'

export function loadBestScore(): number {
  try {
    const storedScore = window.localStorage.getItem(storageKey)
    const parsedScore = Number(storedScore)

    return Number.isSafeInteger(parsedScore) && parsedScore >= 0 ? parsedScore : 0
  } catch {
    return 0
  }
}

export function saveBestScore(score: number): void {
  try {
    window.localStorage.setItem(storageKey, String(score))
  } catch {
    // 存储被禁用时忽略，不影响游戏进行。
  }
}
