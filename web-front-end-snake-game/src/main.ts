import './styles.css'
import { defaultGameConfig } from './game/config'
import { loadBestScore, saveBestScore } from './game/highScore'
import { createInitialState, reduceAction, stepGame } from './game/state'
import type { GameState, InputAction } from './game/types'
import { bindButtonControls, bindKeyboardControls } from './input'
import { createCanvasRenderer } from './renderer/canvasRenderer'

const canvas = requireElement<HTMLCanvasElement>('#game-canvas')
const scoreElement = requireElement<HTMLElement>('#score')
const bestScoreElement = requireElement<HTMLElement>('#best-score')
const statusElement = requireElement<HTMLElement>('#status-text')

// Upper bound on a single frame's delta. When the tab is backgrounded rAF pauses,
// so on resume the delta can be seconds; clamping avoids a "spiral of death" where
// the fixed-step loop runs dozens of ticks in one frame and the snake jumps/dies.
const maxFrameDeltaMs = 250

let state = createInitialState(defaultGameConfig, loadBestScore())
let actionQueue: InputAction[] = []
let lastFrameTime = performance.now()
let accumulator = 0
let persistedBestScore = state.bestScore

const renderer = createCanvasRenderer(canvas, defaultGameConfig)

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)

  if (!element) {
    throw new Error(`Required element is missing: ${selector}`)
  }

  return element
}

function queueAction(action: InputAction): void {
  actionQueue.push(action)
}

function flushActions(currentState: GameState): GameState {
  const nextState = actionQueue.reduce(
    (reducedState, action) => reduceAction(reducedState, action, defaultGameConfig),
    currentState,
  )

  actionQueue = []

  return nextState
}

function renderHud(currentState: GameState): void {
  scoreElement.textContent = String(currentState.score)
  bestScoreElement.textContent = String(currentState.bestScore)
  statusElement.textContent = getStatusText(currentState)
}

function getStatusText(currentState: GameState): string {
  if (currentState.status === 'idle') {
    return '按 Start 开始'
  }

  if (currentState.status === 'paused') {
    return '已暂停'
  }

  if (currentState.status === 'game-over') {
    return '游戏结束，按 Restart 再来'
  }

  if (currentState.event.type === 'ate-food') {
    return 'Nice bite'
  }

  return '运行中'
}

function gameLoop(frameTime: number): void {
  const delta = Math.min(frameTime - lastFrameTime, maxFrameDeltaMs)
  lastFrameTime = frameTime
  accumulator += delta

  state = flushActions(state)

  while (accumulator >= defaultGameConfig.tickMs) {
    state = stepGame(state, defaultGameConfig)
    accumulator -= defaultGameConfig.tickMs
  }

  // Persist only when the best score actually changes, not every frame.
  if (state.bestScore !== persistedBestScore) {
    saveBestScore(state.bestScore)
    persistedBestScore = state.bestScore
  }

  renderer.render(state)
  renderHud(state)

  window.requestAnimationFrame(gameLoop)
}

bindKeyboardControls(queueAction)
bindButtonControls(document, queueAction)
renderer.render(state)
renderHud(state)
window.requestAnimationFrame(gameLoop)
