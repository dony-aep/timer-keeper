/**
 * Pausa automática por inactividad, sin React ni CEP para poder testearla. TimerContext
 * lee el tiempo sin actividad del sistema (idleSource.ts) y aplica lo que decide aquí.
 */

import { dayKey } from './time'

/** Opciones del menú del panel, en minutos. 0 = desactivada, que es el valor por defecto. */
export const IDLE_OPTIONS_MINUTES = [5, 10, 15, 30] as const

const IDLE_SETTING_KEY = 'tk.idleAutoPauseSeconds'

/**
 * Una lectura por debajo de esto cuenta como actividad reciente. Con lecturas cada 5 s
 * deja margen para una lectura perdida sin tardar en reanudar.
 */
export const ACTIVE_BELOW_SECONDS = 10

/** Umbral guardado, en segundos; 0 si está desactivada o no se puede leer. */
export function readIdleThreshold(): number {
  try {
    const n = Number(localStorage.getItem(IDLE_SETTING_KEY))
    return isFinite(n) && n > 0 ? Math.floor(n) : 0
  } catch {
    return 0
  }
}

export function writeIdleThreshold(seconds: number): void {
  try {
    if (seconds > 0) localStorage.setItem(IDLE_SETTING_KEY, String(Math.floor(seconds)))
    else localStorage.removeItem(IDLE_SETTING_KEY)
  } catch {
    /* sin almacenamiento: el ajuste dura hasta recargar el panel */
  }
}

export interface IdleInput {
  /** Segundos sin actividad del sistema, o null si no hay lectura. */
  idleSeconds: number | null
  thresholdSeconds: number
  running: boolean
  currentPath: string | null
  /** Proyecto que la pausa automática detuvo, pendiente de reanudar. */
  autoPausedPath: string | null
  /** Segundos acreditados desde que arrancó el timer: tope de lo que se puede descontar. */
  runSeconds: number
}

export type IdleDecision =
  | { type: 'none' }
  | { type: 'pause'; discountSeconds: number }
  | { type: 'resume' }
  | { type: 'forget' }

const NONE: IdleDecision = { type: 'none' }

export function decideIdle(input: IdleInput): IdleDecision {
  const { idleSeconds, thresholdSeconds, running, currentPath, autoPausedPath } = input
  if (thresholdSeconds <= 0) return autoPausedPath ? { type: 'forget' } : NONE
  // Sin lectura no se decide nada: nunca se pausa sin pruebas de que no hay nadie.
  if (idleSeconds === null) return NONE

  if (running) {
    if (currentPath && idleSeconds >= thresholdSeconds) {
      return { type: 'pause', discountSeconds: Math.max(0, Math.min(idleSeconds, input.runSeconds)) }
    }
    return NONE
  }

  if (!autoPausedPath) return NONE
  if (currentPath !== autoPausedPath) return { type: 'forget' }
  return idleSeconds < ACTIVE_BELOW_SECONDS ? { type: 'resume' } : NONE
}

/**
 * Reparte por día local los `seconds` que terminan en `endMs`, para descontarlos del día en
 * que se contaron aunque la inactividad cruce la medianoche.
 */
export function spanByDay(endMs: number, seconds: number): Record<string, number> {
  const out: Record<string, number> = {}
  let end = endMs
  let left = Math.max(0, seconds) * 1000
  while (left > 0) {
    // `end` es exclusivo: el milisegundo anterior decide a qué día pertenece el tramo.
    const probe = new Date(end - 1)
    const dayStart = new Date(probe.getFullYear(), probe.getMonth(), probe.getDate()).getTime()
    const take = Math.min(left, end - dayStart)
    const key = dayKey(probe)
    out[key] = (out[key] ?? 0) + take / 1000
    left -= take
    end -= take
  }
  return out
}

/** "5 min", o "45 s" con los umbrales de prueba de menos de un minuto. */
export function formatIdleDuration(seconds: number): string {
  return seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${Math.round(seconds)} s`
}
