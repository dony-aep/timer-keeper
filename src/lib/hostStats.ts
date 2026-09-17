/** Contadores de las llamadas del panel al host (ExtendScript). */
export interface HostCallStat {
  calls: number
  totalMs: number
  maxMs: number
  lastMs: number
  /** Llamadas que devolvieron cadena vacía: error de ExtendScript o fuera de CEP. */
  empty: number
}

export interface HostStats {
  since: number
  byName: Record<string, HostCallStat>
}

const TIMER_KEEPER_CALL = /^\$\.global\.TimerKeeper\.([A-Za-z0-9_]+)\(/

/** Nombre de la función del host ("getSnapshot", "saveData"...) o "other". */
export function hostCallName(script: string): string {
  const match = TIMER_KEEPER_CALL.exec(script)
  return match ? match[1] : 'other'
}

export function createHostStats(now: number): HostStats {
  return { since: now, byName: {} }
}

// Muta a propósito: son contadores de diagnóstico, no estado de React.
export function recordCall(stats: HostStats, name: string, ms: number, empty: boolean): void {
  const stat =
    stats.byName[name] ??
    (stats.byName[name] = { calls: 0, totalMs: 0, maxMs: 0, lastMs: 0, empty: 0 })
  stat.calls += 1
  stat.totalMs += ms
  stat.lastMs = ms
  if (ms > stat.maxMs) stat.maxMs = ms
  if (empty) stat.empty += 1
}
