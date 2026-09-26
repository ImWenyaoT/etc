import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bindButtonControls, bindKeyboardControls } from '../src/input'
import type { InputAction } from '../src/game/types'

class FakeButton extends EventTarget {
  dataset: Record<string, string> = {}

  click(): void {
    this.dispatchEvent(new Event('click'))
  }
}

function createKeyEvent(key: string): KeyboardEvent {
  const event = new Event('keydown', { cancelable: true }) as KeyboardEvent
  Object.defineProperty(event, 'key', { value: key })
  return event
}

describe('keyboard controls', () => {
  let keyboardWindow: EventTarget
  let actions: InputAction[]

  beforeEach(() => {
    keyboardWindow = new EventTarget()
    actions = []
    vi.stubGlobal('window', keyboardWindow)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each<[string, InputAction]>([
    ['ArrowUp', 'move-up'],
    ['w', 'move-up'],
    ['ArrowDown', 'move-down'],
    ['s', 'move-down'],
    ['ArrowLeft', 'move-left'],
    ['a', 'move-left'],
    ['ArrowRight', 'move-right'],
    ['d', 'move-right'],
    [' ', 'pause'],
    ['Enter', 'start'],
  ])('maps %s to %s', (key, action) => {
    const unbind = bindKeyboardControls((nextAction) => actions.push(nextAction))
    const event = createKeyEvent(key)

    keyboardWindow.dispatchEvent(event)

    expect(actions).toEqual([action])
    expect(event.defaultPrevented).toBe(true)
    unbind()
  })

  it('ignores unmapped keys and keeps default behavior', () => {
    bindKeyboardControls((action) => actions.push(action))
    const event = createKeyEvent('Escape')

    keyboardWindow.dispatchEvent(event)

    expect(actions).toEqual([])
    expect(event.defaultPrevented).toBe(false)
  })

  it('removes the keyboard listener when unbound', () => {
    const unbind = bindKeyboardControls((action) => actions.push(action))

    unbind()
    keyboardWindow.dispatchEvent(createKeyEvent('ArrowUp'))

    expect(actions).toEqual([])
  })
})

describe('button controls', () => {
  it('maps fixed and data-action buttons to input actions', () => {
    const start = new FakeButton()
    const pause = new FakeButton()
    const restart = new FakeButton()
    const moveUp = new FakeButton()
    const actions: InputAction[] = []
    moveUp.dataset.action = 'move-up'
    const root = {
      querySelector: vi.fn((selector: string) => {
        const buttons: Record<string, FakeButton> = {
          '#start-button': start,
          '#pause-button': pause,
          '#restart-button': restart,
        }
        return buttons[selector] ?? null
      }),
      querySelectorAll: vi.fn(() => [moveUp]),
    } as unknown as Document

    const unbind = bindButtonControls(root, (action) => actions.push(action))

    start.click()
    pause.click()
    restart.click()
    moveUp.click()

    expect(actions).toEqual(['start', 'pause', 'restart', 'move-up'])

    unbind()
    start.click()
    moveUp.click()

    expect(actions).toEqual(['start', 'pause', 'restart', 'move-up'])
  })
})
