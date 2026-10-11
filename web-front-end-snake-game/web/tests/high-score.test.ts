import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadBestScore, saveBestScore } from '../src/game/highScore'

function createMemoryStorage() {
  const values = new Map<string, string>()

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value)
    }),
  }
}

describe('high score storage', () => {
  let storage: ReturnType<typeof createMemoryStorage>

  beforeEach(() => {
    storage = createMemoryStorage()
    vi.stubGlobal('window', {
      localStorage: storage,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns zero when no score has been saved', () => {
    expect(loadBestScore()).toBe(0)
    expect(storage.getItem).toHaveBeenCalledWith('snake.bestScore')
  })

  it('loads a finite saved score', () => {
    storage.setItem('snake.bestScore', '120')

    expect(loadBestScore()).toBe(120)
  })

  it.each(['NaN', 'Infinity', 'not-a-number'])(
    'falls back to zero for dirty value %s',
    (stored) => {
      storage.setItem('snake.bestScore', stored)

      expect(loadBestScore()).toBe(0)
    },
  )

  it('saves the score as a string', () => {
    saveBestScore(250)

    expect(storage.setItem).toHaveBeenCalledWith('snake.bestScore', '250')
    expect(loadBestScore()).toBe(250)
  })

  it('survives localStorage being unavailable (e.g. private mode)', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: vi.fn(() => {
          throw new Error('SecurityError')
        }),
        setItem: vi.fn(() => {
          throw new Error('SecurityError')
        }),
      },
    })

    expect(loadBestScore()).toBe(0)
    expect(() => saveBestScore(99)).not.toThrow()
  })
})
