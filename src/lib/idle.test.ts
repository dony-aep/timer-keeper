import { describe, it, expect } from 'vitest'
import { decideIdle, formatIdleDuration, spanByDay, type IdleInput } from './idle'

const A = 'C:\\p\\A.aep'
const B = 'C:\\p\\B.aep'

const base: IdleInput = {
  idleSeconds: 0,
  thresholdSeconds: 300,
  running: true,
  currentPath: A,
  autoPausedPath: null,
  runSeconds: 3600,
}

describe('decideIdle while running', () => {
  it('does nothing below the threshold', () => {
    expect(decideIdle({ ...base, idleSeconds: 299 })).toEqual({ type: 'none' })
  })

  it('pauses at the threshold and discounts the idle time', () => {
    expect(decideIdle({ ...base, idleSeconds: 305 })).toEqual({ type: 'pause', discountSeconds: 305 })
  })

  it('never discounts more than the timer counted since it started', () => {
    expect(decideIdle({ ...base, idleSeconds: 900, runSeconds: 120 })).toEqual({
      type: 'pause',
      discountSeconds: 120,
    })
  })

  it('does nothing without a reading, however long the timer has run', () => {
    expect(decideIdle({ ...base, idleSeconds: null })).toEqual({ type: 'none' })
  })

  it('does nothing when the feature is off', () => {
    expect(decideIdle({ ...base, thresholdSeconds: 0, idleSeconds: 9999 })).toEqual({ type: 'none' })
  })

  it('does nothing without a current project', () => {
    expect(decideIdle({ ...base, currentPath: null, idleSeconds: 9999 })).toEqual({ type: 'none' })
  })
})

describe('decideIdle while paused', () => {
  const paused: IdleInput = { ...base, running: false, autoPausedPath: A }

  it('resumes the auto-paused project on recent activity', () => {
    expect(decideIdle({ ...paused, idleSeconds: 3 })).toEqual({ type: 'resume' })
  })

  it('keeps waiting while there is still no activity', () => {
    expect(decideIdle({ ...paused, idleSeconds: 400 })).toEqual({ type: 'none' })
  })

  it('never resumes after a manual pause', () => {
    expect(decideIdle({ ...paused, autoPausedPath: null, idleSeconds: 0 })).toEqual({ type: 'none' })
  })

  it('forgets the auto-pause when another project is open', () => {
    expect(decideIdle({ ...paused, currentPath: B, idleSeconds: 0 })).toEqual({ type: 'forget' })
    expect(decideIdle({ ...paused, currentPath: null, idleSeconds: 0 })).toEqual({ type: 'forget' })
  })

  it('forgets the auto-pause when the feature is turned off', () => {
    expect(decideIdle({ ...paused, thresholdSeconds: 0, idleSeconds: 0 })).toEqual({ type: 'forget' })
  })

  it('waits for a reading before resuming', () => {
    expect(decideIdle({ ...paused, idleSeconds: null })).toEqual({ type: 'none' })
  })
})

describe('spanByDay', () => {
  it('keeps a span inside one day on that day', () => {
    const end = new Date(2026, 8, 23, 15, 0, 0).getTime()
    expect(spanByDay(end, 300)).toEqual({ '2026-09-23': 300 })
  })

  it('splits a span that crosses midnight', () => {
    const end = new Date(2026, 8, 24, 0, 2, 0).getTime()
    expect(spanByDay(end, 300)).toEqual({ '2026-09-24': 120, '2026-09-23': 180 })
  })

  it('puts a span ending exactly at midnight on the previous day', () => {
    const end = new Date(2026, 8, 24, 0, 0, 0).getTime()
    expect(spanByDay(end, 60)).toEqual({ '2026-09-23': 60 })
  })

  it('returns nothing for zero seconds', () => {
    expect(spanByDay(Date.now(), 0)).toEqual({})
  })
})

describe('formatIdleDuration', () => {
  it('uses minutes, or seconds below a minute', () => {
    expect(formatIdleDuration(300)).toBe('5 min')
    expect(formatIdleDuration(45)).toBe('45 s')
  })
})
