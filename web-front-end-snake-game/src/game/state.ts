import { nextRandom } from './random'
import type { Direction, GameConfig, GameState, GameStatus, InputAction, Point } from './types'

const directionVectors: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

type ActionHandler = (state: GameState, config: GameConfig) => GameState

interface StatusTransition {
  status: GameStatus
  event: 'started' | 'paused' | 'resumed'
  reset?: true
}

const startTransitions = {
  idle: { status: 'running', event: 'started', reset: true },
  paused: { status: 'running', event: 'resumed' },
  'game-over': { status: 'running', event: 'started', reset: true },
} satisfies Partial<Record<GameStatus, StatusTransition>>

const pauseTransitions = {
  running: { status: 'paused', event: 'paused' },
  paused: { status: 'running', event: 'resumed' },
} satisfies Partial<Record<GameStatus, StatusTransition>>

const actionHandlers = {
  start: (state, config) => applyStatusTransition(state, config, startTransitions),
  pause: (state, config) => applyStatusTransition(state, config, pauseTransitions),
  restart: (state, config) => ({
    ...createInitialState(config, state.bestScore),
    status: 'running',
    event: { type: 'restarted' },
  }),
  'move-up': (state) => queueDirection(state, 'up'),
  'move-down': (state) => queueDirection(state, 'down'),
  'move-left': (state) => queueDirection(state, 'left'),
  'move-right': (state) => queueDirection(state, 'right'),
} satisfies Record<InputAction, ActionHandler>

export function createInitialState(config: GameConfig, bestScore = 0): GameState {
  const snake = createInitialSnake(config)
  const foodPlacement = placeFood(snake, config.gridSize, config.startSeed)
  return {
    snake,
    direction: config.initialDirection,
    pendingDirection: config.initialDirection,
    food: foodPlacement.food,
    score: 0,
    bestScore,
    status: 'idle',
    rngSeed: foodPlacement.seed,
    event: { type: 'none' },
  }
}

export function reduceAction(state: GameState, action: InputAction, config: GameConfig): GameState {
  return actionHandlers[action](state, config)
}

function applyStatusTransition(
  state: GameState,
  config: GameConfig,
  transitions: Partial<Record<GameStatus, StatusTransition>>,
): GameState {
  const transition = transitions[state.status]
  if (!transition) return state
  const base = transition.reset ? createInitialState(config, state.bestScore) : state
  return { ...base, status: transition.status, event: { type: transition.event } }
}

function queueDirection(state: GameState, nextDirection: Direction): GameState {
  if (state.status === 'game-over' || isOppositeDirection(state.direction, nextDirection)) {
    return state
  }
  return { ...state, pendingDirection: nextDirection, event: { type: 'none' } }
}

export function stepGame(state: GameState, config: GameConfig): GameState {
  if (state.status !== 'running') return { ...state, event: { type: 'none' } }

  const direction = state.pendingDirection
  const vector = directionVectors[direction]
  const head = state.snake[0]
  const nextHead = { x: head.x + vector.x, y: head.y + vector.y }
  const ateFood = pointsAreEqual(nextHead, state.food)
  const nextBody = ateFood ? state.snake : state.snake.slice(0, -1)

  if (isOutsideBoard(nextHead, config.gridSize) || pointIsOnSnake(nextHead, nextBody)) {
    return {
      ...state,
      direction,
      pendingDirection: direction,
      status: 'game-over',
      bestScore: Math.max(state.bestScore, state.score),
      event: { type: 'game-over' },
    }
  }

  const nextSnake = [nextHead, ...nextBody]
  if (!ateFood) {
    return {
      ...state,
      snake: nextSnake,
      direction,
      pendingDirection: direction,
      event: { type: 'none' },
    }
  }

  const nextScore = state.score + config.pointsPerFood
  const foodPlacement = placeFood(nextSnake, config.gridSize, state.rngSeed)
  return {
    ...state,
    snake: nextSnake,
    direction,
    pendingDirection: direction,
    food: foodPlacement.food,
    score: nextScore,
    bestScore: Math.max(state.bestScore, nextScore),
    rngSeed: foodPlacement.seed,
    event: { type: 'ate-food' },
  }
}

export const isOppositeDirection = (current: Direction, next: Direction) => {
  const currentVector = directionVectors[current]
  const nextVector = directionVectors[next]
  return currentVector.x + nextVector.x === 0 && currentVector.y + nextVector.y === 0
}

export const pointsAreEqual = (a: Point, b: Point) => a.x === b.x && a.y === b.y

export const isOutsideBoard = (point: Point, gridSize: number) =>
  point.x < 0 || point.y < 0 || point.x >= gridSize || point.y >= gridSize

export const pointIsOnSnake = (point: Point, snake: Point[]) =>
  snake.some((part) => pointsAreEqual(part, point))

function createInitialSnake(config: GameConfig): Point[] {
  const center = Math.floor(config.gridSize / 2)
  return Array.from({ length: config.initialLength }, (_, index) => ({
    x: center - index,
    y: center,
  }))
}

function placeFood(snake: Point[], gridSize: number, seed: number): { food: Point; seed: number } {
  const occupied = new Set(snake.map((point) => `${point.x},${point.y}`))
  let currentSeed = seed
  if (occupied.size >= gridSize * gridSize) return { food: snake[0], seed: currentSeed }

  for (let attempt = 0; attempt < gridSize * gridSize * 2; attempt += 1) {
    const random = nextRandom(currentSeed)
    currentSeed = random.seed
    const index = Math.floor(random.value * gridSize * gridSize)
    const food = { x: index % gridSize, y: Math.floor(index / gridSize) }
    if (!occupied.has(`${food.x},${food.y}`)) return { food, seed: currentSeed }
  }

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      if (!occupied.has(`${x},${y}`)) return { food: { x, y }, seed: currentSeed }
    }
  }
  return { food: snake[0], seed: currentSeed }
}
