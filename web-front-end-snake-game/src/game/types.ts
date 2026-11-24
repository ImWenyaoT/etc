export type Direction = "up" | "down" | "left" | "right";

export type GameStatus = "idle" | "running" | "paused" | "game-over";

export type InputAction =
  | "start"
  | "pause"
  | "restart"
  | "move-up"
  | "move-down"
  | "move-left"
  | "move-right";

export type GameEvent =
  | { type: "none" }
  | { type: "started" }
  | { type: "paused" }
  | { type: "resumed" }
  | { type: "restarted" }
  | { type: "ate-food" }
  | { type: "game-over" };

export interface Point {
  x: number;
  y: number;
}

export interface GameConfig {
  gridSize: number;
  initialLength: number;
  initialDirection: Direction;
  tickMs: number;
  pointsPerFood: number;
  startSeed: number;
}

export interface GameState {
  snake: Point[];
  direction: Direction;
  pendingDirection: Direction;
  food: Point;
  score: number;
  bestScore: number;
  status: GameStatus;
  rngSeed: number;
  event: GameEvent;
}
