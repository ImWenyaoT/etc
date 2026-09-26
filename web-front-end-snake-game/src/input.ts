import type { InputAction } from './game/types'

type ActionHandler = (action: InputAction) => void

const keyActionMap: Record<string, InputAction> = {
  ArrowUp: 'move-up',
  w: 'move-up',
  W: 'move-up',
  ArrowDown: 'move-down',
  s: 'move-down',
  S: 'move-down',
  ArrowLeft: 'move-left',
  a: 'move-left',
  A: 'move-left',
  ArrowRight: 'move-right',
  d: 'move-right',
  D: 'move-right',
  ' ': 'pause',
  Enter: 'start',
}

export function bindKeyboardControls(onAction: ActionHandler): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    const action = keyActionMap[event.key]

    if (!action) {
      return
    }

    event.preventDefault()
    onAction(action)
  }

  window.addEventListener('keydown', handleKeyDown)

  return () => window.removeEventListener('keydown', handleKeyDown)
}

export function bindButtonControls(root: Document, onAction: ActionHandler): () => void {
  const controls = [
    { selector: '#start-button', action: 'start' },
    { selector: '#pause-button', action: 'pause' },
    { selector: '#restart-button', action: 'restart' },
  ] satisfies Array<{ selector: string; action: InputAction }>

  const buttonHandlers = controls.map(({ selector, action }) => {
    const button = root.querySelector<HTMLButtonElement>(selector)
    const handler = () => onAction(action)

    button?.addEventListener('click', handler)

    return () => button?.removeEventListener('click', handler)
  })

  const touchButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-action]'))
  const touchHandlers = touchButtons.map((button) => {
    const action = button.dataset.action as InputAction
    const handler = () => onAction(action)

    button.addEventListener('click', handler)

    return () => button.removeEventListener('click', handler)
  })

  return () => {
    buttonHandlers.forEach((removeHandler) => removeHandler())
    touchHandlers.forEach((removeHandler) => removeHandler())
  }
}
