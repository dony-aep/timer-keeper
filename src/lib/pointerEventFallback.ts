/**
 * CEP 11 on macOS (After Effects 2022, Chromium 88) exposes `PointerEvent` but never
 * dispatches pointer events from real mouse input: only mouse events reach the DOM.
 * react-aria's usePress takes the pointer path whenever `PointerEvent` exists (its mouse
 * path only ships in test builds), so every Button, Tab and ListBox item ignores clicks.
 * This re-emits pointerdown/pointerup/pointermove from mouse events until the engine shows
 * it sends native pointer events itself. pointermove is what react-aria drags (ColorArea,
 * ColorSlider) listen to.
 */
export function installPointerEventFallback(win: Window & typeof globalThis = window): void {
  if (typeof win.PointerEvent === 'undefined') return

  let nativePointerEvents = false
  win.addEventListener(
    'pointerdown',
    (e) => {
      // Re-emitted events are untrusted, so they never switch the fallback off.
      if (e.isTrusted) nativePointerEvents = true
    },
    true,
  )

  // Capture phase on window runs before the mouse event reaches any element, which keeps
  // the native order: pointerdown before mousedown, pointerup before mouseup.
  const reEmit = (type: 'pointerdown' | 'pointerup' | 'pointermove') => (e: Event) => {
    if (nativePointerEvents || !e.target) return
    const m = e as MouseEvent
    e.target.dispatchEvent(
      new win.PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: m.clientX,
        clientY: m.clientY,
        screenX: m.screenX,
        screenY: m.screenY,
        button: m.button,
        buttons: m.buttons,
        detail: m.detail,
        ctrlKey: m.ctrlKey,
        shiftKey: m.shiftKey,
        altKey: m.altKey,
        metaKey: m.metaKey,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        // react-aria reads a 1x1 pointerdown with zero pressure as a screen-reader click.
        width: 1,
        height: 1,
        pressure: type === 'pointerdown' || (type === 'pointermove' && m.buttons !== 0) ? 0.5 : 0,
      }),
    )
  }
  win.addEventListener('mousedown', reEmit('pointerdown'), true)
  win.addEventListener('mouseup', reEmit('pointerup'), true)
  win.addEventListener('mousemove', reEmit('pointermove'), true)
}
