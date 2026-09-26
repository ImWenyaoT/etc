# Architecture

- `src/game/state.ts`：不可变 reducer（移动、吃食物、撞墙/自撞、暂停）。
- `src/renderer/canvasRenderer.ts`：只读状态绘制。
- `src/input.ts`：键盘与触控按钮映射到 `InputAction`。
- 最高分写入 `localStorage`（隐私模式失败时静默降级）。
- Lint/format：`oxlint` + `oxfmt`。
