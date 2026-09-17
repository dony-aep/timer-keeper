import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { withTimeout } from './withTimeout'

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the value when the promise settles in time', async () => {
    const onTimeout = vi.fn()
    const result = withTimeout(Promise.resolve('ok'), 60000, 'fallback', onTimeout)
    await expect(result).resolves.toBe('ok')
    vi.advanceTimersByTime(60000)
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('returns the fallback when the promise never settles', async () => {
    const onTimeout = vi.fn()
    const result = withTimeout(new Promise<string>(() => {}), 60000, 'fallback', onTimeout)
    vi.advanceTimersByTime(60000)
    await expect(result).resolves.toBe('fallback')
    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('ignores a value that arrives after the limit', async () => {
    let resolveLate: (value: string) => void = () => {}
    const late = new Promise<string>((resolve) => {
      resolveLate = resolve
    })
    const result = withTimeout(late, 1000, 'fallback')
    vi.advanceTimersByTime(1000)
    resolveLate('late')
    await expect(result).resolves.toBe('fallback')
  })

  it('turns a rejection into the fallback', async () => {
    const result = withTimeout(Promise.reject(new Error('boom')), 1000, 'fallback')
    await expect(result).resolves.toBe('fallback')
  })

  it('does not call onTimeout once the value arrived', async () => {
    const onTimeout = vi.fn()
    let resolveSoon: (value: string) => void = () => {}
    const soon = new Promise<string>((resolve) => {
      resolveSoon = resolve
    })
    const result = withTimeout(soon, 1000, 'fallback', onTimeout)
    resolveSoon('ok')
    await expect(result).resolves.toBe('ok')
    vi.advanceTimersByTime(5000)
    expect(onTimeout).not.toHaveBeenCalled()
  })
})
