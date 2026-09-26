import type { GameConfig, GameState } from '../game/types'

const theme = {
  background: '#07110f',
  grid: 'rgba(126, 242, 203, 0.08)',
  snakeHead: '#7ef2cb',
  snakeBody: '#15c986',
  food: '#ff6b5f',
  pausedOverlay: 'rgba(7, 17, 15, 0.58)',
  dangerOverlay: 'rgba(255, 107, 95, 0.18)',
}

export function createCanvasRenderer(canvas: HTMLCanvasElement, config: GameConfig) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas rendering context is not available')

  const resize = () => {
    const css = Math.floor(canvas.getBoundingClientRect().width)
    const dpr = window.devicePixelRatio || 1
    const physical = Math.max(config.gridSize, Math.floor(css * dpr))
    canvas.width = physical
    canvas.height = physical
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  resize()
  window.addEventListener('resize', resize)

  return {
    render(state: GameState) {
      const size = canvas.width / (window.devicePixelRatio || 1)
      const cell = size / config.gridSize
      context.clearRect(0, 0, size, size)
      context.fillStyle = theme.background
      context.fillRect(0, 0, size, size)
      context.strokeStyle = theme.grid
      context.lineWidth = 1
      for (let i = 0; i <= config.gridSize; i += 1) {
        const pos = Math.round(i * cell) + 0.5
        context.beginPath()
        context.moveTo(pos, 0)
        context.lineTo(pos, size)
        context.stroke()
        context.beginPath()
        context.moveTo(0, pos)
        context.lineTo(size, pos)
        context.stroke()
      }
      const foodR = cell * 0.28
      context.save()
      context.shadowColor = theme.food
      context.shadowBlur = 16
      context.fillStyle = theme.food
      context.beginPath()
      context.arc(
        state.food.x * cell + cell / 2,
        state.food.y * cell + cell / 2,
        foodR,
        0,
        Math.PI * 2,
      )
      context.fill()
      context.restore()
      state.snake.forEach((part, index) => {
        const inset = Math.max(3, cell * 0.12)
        const radius = Math.max(4, cell * 0.18)
        context.fillStyle = index === 0 ? theme.snakeHead : theme.snakeBody
        context.beginPath()
        context.roundRect(
          part.x * cell + inset,
          part.y * cell + inset,
          cell - inset * 2,
          cell - inset * 2,
          radius,
        )
        context.fill()
      })
      if (state.status === 'paused' || state.status === 'game-over') {
        context.fillStyle = state.status === 'paused' ? theme.pausedOverlay : theme.dangerOverlay
        context.fillRect(0, 0, size, size)
      }
    },
    destroy() {
      window.removeEventListener('resize', resize)
    },
  }
}
