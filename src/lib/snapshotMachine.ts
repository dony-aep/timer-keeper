/**
 * Máquina de estados del sondeo al host, sin React ni CEP para poder testearla: decide
 * cuándo el timer se pausa, cambia de proyecto o arranca solo. TimerContext aplica los
 * efectos devueltos en orden.
 */

import type { HostSnapshot } from '../types/data'
import { basename } from './store'

/** Consecutive "no project" polls required before tearing down the timer — debounces
 *  the brief null AE reports mid-open (avoids a spurious pause/clear cycle). */
export const NO_PROJECT_CONFIRM_POLLS = 2

export interface TrackedProject {
  path: string
  title: string
}

export interface SnapshotMachineState {
  previousPath: string | null
  emptyPolls: number
  pendingOpenPath: string | null
  convertedPending: TrackedProject | null
}

export type SnapshotEffect =
  | { type: 'pause' }
  | { type: 'clearCurrent' }
  | { type: 'notify'; message: string; kind: 'info' }
  | { type: 'switchProject'; path: string; title: string; autoStart: boolean }

export interface SnapshotTransition {
  state: SnapshotMachineState
  effects: SnapshotEffect[]
}

export const CONVERTED_COPY_MESSAGE =
  'This project was made in an older version of After Effects, so a converted copy was opened. Save it to resume tracking.'

export function savedAsNewMessage(title: string): string {
  return `Saved as a new project — previous time stays on "${title}".`
}

/**
 * `pause` se emite sin mirar si el timer corre: la pausa del proveedor no hace nada en
 * ese caso. `totalFor` se consulta antes de aplicar ningún efecto.
 */
export function reduceSnapshot(
  state: SnapshotMachineState,
  snap: HostSnapshot,
  totalFor: (path: string) => number,
): SnapshotTransition {
  const path = snap.projectPath

  // 1. Unsaved / untitled (also how AE surfaces a project mid-conversion).
  if (snap.unsaved) {
    const next: SnapshotMachineState = { ...state, emptyPolls: 0, previousPath: null }
    const effects: SnapshotEffect[] = [{ type: 'pause' }, { type: 'clearCurrent' }]
    // "Unsaved" right after WE opened a project = AE created a converted copy
    // (project from an older AE version). Keep the real name + guide the user.
    if (state.pendingOpenPath) {
      const opened = state.pendingOpenPath
      next.pendingOpenPath = null
      next.convertedPending = { path: opened, title: basename(opened) }
      effects.push({ type: 'notify', kind: 'info', message: CONVERTED_COPY_MESSAGE })
    } else if (state.convertedPending && !snap.converting) {
      // The converted copy is gone: closing it makes AE spawn a fresh, EMPTY
      // "Untitled Project" (still unsaved, so no path change to react to). The
      // host flags unsaved-with-items as `converting`; unsaved WITHOUT items is
      // that fresh untitled — drop the stale converted label.
      next.convertedPending = null
    }
    return { state: next, effects }
  }

  // 2. No project open (debounced against transient nulls during open).
  if (!path) {
    const hadContext =
      state.previousPath !== null || state.pendingOpenPath !== null || state.convertedPending !== null
    if (!hadContext) return { state, effects: [] }
    const emptyPolls = state.emptyPolls + 1
    if (emptyPolls < NO_PROJECT_CONFIRM_POLLS) return { state: { ...state, emptyPolls }, effects: [] }
    return {
      state: { ...state, emptyPolls, previousPath: null, pendingOpenPath: null, convertedPending: null },
      effects: [{ type: 'pause' }, { type: 'clearCurrent' }],
    }
  }

  // A real, saved project is present from here on.
  const next: SnapshotMachineState = { ...state, emptyPolls: 0, pendingOpenPath: null }
  const effects: SnapshotEffect[] = []
  const converted = state.convertedPending
  if (converted) {
    next.convertedPending = null
    // Saved under a NEW path: the fresh entry starts at zero; tell the user where
    // their old time lives. (Same path = overwrite; auto-resume below handles it.)
    if (path !== converted.path && totalFor(converted.path) > 0) {
      effects.push({ type: 'notify', kind: 'info', message: savedAsNewMessage(converted.title) })
    }
  }

  // 3. Project changed -> pause previous, switch, auto-resume iff it already has time.
  if (path !== state.previousPath) {
    effects.push({ type: 'pause' })
    effects.push({
      type: 'switchProject',
      path,
      title: snap.projectName || basename(path),
      autoStart: totalFor(path) > 0,
    })
    next.previousPath = path
  }

  // 4. Same saved project, no change: leave running/paused state as-is.
  return { state: next, effects }
}
