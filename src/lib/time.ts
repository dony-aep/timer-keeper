/**
 * Pure time-formatting helpers. No CEP / DOM dependencies.
 * Behaviour mirrors the v3 vanilla engine (see archived main.js).
 */

/** Left-pad a non-negative integer to at least two digits. */
function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

/**
 * Format seconds as "HH:MM:SS". Hours are uncapped (can exceed 24 -> "25:00:00")
 * and always zero-padded to at least two digits. Invalid / negative input -> "00:00:00".
 */
export function formatTime(seconds: number): string {
  let s = Number(seconds)
  if (!isFinite(s) || s < 0) s = 0
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = Math.floor(s % 60)
  return `${pad2(hrs)}:${pad2(mins)}:${pad2(secs)}`
}

/**
 * Parse a "HH:MM:SS" string into total seconds.
 * Returns 0 for anything that is not exactly three numeric colon-separated parts.
 */
export function parseFormattedTime(timeString: string): number {
  if (typeof timeString !== 'string') return 0
  const parts = timeString.split(':')
  if (parts.length !== 3) return 0
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  const seconds = parseInt(parts[2], 10)
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return 0
  return Math.max(0, hours * 3600 + minutes * 60 + seconds)
}

/**
 * Format seconds as a descriptive string: "X days, Y hrs, Z mins, W secs".
 * Leading zero units are omitted (days shown only when > 0; hrs shown only when
 * days > 0 or hrs > 0). Minutes and seconds are always shown, matching v3.
 * Invalid / negative input is treated as 0 -> "0 mins, 0 secs".
 */
export function formatDescriptive(seconds: number): string {
  let s = Number(seconds)
  if (!isFinite(s) || s < 0) s = 0
  s = Math.floor(s)
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const secs = s % 60

  let out = ''
  if (days > 0) out += `${days} days, `
  if (hours > 0 || days > 0) out += `${hours} hrs, `
  out += `${minutes} mins, ${secs} secs`
  return out
}

/**
 * Format a 0..1 fraction as a rounded percentage ("34%"). Non-zero shares that
 * round to 0 are shown as "<1%" so tiny slices aren't misreported as nothing.
 */
export function formatPercent(fraction: number): string {
  const pct = (isFinite(fraction) ? fraction : 0) * 100
  if (pct > 0 && pct < 1) return '<1%'
  return `${Math.round(pct)}%`
}

/**
 * Local-time day key "YYYY-MM-DD" for the given date (defaults to now).
 * Uses the LOCAL calendar day, not UTC, so daily buckets align with the user's clock.
 */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  return `${y}-${m}-${d}`
}
