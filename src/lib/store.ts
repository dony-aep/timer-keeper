/**
 * Pure store logic. No CEP / DOM dependencies — every function is deterministic and
 * immutable (returns a new StoreV2 rather than mutating its input), which keeps it
 * safe to drive from React state and easy to unit-test.
 */

import type { ProjectEntry, StoreV2 } from '../types/data'
import { parseFormattedTime } from './time'

/** Where a parsed store originated, so the caller can decide whether to back up + rewrite. */
export type MigrationSource = 'v2' | 'v1' | 'legacy' | 'empty'

export interface ParseResult {
  store: StoreV2
  migratedFrom: MigrationSource
  /** True only when the raw input was present but could not be parsed as JSON. */
  error?: boolean
}

/** Replace `%20` sequences (legacy AE path encoding) with real spaces. */
export function sanitizePath(path: string): string {
  return typeof path === 'string' ? path.replace(/%20/g, ' ') : ''
}

/** Extract the final path segment (file name) from a path using either separator. */
export function basename(path: string): string {
  const clean = sanitizePath(path)
  const parts = clean.split(/[\\/]/)
  return parts[parts.length - 1] || clean
}

/** An empty v2 store. */
function emptyStore(): StoreV2 {
  return { version: 2, projects: [] }
}

function emptyResult(error?: boolean): ParseResult {
  const result: ParseResult = { store: emptyStore(), migratedFrom: 'empty' }
  if (error) result.error = true
  return result
}

/** Coerce a value into a finite, non-negative number (fallback 0). */
function toNonNegNumber(value: unknown): number {
  const n = Number(value)
  return isFinite(n) && n > 0 ? n : 0
}

/** Sanitize a `daily` map: keep only string keys with finite, non-negative numeric values. */
function sanitizeDaily(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (raw && typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const n = Number(value)
      if (isFinite(n) && n >= 0) out[key] = n
    }
  }
  return out
}

/** Pass a v2 projects array through, sanitizing each entry. */
function sanitizeV2(projectsRaw: unknown[]): StoreV2 {
  const projects: ProjectEntry[] = []
  for (const item of projectsRaw) {
    if (!item || typeof item !== 'object') continue
    const p = item as Record<string, unknown>
    if (typeof p.path !== 'string' || p.path.trim() === '') continue
    const path = p.path
    const title = typeof p.title === 'string' && p.title.trim() !== '' ? p.title : basename(path)
    projects.push({
      path,
      title,
      totalSeconds: toNonNegNumber(p.totalSeconds),
      daily: sanitizeDaily(p.daily),
    })
  }
  return { version: 2, projects }
}

/** Migrate a v1 `{ Projects: [{ title, time, path }] }` payload. `time` may be "HH:MM:SS" or a number. */
function migrateV1(projectsRaw: unknown[]): StoreV2 {
  const projects: ProjectEntry[] = []
  for (const item of projectsRaw) {
    if (!item || typeof item !== 'object') continue
    const p = item as Record<string, unknown>
    if (typeof p.path !== 'string' || p.path.trim() === '') continue
    const path = sanitizePath(p.path)

    let total = 0
    if (typeof p.time === 'string') total = parseFormattedTime(p.time)
    else if (typeof p.time === 'number') total = Math.max(0, Math.floor(p.time))

    const title = typeof p.title === 'string' && p.title.trim() !== '' ? p.title : basename(path)
    projects.push({ path, title, totalSeconds: total, daily: {} })
  }
  return { version: 2, projects }
}

/** Migrate a legacy `{ "<path>": seconds }` map. */
function migrateLegacy(obj: Record<string, unknown>): StoreV2 {
  const projects: ProjectEntry[] = []
  for (const [rawPath, value] of Object.entries(obj)) {
    if (typeof value !== 'number' || !isFinite(value)) continue
    const path = sanitizePath(rawPath)
    if (path.trim() === '') continue
    projects.push({
      path,
      title: basename(path),
      totalSeconds: Math.max(0, Math.floor(value)),
      daily: {},
    })
  }
  return { version: 2, projects }
}

/**
 * Parse raw JSON (as returned by the host `loadData()`) into a v2 store, detecting the
 * source format. Corrupt JSON yields an empty store flagged with `error: true`;
 * empty / `"{}"` / `"false"` inputs yield an empty store with `migratedFrom: 'empty'`.
 */
export function parseStore(raw: string | null | undefined): ParseResult {
  if (raw == null) return emptyResult()
  const trimmed = String(raw).trim()
  if (trimmed === '' || trimmed === 'false' || trimmed === '{}') return emptyResult()

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return emptyResult(true)
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyResult()
  const obj = parsed as Record<string, unknown>

  // v2: explicit version + projects array.
  if (obj.version === 2 && Array.isArray(obj.projects)) {
    return { store: sanitizeV2(obj.projects), migratedFrom: 'v2' }
  }

  // v1: { Projects: [...] }.
  if (Array.isArray(obj.Projects)) {
    return { store: migrateV1(obj.Projects), migratedFrom: 'v1' }
  }

  // legacy: { "<path>": seconds }.
  const legacy = migrateLegacy(obj)
  if (legacy.projects.length > 0) return { store: legacy, migratedFrom: 'legacy' }

  // Unrecognized object shape with nothing usable.
  return emptyResult()
}

/** Serialize a store to pretty JSON (4-space indent), matching v3's on-disk style. */
export function serializeStore(store: StoreV2): string {
  return JSON.stringify(store, null, 4)
}

/**
 * Ensure a project exists for `path`. If it exists, its title is refreshed when a
 * non-empty `title` is provided and differs; otherwise the store is returned unchanged.
 */
export function upsertProject(store: StoreV2, path: string, title?: string): StoreV2 {
  const idx = store.projects.findIndex((p) => p.path === path)
  if (idx >= 0) {
    const existing = store.projects[idx]
    if (title && title.trim() !== '' && title !== existing.title) {
      const projects = store.projects.slice()
      projects[idx] = { ...existing, title }
      return { version: 2, projects }
    }
    return store
  }
  const entry: ProjectEntry = {
    path,
    title: title && title.trim() !== '' ? title : basename(path),
    totalSeconds: 0,
    daily: {},
  }
  return { version: 2, projects: [...store.projects, entry] }
}

/**
 * Credit `seconds` to a project's total and to its `day` bucket, creating the project
 * if necessary. A non-positive `seconds` is a no-op beyond ensuring the entry exists.
 */
export function creditTime(
  store: StoreV2,
  path: string,
  title: string,
  seconds: number,
  day: string,
): StoreV2 {
  if (!(seconds > 0) || !isFinite(seconds)) {
    return upsertProject(store, path, title)
  }
  const idx = store.projects.findIndex((p) => p.path === path)
  const projects = store.projects.slice()
  if (idx >= 0) {
    const e = projects[idx]
    projects[idx] = {
      ...e,
      totalSeconds: e.totalSeconds + seconds,
      daily: { ...e.daily, [day]: (e.daily[day] || 0) + seconds },
    }
  } else {
    projects.push({
      path,
      title: title && title.trim() !== '' ? title : basename(path),
      totalSeconds: seconds,
      daily: { [day]: seconds },
    })
  }
  return { version: 2, projects }
}

/** Reset a project's accumulated time (total + all daily buckets) to zero, keeping the entry. */
export function resetProject(store: StoreV2, path: string): StoreV2 {
  const idx = store.projects.findIndex((p) => p.path === path)
  if (idx < 0) return store
  const projects = store.projects.slice()
  projects[idx] = { ...projects[idx], totalSeconds: 0, daily: {} }
  return { version: 2, projects }
}

/** Remove a project entirely. */
export function removeProject(store: StoreV2, path: string): StoreV2 {
  const projects = store.projects.filter((p) => p.path !== path)
  if (projects.length === store.projects.length) return store
  return { version: 2, projects }
}

/** Sum of all projects' total seconds. */
export function totalSeconds(store: StoreV2): number {
  return store.projects.reduce((sum, p) => sum + (p.totalSeconds || 0), 0)
}

/** Sum of all projects' seconds for a given day key. */
export function todaySeconds(store: StoreV2, day: string): number {
  return store.projects.reduce((sum, p) => sum + (p.daily[day] || 0), 0)
}

/** Accumulated seconds for a single project (0 if unknown). */
export function projectTotal(store: StoreV2, path: string): number {
  const p = store.projects.find((entry) => entry.path === path)
  return p ? p.totalSeconds : 0
}
