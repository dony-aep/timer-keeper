import { describe, it, expect } from 'vitest'
import type { HostSnapshot } from '../types/data'
import {
  CONVERTED_COPY_MESSAGE,
  reduceSnapshot,
  savedAsNewMessage,
  type SnapshotMachineState,
} from './snapshotMachine'

const idle: SnapshotMachineState = {
  previousPath: null,
  emptyPolls: 0,
  pendingOpenPath: null,
  convertedPending: null,
}

const saved = (path: string, name: string | null = null): HostSnapshot => ({
  projectPath: path,
  projectName: name,
  unsaved: false,
  converting: false,
})

const unsaved = (converting = false): HostSnapshot => ({
  projectPath: null,
  projectName: null,
  unsaved: true,
  converting,
})

const none: HostSnapshot = { projectPath: null, projectName: null, unsaved: false, converting: false }

const totals =
  (map: Record<string, number> = {}) =>
  (path: string) =>
    map[path] ?? 0

const OLD = 'C:\\p\\Old.aep'
const NEW = 'C:\\p\\New.aep'
const B = 'C:\\p\\B.aep'

describe('reduceSnapshot - unsaved project', () => {
  it('pauses and clears the current project', () => {
    const { state, effects } = reduceSnapshot({ ...idle, previousPath: B, emptyPolls: 1 }, unsaved(), totals())
    expect(effects).toEqual([{ type: 'pause' }, { type: 'clearCurrent' }])
    expect(state).toEqual({ ...idle, previousPath: null, emptyPolls: 0 })
  })

  it('treats "unsaved" right after opening from the panel as a converted copy', () => {
    const { state, effects } = reduceSnapshot({ ...idle, pendingOpenPath: OLD }, unsaved(true), totals())
    expect(state.convertedPending).toEqual({ path: OLD, title: 'Old.aep' })
    expect(state.pendingOpenPath).toBeNull()
    expect(effects).toEqual([
      { type: 'pause' },
      { type: 'clearCurrent' },
      { type: 'notify', kind: 'info', message: CONVERTED_COPY_MESSAGE },
    ])
  })

  it('drops the converted label once AE reports a fresh untitled project', () => {
    const converted = { path: OLD, title: 'Old.aep' }
    const { state } = reduceSnapshot({ ...idle, convertedPending: converted }, unsaved(false), totals())
    expect(state.convertedPending).toBeNull()
  })

  it('keeps the converted label while the copy is still converting', () => {
    const converted = { path: OLD, title: 'Old.aep' }
    const { state } = reduceSnapshot({ ...idle, convertedPending: converted }, unsaved(true), totals())
    expect(state.convertedPending).toBe(converted)
  })
})

describe('reduceSnapshot - no project open', () => {
  it('does nothing without previous context', () => {
    const { state, effects } = reduceSnapshot(idle, none, totals())
    expect(state).toBe(idle)
    expect(effects).toEqual([])
  })

  it('tears down only after the confirmation poll', () => {
    const first = reduceSnapshot({ ...idle, previousPath: B }, none, totals())
    expect(first.state.emptyPolls).toBe(1)
    expect(first.effects).toEqual([])

    const second = reduceSnapshot(first.state, none, totals())
    expect(second.state).toEqual({
      previousPath: null,
      emptyPolls: 2,
      pendingOpenPath: null,
      convertedPending: null,
    })
    expect(second.effects).toEqual([{ type: 'pause' }, { type: 'clearCurrent' }])
  })

  it('stays put on later empty polls after tearing down', () => {
    const first = reduceSnapshot({ ...idle, previousPath: B }, none, totals())
    const second = reduceSnapshot(first.state, none, totals())
    const third = reduceSnapshot(second.state, none, totals())
    expect(third.state).toBe(second.state)
    expect(third.state.emptyPolls).toBe(2)
    expect(third.effects).toEqual([])
  })
})

describe('reduceSnapshot - saved project', () => {
  it('leaves the same project untouched', () => {
    const { state, effects } = reduceSnapshot({ ...idle, previousPath: B, emptyPolls: 1 }, saved(B), totals())
    expect(effects).toEqual([])
    expect(state).toEqual({ ...idle, previousPath: B, emptyPolls: 0 })
  })

  it('switches and auto-starts a project that already has time', () => {
    const { state, effects } = reduceSnapshot(idle, saved(B), totals({ [B]: 50 }))
    expect(effects).toEqual([
      { type: 'pause' },
      { type: 'switchProject', path: B, title: 'B.aep', autoStart: true },
    ])
    expect(state.previousPath).toBe(B)
  })

  it('switches but stays paused for a project without time', () => {
    const { effects } = reduceSnapshot(idle, saved(B), totals())
    expect(effects[1]).toEqual({ type: 'switchProject', path: B, title: 'B.aep', autoStart: false })
  })

  it('prefers the project name reported by the host', () => {
    const { effects } = reduceSnapshot(idle, saved(B, 'Nombre.aep'), totals())
    expect(effects[1]).toMatchObject({ type: 'switchProject', title: 'Nombre.aep' })
  })

  it('tells where the old time stays when a converted copy is saved under a new path', () => {
    const converted = { path: OLD, title: 'Old.aep' }
    const { state, effects } = reduceSnapshot(
      { ...idle, convertedPending: converted },
      saved(NEW),
      totals({ [OLD]: 100 }),
    )
    expect(state.convertedPending).toBeNull()
    expect(effects).toEqual([
      { type: 'notify', kind: 'info', message: savedAsNewMessage('Old.aep') },
      { type: 'pause' },
      { type: 'switchProject', path: NEW, title: 'New.aep', autoStart: false },
    ])
  })

  it('resumes silently when the converted copy overwrites the original path', () => {
    const converted = { path: OLD, title: 'Old.aep' }
    const { effects } = reduceSnapshot(
      { ...idle, convertedPending: converted },
      saved(OLD),
      totals({ [OLD]: 100 }),
    )
    expect(effects).toEqual([
      { type: 'pause' },
      { type: 'switchProject', path: OLD, title: 'Old.aep', autoStart: true },
    ])
  })

  it('never mutates its inputs', () => {
    const state = Object.freeze({ ...idle, previousPath: B, convertedPending: Object.freeze({ path: OLD, title: 'Old.aep' }) })
    const snap = Object.freeze(saved(NEW))
    expect(() => reduceSnapshot(state, snap, totals({ [OLD]: 1 }))).not.toThrow()
    expect(state.previousPath).toBe(B)
  })
})
