import { describe, it, expect } from 'vitest'
import { createHostStats, hostCallName, recordCall } from './hostStats'

describe('hostCallName', () => {
  it('extracts the host function name from a namespaced call', () => {
    expect(hostCallName('$.global.TimerKeeper.getSnapshot()')).toBe('getSnapshot')
  })

  it('extracts the name when the call carries arguments', () => {
    expect(hostCallName("$.global.TimerKeeper.saveData('{\"a\":1}')")).toBe('saveData')
  })

  it('returns "other" for scripts outside the namespace', () => {
    expect(hostCallName('app.project.file')).toBe('other')
  })
})

describe('createHostStats / recordCall', () => {
  it('starts empty with the given timestamp', () => {
    expect(createHostStats(123)).toEqual({ since: 123, byName: {} })
  })

  it('creates the entry on the first call', () => {
    const stats = createHostStats(0)
    recordCall(stats, 'getSnapshot', 12, false)
    expect(stats.byName.getSnapshot).toEqual({
      calls: 1,
      totalMs: 12,
      maxMs: 12,
      lastMs: 12,
      empty: 0,
    })
  })

  it('accumulates calls, total, max, last and empty results', () => {
    const stats = createHostStats(0)
    recordCall(stats, 'x', 10, false)
    recordCall(stats, 'x', 30, true)
    recordCall(stats, 'x', 20, false)
    expect(stats.byName.x).toEqual({ calls: 3, totalMs: 60, maxMs: 30, lastMs: 20, empty: 1 })
  })
})
