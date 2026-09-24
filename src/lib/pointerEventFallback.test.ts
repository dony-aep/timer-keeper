import { describe, it, expect } from 'vitest'
import { installPointerEventFallback } from './pointerEventFallback'

// Node has EventTarget and Event but no DOM. This stub is enough to observe what the
// fallback dispatches. Native (trusted) pointer events cannot be faked from a test.
class FakePointerEvent extends Event {
  constructor(type: string, init: Record<string, unknown>) {
    const { bubbles, cancelable, composed, ...rest } = init
    super(type, { bubbles, cancelable, composed } as EventInit)
    Object.assign(this, rest)
  }
}

function setup() {
  const win = Object.assign(new EventTarget(), { PointerEvent: FakePointerEvent })
  installPointerEventFallback(win as unknown as Window & typeof globalThis)
  const seen: Record<string, unknown>[] = []
  const record = (e: Event) => seen.push(e as unknown as Record<string, unknown>)
  win.addEventListener('pointerdown', record)
  win.addEventListener('pointerup', record)
  win.addEventListener('pointermove', record)
  const mouse = (type: string, props: Record<string, number>) =>
    win.dispatchEvent(Object.assign(new Event(type), props))
  return { seen, mouse }
}

describe('installPointerEventFallback', () => {
  it('re-emits pointerdown with the mouse coordinates and non-zero pressure', () => {
    const { seen, mouse } = setup()
    mouse('mousedown', { clientX: 122, clientY: 186, button: 0, buttons: 1, detail: 1 })
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({
      type: 'pointerdown',
      pointerType: 'mouse',
      clientX: 122,
      clientY: 186,
      button: 0,
      width: 1,
      height: 1,
      pressure: 0.5,
    })
  })

  it('re-emits pointerup with zero pressure', () => {
    const { seen, mouse } = setup()
    mouse('mouseup', { clientX: 5, clientY: 6, button: 0, buttons: 0, detail: 1 })
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ type: 'pointerup', pressure: 0 })
  })

  it('re-emits pointermove so drags (color area, sliders) follow the mouse', () => {
    const { seen, mouse } = setup()
    mouse('mousemove', { clientX: 40, clientY: 50, button: 0, buttons: 1, detail: 0 })
    mouse('mousemove', { clientX: 41, clientY: 50, button: 0, buttons: 0, detail: 0 })
    expect(seen).toHaveLength(2)
    expect(seen[0]).toMatchObject({ type: 'pointermove', clientX: 40, clientY: 50, buttons: 1, pressure: 0.5 })
    expect(seen[1]).toMatchObject({ type: 'pointermove', buttons: 0, pressure: 0 })
  })

  it('keeps re-emitting after its own untrusted pointer events', () => {
    const { seen, mouse } = setup()
    mouse('mousedown', { button: 0, buttons: 1, detail: 1 })
    mouse('mouseup', { button: 0, buttons: 0, detail: 1 })
    mouse('mousedown', { button: 0, buttons: 1, detail: 1 })
    expect(seen.map((e) => e.type)).toEqual(['pointerdown', 'pointerup', 'pointerdown'])
  })
})
