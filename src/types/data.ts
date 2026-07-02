/**
 * Core data types for Timer Keeper.
 *
 * The persisted store is versioned (v2). Older on-disk formats (v1 `{ Projects: [...] }`
 * and the legacy `{ "<path>": seconds }` map) are migrated into `StoreV2` on load
 * by `src/lib/store.ts`.
 */

/** A single tracked project with cumulative and per-day time. */
export interface ProjectEntry {
  /** Absolute path to the .aep file (used as the stable identity key). */
  path: string
  /** Human-readable title (usually the file name). */
  title: string
  /** Total accumulated seconds across all sessions. */
  totalSeconds: number
  /** Per-day accumulated seconds, keyed by local "YYYY-MM-DD". */
  daily: Record<string, number>
}

/** The current on-disk store format. */
export interface StoreV2 {
  version: 2
  projects: ProjectEntry[]
}

/**
 * Snapshot of the After Effects host state, polled from
 * `$.global.TimerKeeper.getSnapshot()`.
 */
export interface HostSnapshot {
  /** Absolute path of the active project, or null when none is open. */
  projectPath: string | null
  /** Display name of the active project, or null. */
  projectName: string | null
  /** True when the active project has never been saved ("Untitled Project*"). */
  unsaved: boolean
  /** True while AE is converting/upgrading the project file. */
  converting: boolean
}
