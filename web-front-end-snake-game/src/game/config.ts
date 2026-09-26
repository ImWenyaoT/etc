import type { GameConfig } from './types'

export const defaultGameConfig: GameConfig = {
  gridSize: 24,
  initialLength: 4,
  initialDirection: 'right',
  tickMs: 110,
  pointsPerFood: 10,
  startSeed: 314159,
}
