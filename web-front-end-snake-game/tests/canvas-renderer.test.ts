import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultGameConfig } from '../src/game/config'
import { createInitialState } from '../src/game/state'
import type { GameStatus } from '../src/game/types'
import { createCanvasRenderer } from '../src/renderer/canvasRenderer'

function createMockContext() {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    roundRect: vi.fn(),
    setTransform: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    shadowColor: '',
    shadowBlur: 0,
  }
}

function createMockCanvas(context: unknown): HTMLCanvasElement {
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    getBoundingClientRect: vi.fn(() => ({ width: 480 })),
  } as unknown as HTMLCanvasElement
}

function stateWithStatus(status: GameStatus) {
  return { ...createInitialState(defaultGameConfig), status }
}

describe('createCanvasRenderer', () => {
  let addEventListener: ReturnType<typeof vi.fn>
  let removeEventListener: ReturnType<typeof vi.fn>

  beforeEach(() => {
    addEventListener = vi.fn()
    removeEventListener = vi.fn()
    vi.stubGlobal('window', { devicePixelRatio: 1, addEventListener, removeEventListener })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws when the 2D context is unavailable', () => {
    expect(() => createCanvasRenderer(createMockCanvas(null), defaultGameConfig)).toThrow(
      'Canvas rendering context is not available',
    )
  })

  it('sizes the canvas and registers a resize listener on creation', () => {
    const context = createMockContext()
    const canvas = createMockCanvas(context)

    createCanvasRenderer(canvas, defaultGameConfig)

    expect(context.setTransform).toHaveBeenCalledTimes(1)
    expect(canvas.width).toBe(480)
    expect(addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('draws background, food, and every snake segment while running', () => {
    const context = createMockContext()
    const renderer = createCanvasRenderer(createMockCanvas(context), defaultGameConfig)
    const state = stateWithStatus('running')

    renderer.render(state)

    expect(context.clearRect).toHaveBeenCalledTimes(1)
    // 无覆盖层时只画一次背景矩形。
    expect(context.fillRect).toHaveBeenCalledTimes(1)
    // 食物用一个圆。
    expect(context.arc).toHaveBeenCalledTimes(1)
    // 每段蛇身画一个圆角格子。
    expect(context.roundRect).toHaveBeenCalledTimes(state.snake.length)
  })

  it('draws paused and game-over overlays on top of the board', () => {
    const pausedContext = createMockContext()
    const overContext = createMockContext()
    const pausedRenderer = createCanvasRenderer(createMockCanvas(pausedContext), defaultGameConfig)
    const overRenderer = createCanvasRenderer(createMockCanvas(overContext), defaultGameConfig)

    pausedRenderer.render(stateWithStatus('paused'))
    overRenderer.render(stateWithStatus('game-over'))

    expect(pausedContext.fillRect).toHaveBeenCalledTimes(2)
    expect(overContext.fillRect).toHaveBeenCalledTimes(2)
  })

  it('removes the resize listener on destroy', () => {
    const context = createMockContext()
    const renderer = createCanvasRenderer(createMockCanvas(context), defaultGameConfig)
    const handler = addEventListener.mock.calls[0]?.[1]

    renderer.destroy()

    expect(removeEventListener).toHaveBeenCalledWith('resize', handler)
  })
})
