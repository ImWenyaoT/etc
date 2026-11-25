import { useCallback, useEffect, useRef, useState } from "react";
import { defaultGameConfig as config } from "./game/config";
import { createInitialState, reduceAction, stepGame } from "./game/state";
import { loadBestScore, saveBestScore } from "./game/highScore";
import { bindKeyboardControls } from "./input";
import { createCanvasRenderer } from "./renderer/canvasRenderer";
import type { InputAction, GameState } from "./game/types";
export function useSnakeGame() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState(() =>
    createInitialState(config, loadBestScore()),
  );
  const state = useRef(hud);
  const publish = useCallback((next: GameState) => {
    const previous = state.current;
    state.current = next;
    if (
      next.score !== previous.score ||
      next.bestScore !== previous.bestScore ||
      next.status !== previous.status
    )
      setHud(next);
  }, []);
  const act = useCallback(
    (action: InputAction) =>
      publish(reduceAction(state.current, action, config)),
    [publish],
  );
  useEffect(() => {
    const renderer = createCanvasRenderer(canvas.current!, config);
    let last = performance.now(),
      acc = 0,
      frame = 0;
    const unbind = bindKeyboardControls(act);
    const pause = () => {
      if (document.hidden && state.current.status === "running") act("pause");
    };
    document.addEventListener("visibilitychange", pause);
    const loop = (now: number) => {
      acc += Math.min(now - last, 250);
      last = now;
      while (acc >= config.tickMs) {
        const next = stepGame(state.current, config);
        if (next.bestScore !== state.current.bestScore)
          saveBestScore(next.bestScore);
        publish(next);
        acc -= config.tickMs;
      }
      renderer.render(state.current);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      unbind();
      renderer.destroy();
      document.removeEventListener("visibilitychange", pause);
    };
  }, [act, publish]);
  return { canvas, hud, act };
}
