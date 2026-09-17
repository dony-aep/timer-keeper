import { describe, it, expect } from 'vitest'
import type { HostSnapshot } from '../types/data'
import { nextPollDelay, sameSnapshot } from './polling'

const snap = (overrides: Partial<HostSnapshot> = {}): HostSnapshot => ({
  projectPath: 'C:\\p\\A.aep',
  projectName: 'A.aep',
  unsaved: false,
  converting: false,
  ...overrides,
})

describe('nextPollDelay', () => {
  it('polls every 5 s while the timer runs', () => {
    expect(nextPollDelay(true, 0)).toBe(5000)
  })

  it('polls every 10 s while paused', () => {
    expect(nextPollDelay(false, 0)).toBe(10000)
  })

  it('confirms a missing project one second later', () => {
    expect(nextPollDelay(true, 1)).toBe(1000)
    expect(nextPollDelay(false, 1)).toBe(1000)
  })

  it('goes back to the idle cadence once no project is confirmed', () => {
    expect(nextPollDelay(false, 2)).toBe(10000)
  })

  it('keeps the running cadence after a confirmed teardown', () => {
    expect(nextPollDelay(true, 2)).toBe(5000)
  })
})

describe('sameSnapshot', () => {
  it('compares by content', () => {
    expect(sameSnapshot(snap(), snap())).toBe(true)
  })

  it('detects any field change', () => {
    expect(sameSnapshot(snap(), snap({ projectPath: 'C:\\p\\B.aep' }))).toBe(false)
    expect(sameSnapshot(snap(), snap({ unsaved: true }))).toBe(false)
    expect(sameSnapshot(snap(), snap({ converting: true }))).toBe(false)
  })

  it('handles missing snapshots', () => {
    expect(sameSnapshot(null, null)).toBe(true)
    expect(sameSnapshot(null, snap())).toBe(false)
  })
})
