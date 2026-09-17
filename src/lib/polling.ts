import type { HostSnapshot } from '../types/data'
import { NO_PROJECT_CONFIRM_POLLS } from './snapshotMachine'

// Cada sondeo es un evalScript que ocupa el hilo principal de After Effects.
export const RUNNING_POLL_MS = 5000
export const IDLE_POLL_MS = 10000
/** Sondeo rápido para confirmar que ya no queda ningún proyecto abierto. */
export const CONFIRM_POLL_MS = 1000
/** Separación mínima entre sondeos disparados por foco o puntero. */
export const TRIGGER_MIN_GAP_MS = 1000

export function nextPollDelay(running: boolean, emptyPolls: number): number {
  // Solo mientras se espera la confirmación: tras desmontar, emptyPolls se queda en
  // NO_PROJECT_CONFIRM_POLLS y no debe provocar sondeos cada segundo.
  if (emptyPolls > 0 && emptyPolls < NO_PROJECT_CONFIRM_POLLS) return CONFIRM_POLL_MS
  return running ? RUNNING_POLL_MS : IDLE_POLL_MS
}

export function sameSnapshot(a: HostSnapshot | null, b: HostSnapshot | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.projectPath === b.projectPath &&
    a.projectName === b.projectName &&
    a.unsaved === b.unsaved &&
    a.converting === b.converting
  )
}
