import { describe, expect, it } from 'vitest'
import { defaultGameConfig } from '../src/game/config'
import {
  createInitialState,
  isOppositeDirection,
  isOutsideBoard,
  pointIsOnSnake,
  pointsAreEqual,
  reduceAction,
  stepGame,
} from '../src/game/state'
import type { Direction, GameConfig, GameState, Point } from '../src/game/types'

const testConfig: GameConfig = {
  ...defaultGameConfig,
  gridSize: 8,
  initialLength: 3,
  tickMs: 100,
  pointsPerFood: 10,
  startSeed: 7,
}

function buildState(overrides: Partial<GameState> = {}): GameState {
  return {
    snake: [
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
    ],
    direction: 'right',
    pendingDirection: 'right',
    food: { x: 6, y: 6 },
    score: 0,
    bestScore: 0,
    status: 'running',
    rngSeed: 123,
    event: { type: 'none' },
    ...overrides,
  }
}

describe('game state', () => {
  it('boots idle, turns legally, and manages pause/restart', () => {
    const idle = createInitialState(testConfig, 40)
    expect(idle.status).toBe('idle')
    expect(idle.snake).toHaveLength(3)
    expect(idle.bestScore).toBe(40)

    const running = reduceAction(idle, 'start', testConfig)
    const paused = reduceAction(running, 'pause', testConfig)
    const resumed = reduceAction(paused, 'pause', testConfig)
    expect(running.status).toBe('running')
    expect(paused.status).toBe('paused')
    expect(resumed.status).toBe('running')

    const turned = reduceAction(buildState(), 'move-up', testConfig)
    const reversed = reduceAction(buildState(), 'move-left', testConfig)
    expect(turned.pendingDirection).toBe('up')
    expect(reversed.pendingDirection).toBe('right')

    const over = buildState({ status: 'game-over', score: 30, bestScore: 50 })
    expect(reduceAction(over, 'move-up', testConfig)).toBe(over)
    const restarted = reduceAction(over, 'restart', testConfig)
    expect(restarted.status).toBe('running')
    expect(restarted.score).toBe(0)
    expect(restarted.bestScore).toBe(50)
  })

  it.each<[Direction, Direction]>([
    ['up', 'down'],
    ['down', 'up'],
    ['left', 'right'],
    ['right', 'left'],
  ])('detects %s/%s as opposite', (current, next) => {
    expect(isOppositeDirection(current, next)).toBe(true)
  })

  it('steps forward, turns, eats, and ends on wall/self collisions', () => {
    expect(stepGame(buildState(), testConfig).snake[0]).toEqual({ x: 4, y: 3 })

    const turned = stepGame(reduceAction(buildState(), 'move-up', testConfig), testConfig)
    expect(turned.direction).toBe('up')
    expect(turned.snake[0]).toEqual({ x: 3, y: 2 })

    const ate = stepGame(buildState({ food: { x: 4, y: 3 }, bestScore: 50 }), testConfig)
    expect(ate.snake).toHaveLength(4)
    expect(ate.score).toBe(10)
    expect(ate.bestScore).toBe(50)
    expect(ate.event).toEqual({ type: 'ate-food' })

    const wall = stepGame(
      buildState({
        snake: [
          { x: 7, y: 3 },
          { x: 6, y: 3 },
          { x: 5, y: 3 },
        ],
        score: 20,
      }),
      testConfig,
    )
    expect(wall.status).toBe('game-over')
    expect(wall.bestScore).toBe(20)

    const selfHit = stepGame(
      buildState({
        snake: [
          { x: 3, y: 3 },
          { x: 3, y: 4 },
          { x: 2, y: 4 },
          { x: 2, y: 3 },
          { x: 3, y: 3 },
        ],
        direction: 'up',
        pendingDirection: 'down',
      }),
      testConfig,
    )
    expect(selfHit.status).toBe('game-over')

    expect(stepGame(buildState({ status: 'paused' }), testConfig).status).toBe('paused')
  })

  it('allows moving into the vacated tail and fills food on a full board', () => {
    const intoTail = stepGame(
      buildState({
        snake: [
          { x: 3, y: 3 },
          { x: 3, y: 4 },
          { x: 2, y: 4 },
          { x: 2, y: 3 },
        ],
        direction: 'up',
        pendingDirection: 'left',
        food: { x: 7, y: 7 },
      }),
      testConfig,
    )
    expect(intoTail.status).toBe('running')
    expect(intoTail.snake[0]).toEqual({ x: 2, y: 3 })

    const full = stepGame(
      buildState({
        snake: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 },
        ],
        food: { x: 1, y: 0 },
      }),
      { ...testConfig, gridSize: 2, initialLength: 1 },
    )
    expect(full.snake).toHaveLength(4)
    expect(full.food).toEqual(full.snake[0])
  })
})

describe('point helpers', () => {
  it('compares points and snake occupancy', () => {
    expect(pointsAreEqual({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true)
    expect(pointsAreEqual({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false)
    expect(
      pointIsOnSnake({ x: 2, y: 1 }, [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ]),
    ).toBe(true)
  })

  it.each<[Point, boolean]>([
    [{ x: 0, y: 0 }, false],
    [{ x: -1, y: 0 }, true],
    [{ x: 8, y: 0 }, true],
  ])('bounds for %j', (point, expected) => {
    expect(isOutsideBoard(point, 8)).toBe(expected)
  })
})
