import type { InputAction } from "./game/types";

type ActionHandler = (action: InputAction) => void;

const keyActionMap: Record<string, InputAction> = {
  ArrowUp: "move-up",
  w: "move-up",
  W: "move-up",
  ArrowDown: "move-down",
  s: "move-down",
  S: "move-down",
  ArrowLeft: "move-left",
  a: "move-left",
  A: "move-left",
  ArrowRight: "move-right",
  d: "move-right",
  D: "move-right",
  " ": "pause",
  Enter: "start",
};

export function bindKeyboardControls(onAction: ActionHandler): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("input,textarea,select,[contenteditable]")
    )
      return;
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("button") &&
      [" ", "Enter"].includes(event.key)
    )
      return;
    const action = keyActionMap[event.key];

    if (!action) {
      return;
    }

    event.preventDefault();
    onAction(action);
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => window.removeEventListener("keydown", handleKeyDown);
}
