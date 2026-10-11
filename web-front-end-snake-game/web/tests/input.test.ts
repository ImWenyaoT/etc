import { afterEach, describe, expect, it } from "vitest";
import { bindKeyboardControls } from "../src/input";
import type { InputAction } from "../src/game/types";
afterEach(() => {
  document.body.innerHTML = "";
});
describe("keyboard controls", () => {
  it.each<[string, InputAction]>([
    ["ArrowUp", "move-up"],
    ["w", "move-up"],
    ["ArrowDown", "move-down"],
    ["s", "move-down"],
    ["ArrowLeft", "move-left"],
    ["a", "move-left"],
    ["ArrowRight", "move-right"],
    ["d", "move-right"],
    [" ", "pause"],
    ["Enter", "start"],
  ])("maps %s to %s", (key, action) => {
    const actions: InputAction[] = [];
    const unbind = bindKeyboardControls((a) => actions.push(a));
    const event = new KeyboardEvent("keydown", { key, cancelable: true });
    window.dispatchEvent(event);
    expect(actions).toEqual([action]);
    expect(event.defaultPrevented).toBe(true);
    unbind();
  });
  it("keeps text fields editable", () => {
    const input = document.createElement("input");
    document.body.append(input);
    const actions: InputAction[] = [];
    const unbind = bindKeyboardControls((a) => actions.push(a));
    const event = new KeyboardEvent("keydown", {
      key: "w",
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);
    expect(actions).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
    unbind();
  });
  it("allows direction keys after clicking controls but preserves button activation", () => {
    const button = document.createElement("button");
    document.body.append(button);
    const actions: InputAction[] = [];
    const unbind = bindKeyboardControls((a) => actions.push(a));
    button.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
    );
    button.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    expect(actions).toEqual(["move-up"]);
    unbind();
  });
  it("ignores unknown keys and cleans up its listener", () => {
    const actions: InputAction[] = [];
    const unbind = bindKeyboardControls((a) => actions.push(a));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    unbind();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
    expect(actions).toEqual([]);
  });
});
