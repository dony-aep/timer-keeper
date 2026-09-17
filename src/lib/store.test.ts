import { describe, it, expect } from 'vitest'
import type { StoreV2 } from '../types/data'
import {
  parseStore,
  serializeStore,
  upsertProject,
  creditTime,
  resetProject,
  removeProject,
  totalSeconds,
  todaySeconds,
  projectTotal,
  basename,
  addPending,
  applyPending,
  pendingTotal,
  mergeStores,
} from './store'

describe('parseStore - v2 passthrough', () => {
  it('passes a valid v2 store through with migratedFrom "v2"', () => {
    const input: StoreV2 = {
      version: 2,
      projects: [
        { path: 'C:\\p\\A.aep', title: 'A.aep', totalSeconds: 120, daily: { '2026-07-01': 120 } },
      ],
    }
    const { store, migratedFrom, error } = parseStore(JSON.stringify(input))
    expect(migratedFrom).toBe('v2')
    expect(error).toBeUndefined()
    expect(store.projects).toHaveLength(1)
    expect(store.projects[0]).toEqual(input.projects[0])
  })

  it('sanitizes bad totalSeconds and daily values', () => {
    const raw = JSON.stringify({
      version: 2,
      projects: [
        { path: 'C:\\p\\A.aep', title: 'A.aep', totalSeconds: -5, daily: { d: -1, e: 'x', f: 10 } },
        { path: '', title: 'skip', totalSeconds: 1, daily: {} }, // no path -> dropped
        { title: 'noPath', totalSeconds: 1, daily: {} }, // no path -> dropped
      ],
    })
    const { store } = parseStore(raw)
    expect(store.projects).toHaveLength(1)
    expect(store.projects[0].totalSeconds).toBe(0)
    expect(store.projects[0].daily).toEqual({ f: 10 })
  })

  it('derives a title from the path when missing', () => {
    const raw = JSON.stringify({
      version: 2,
      projects: [{ path: 'C:\\proj\\My Comp.aep', totalSeconds: 5, daily: {} }],
    })
    const { store } = parseStore(raw)
    expect(store.projects[0].title).toBe('My Comp.aep')
  })
})

describe('parseStore - v1 migration', () => {
  it('migrates v1 with "HH:MM:SS" string times', () => {
    const raw = JSON.stringify({
      Projects: [
        { title: 'A.aep', time: '01:00:00', path: 'C:\\proj\\A.aep' },
        { title: 'B.aep', time: '00:00:30', path: 'C:\\proj\\B.aep' },
      ],
    })
    const { store, migratedFrom } = parseStore(raw)
    expect(migratedFrom).toBe('v1')
    expect(store.version).toBe(2)
    expect(store.projects).toHaveLength(2)
    expect(projectTotal(store, 'C:\\proj\\A.aep')).toBe(3600)
    expect(projectTotal(store, 'C:\\proj\\B.aep')).toBe(30)
    expect(store.projects[0].daily).toEqual({})
  })

  it('migrates v1 with legacy numeric times', () => {
    const raw = JSON.stringify({
      Projects: [{ title: 'A.aep', time: 120, path: 'C:\\proj\\A.aep' }],
    })
    const { store, migratedFrom } = parseStore(raw)
    expect(migratedFrom).toBe('v1')
    expect(projectTotal(store, 'C:\\proj\\A.aep')).toBe(120)
  })

  it('sanitizes %20 in paths and derives a title when absent', () => {
    const raw = JSON.stringify({
      Projects: [{ time: '00:00:10', path: 'C:\\my%20proj\\Cool%20File.aep' }],
    })
    const { store } = parseStore(raw)
    expect(store.projects[0].path).toBe('C:\\my proj\\Cool File.aep')
    expect(store.projects[0].title).toBe('Cool File.aep')
  })
})

describe('parseStore - legacy migration', () => {
  it('migrates a legacy { path: seconds } map', () => {
    const raw = JSON.stringify({
      'C:\\proj\\A.aep': 500,
      'C:\\proj\\B.aep': 60,
    })
    const { store, migratedFrom } = parseStore(raw)
    expect(migratedFrom).toBe('legacy')
    expect(store.projects).toHaveLength(2)
    expect(projectTotal(store, 'C:\\proj\\A.aep')).toBe(500)
    expect(store.projects[0].title).toBe('A.aep')
    expect(store.projects[0].daily).toEqual({})
  })

  it('floors and clamps legacy values, skips non-numeric', () => {
    const raw = JSON.stringify({
      'C:\\a.aep': 12.9,
      'C:\\b.aep': -3,
      'C:\\c.aep': 'nope',
    })
    const { store } = parseStore(raw)
    expect(projectTotal(store, 'C:\\a.aep')).toBe(12)
    expect(projectTotal(store, 'C:\\b.aep')).toBe(0)
    expect(store.projects.find((p) => p.path === 'C:\\c.aep')).toBeUndefined()
  })
})

describe('parseStore - empty & corrupt', () => {
  it('treats empty inputs as an empty store', () => {
    for (const raw of ['', '{}', 'false', '   ', null, undefined]) {
      const { store, migratedFrom, error } = parseStore(raw as string)
      expect(migratedFrom).toBe('empty')
      expect(store.projects).toHaveLength(0)
      expect(error).toBeUndefined()
    }
  })

  it('flags corrupt JSON with error and returns empty store', () => {
    const { store, migratedFrom, error } = parseStore('{ this is not json ')
    expect(migratedFrom).toBe('empty')
    expect(error).toBe(true)
    expect(store.projects).toHaveLength(0)
  })

  it('treats an unrecognized object shape as empty', () => {
    const { store, migratedFrom } = parseStore(JSON.stringify({ foo: 'bar', nested: { a: 1 } }))
    expect(migratedFrom).toBe('empty')
    expect(store.projects).toHaveLength(0)
  })
})

describe('serialize / parse round-trip', () => {
  it('round-trips a v2 store', () => {
    const store: StoreV2 = {
      version: 2,
      projects: [
        { path: 'C:\\p\\A.aep', title: 'A.aep', totalSeconds: 3661, daily: { '2026-07-01': 3661 } },
        { path: 'C:\\p\\B.aep', title: 'B.aep', totalSeconds: 0, daily: {} },
      ],
    }
    const json = serializeStore(store)
    expect(json).toContain('    ') // 4-space pretty print
    const { store: back, migratedFrom } = parseStore(json)
    expect(migratedFrom).toBe('v2')
    expect(back).toEqual(store)
  })
})

describe('creditTime', () => {
  const base: StoreV2 = { version: 2, projects: [] }

  it('creates a project and credits total + daily bucket', () => {
    const s = creditTime(base, 'C:\\p\\A.aep', 'A.aep', 100, '2026-07-01')
    expect(projectTotal(s, 'C:\\p\\A.aep')).toBe(100)
    expect(s.projects[0].daily).toEqual({ '2026-07-01': 100 })
  })

  it('accumulates across days into separate buckets', () => {
    let s = creditTime(base, 'C:\\p\\A.aep', 'A.aep', 100, '2026-07-01')
    s = creditTime(s, 'C:\\p\\A.aep', 'A.aep', 50, '2026-07-01')
    s = creditTime(s, 'C:\\p\\A.aep', 'A.aep', 40, '2026-07-02')
    expect(projectTotal(s, 'C:\\p\\A.aep')).toBe(190)
    expect(s.projects[0].daily).toEqual({ '2026-07-01': 150, '2026-07-02': 40 })
    expect(todaySeconds(s, '2026-07-01')).toBe(150)
    expect(todaySeconds(s, '2026-07-02')).toBe(40)
  })

  it('is immutable (does not mutate the input store)', () => {
    const s = creditTime(base, 'C:\\p\\A.aep', 'A.aep', 10, '2026-07-01')
    expect(base.projects).toHaveLength(0)
    expect(s).not.toBe(base)
  })

  it('non-positive credit only ensures the entry exists', () => {
    const s = creditTime(base, 'C:\\p\\A.aep', 'A.aep', 0, '2026-07-01')
    expect(s.projects).toHaveLength(1)
    expect(projectTotal(s, 'C:\\p\\A.aep')).toBe(0)
    expect(s.projects[0].daily).toEqual({})
  })
})

describe('upsert / reset / remove / totals', () => {
  const seed: StoreV2 = {
    version: 2,
    projects: [
      { path: 'C:\\p\\A.aep', title: 'A.aep', totalSeconds: 100, daily: { '2026-07-01': 100 } },
      { path: 'C:\\p\\B.aep', title: 'B.aep', totalSeconds: 40, daily: { '2026-07-01': 40 } },
    ],
  }

  it('upsertProject adds a new project and updates a title', () => {
    const added = upsertProject(seed, 'C:\\p\\C.aep', 'C.aep')
    expect(added.projects).toHaveLength(3)
    const renamed = upsertProject(seed, 'C:\\p\\A.aep', 'Renamed.aep')
    expect(renamed.projects[0].title).toBe('Renamed.aep')
    // No-op when title unchanged -> same reference.
    expect(upsertProject(seed, 'C:\\p\\A.aep', 'A.aep')).toBe(seed)
  })

  it('resetProject zeroes total and daily but keeps the entry', () => {
    const s = resetProject(seed, 'C:\\p\\A.aep')
    expect(s.projects).toHaveLength(2)
    expect(projectTotal(s, 'C:\\p\\A.aep')).toBe(0)
    expect(s.projects[0].daily).toEqual({})
    expect(projectTotal(s, 'C:\\p\\B.aep')).toBe(40)
  })

  it('removeProject drops the entry', () => {
    const s = removeProject(seed, 'C:\\p\\A.aep')
    expect(s.projects).toHaveLength(1)
    expect(s.projects[0].path).toBe('C:\\p\\B.aep')
    // No-op for unknown path -> same reference.
    expect(removeProject(seed, 'C:\\p\\Z.aep')).toBe(seed)
  })

  it('totalSeconds and todaySeconds aggregate across projects', () => {
    expect(totalSeconds(seed)).toBe(140)
    expect(todaySeconds(seed, '2026-07-01')).toBe(140)
    expect(todaySeconds(seed, '2026-07-02')).toBe(0)
  })
})

describe('basename', () => {
  it('extracts the file name from either separator and decodes %20', () => {
    expect(basename('C:\\proj\\A.aep')).toBe('A.aep')
    expect(basename('/Users/x/My Proj/File.aep')).toBe('File.aep')
    expect(basename('C:\\a%20b\\Cool%20File.aep')).toBe('Cool File.aep')
  })
})

describe('pending time', () => {
  it('adds seconds to a day without mutating the input', () => {
    const empty = {}
    const next = addPending(empty, '2026-07-01', 1)
    expect(next).toEqual({ '2026-07-01': 1 })
    expect(empty).toEqual({})
  })

  it('ignores non-positive or non-finite seconds', () => {
    const pending = { '2026-07-01': 3 }
    expect(addPending(pending, '2026-07-01', 0)).toBe(pending)
    expect(addPending(pending, '2026-07-01', -1)).toBe(pending)
    expect(addPending(pending, '2026-07-01', NaN)).toBe(pending)
  })

  it('accumulates within the same day', () => {
    let pending = {}
    for (let i = 0; i < 3; i++) pending = addPending(pending, '2026-07-01', 1)
    expect(pending).toEqual({ '2026-07-01': 3 })
  })

  it('keeps separate days across midnight', () => {
    const pending = addPending(addPending({}, '2026-07-01', 2), '2026-07-02', 3)
    expect(pending).toEqual({ '2026-07-01': 2, '2026-07-02': 3 })
    expect(pendingTotal(pending)).toBe(5)
  })

  it('credits pending time to the project, day by day', () => {
    const seed: StoreV2 = {
      version: 2,
      projects: [
        { path: 'C:\\p\\A.aep', title: 'A.aep', totalSeconds: 100, daily: { '2026-07-01': 100 } },
      ],
    }
    const next = applyPending(seed, 'C:\\p\\A.aep', 'A.aep', { '2026-07-01': 10, '2026-07-02': 5 })
    expect(projectTotal(next, 'C:\\p\\A.aep')).toBe(115)
    expect(next.projects[0].daily).toEqual({ '2026-07-01': 110, '2026-07-02': 5 })
  })

  it('returns the same store when nothing is pending', () => {
    const seed: StoreV2 = { version: 2, projects: [] }
    expect(applyPending(seed, 'C:\\p\\A.aep', 'A.aep', {})).toBe(seed)
  })
})

describe('mergeStores', () => {
  const A = 'C:\\p\\A.aep'
  const B = 'C:\\p\\B.aep'
  const C = 'C:\\p\\C.aep'
  const DAY = '2026-09-16'
  const NEXT = '2026-09-17'
  const entry = (path: string, seconds: number, daily: Record<string, number> = { [DAY]: seconds }, title = basename(path)) => ({
    path,
    title,
    totalSeconds: seconds,
    daily,
  })
  const store = (...projects: ReturnType<typeof entry>[]): StoreV2 => ({ version: 2, projects })
  const base = store(entry(A, 100))

  it('returns the disk contents when nobody changed anything', () => {
    expect(mergeStores(base, base, base)).toEqual(base)
  })

  it('keeps time added only by this instance', () => {
    const merged = mergeStores(base, store(entry(A, 160)), base)
    expect(merged.projects[0]).toEqual(entry(A, 160))
  })

  it('adds the time both instances tracked on the same project', () => {
    const merged = mergeStores(base, store(entry(A, 160)), store(entry(A, 130)))
    expect(merged.projects[0]).toEqual(entry(A, 190))
  })

  it('keeps a project the other instance added', () => {
    const merged = mergeStores(base, base, store(entry(A, 100), entry(B, 40)))
    expect(merged.projects.map((p) => p.path)).toEqual([A, B])
  })

  it('appends a project this instance added', () => {
    const merged = mergeStores(base, store(entry(A, 100), entry(C, 20)), base)
    expect(merged.projects.map((p) => p.path)).toEqual([A, C])
  })

  it('respects a removal by the other instance when we did not touch the project', () => {
    expect(mergeStores(base, base, store()).projects).toEqual([])
  })

  it('keeps our entry when the other instance removed it but we tracked time', () => {
    const merged = mergeStores(base, store(entry(A, 160)), store())
    expect(merged.projects).toEqual([entry(A, 160)])
  })

  it('respects our removal when the other instance did not touch the project', () => {
    expect(mergeStores(base, store(), base).projects).toEqual([])
  })

  it('keeps time the other instance added after our reset', () => {
    const merged = mergeStores(base, store(entry(A, 0, {})), store(entry(A, 130)))
    expect(merged.projects[0]).toEqual(entry(A, 30))
  })

  it('merges time tracked on different days', () => {
    const merged = mergeStores(
      base,
      store(entry(A, 110, { [DAY]: 110 })),
      store(entry(A, 105, { [DAY]: 100, [NEXT]: 5 })),
    )
    expect(merged.projects[0]).toEqual(entry(A, 115, { [DAY]: 110, [NEXT]: 5 }))
  })

  it('keeps our rename and otherwise the disk title', () => {
    const renamed = mergeStores(base, store(entry(A, 100, { [DAY]: 100 }, 'Renamed.aep')), base)
    expect(renamed.projects[0].title).toBe('Renamed.aep')
    const theirs = mergeStores(base, base, store(entry(A, 100, { [DAY]: 100 }, 'Theirs.aep')))
    expect(theirs.projects[0].title).toBe('Theirs.aep')
  })

  it('drops floating point leftovers', () => {
    const b = store(entry(A, 0.3, { [DAY]: 0.3 }))
    const merged = mergeStores(b, store(entry(A, 0.1 + 0.2, { [DAY]: 0.1 + 0.2 })), b)
    expect(merged.projects[0].daily).toEqual({ [DAY]: 0.3 })
  })

  it('does not mutate its inputs', () => {
    const ours = store(entry(A, 160))
    const disk = store(entry(A, 130), entry(B, 40))
    const snapshot = JSON.stringify([base, ours, disk])
    mergeStores(base, ours, disk)
    expect(JSON.stringify([base, ours, disk])).toBe(snapshot)
  })
})
