/**
 * Update check against the Timer Keeper GitHub Releases API.
 *
 * The panel asks api.github.com for the latest release tag — automatically at
 * most once per day, or on demand from the flyout menu — and compares it with
 * the bundled `__APP_VERSION__`. Every failure mode (offline, rate-limited,
 * malformed response) degrades to an 'error' result and never disturbs the
 * panel: Timer Keeper must keep working fully offline.
 */

export interface UpdateInfo {
  /** Normalized version, no leading "v" (e.g. "4.1.0"). */
  version: string
  /** Release page to open in the browser. */
  url: string
}

export type UpdateCheckResult =
  | { status: 'update'; update: UpdateInfo }
  | { status: 'up-to-date' }
  | { status: 'skipped' } // throttled — nothing fetched
  | { status: 'error' }

const RELEASES_LATEST_API = 'https://api.github.com/repos/dony-aep/timer-keeper/releases/latest'
export const RELEASES_PAGE_URL = 'https://github.com/dony-aep/timer-keeper/releases/latest'

const LAST_CHECK_KEY = 'tk.updates.lastCheckedAt'
const LATEST_KEY = 'tk.updates.latest'
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 10_000

// `typeof` guard so the module also loads where the define isn't applied.
const CURRENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

/**
 * "v4.1.0" / "4.1.0-beta.2" → [4, 1, 0]; null when the tag has no usable
 * dotted numeric core. Prerelease/build suffixes are ignored on purpose:
 * `releases/latest` never returns prereleases, so the core is what matters.
 */
export function parseVersion(version: string): number[] | null {
  const core = version.trim().replace(/^v/i, '').split(/[-+]/)[0]
  if (!core) return null
  const parts = core.split('.')
  const nums: number[] = []
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null
    nums.push(Number(part))
  }
  return nums
}

/** True only when `candidate` is a valid version strictly above `current`. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = parseVersion(candidate)
  const b = parseVersion(current)
  if (!a || !b) return false
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}

/* ---------- localStorage (never allowed to throw) ---------- */

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable/full — the check simply reruns next launch */
  }
}

/**
 * Last known release from a previous successful check, but only when it is
 * still ahead of the running version. Lets the footer link appear instantly
 * on launch (and offline) without waiting for the network.
 */
export function readCachedUpdate(currentVersion: string = CURRENT_VERSION): UpdateInfo | null {
  const cached = readJSON<UpdateInfo>(LATEST_KEY)
  if (!cached || typeof cached.version !== 'string' || typeof cached.url !== 'string') return null
  return isNewerVersion(cached.version, currentVersion) ? cached : null
}

async function fetchLatestRelease(): Promise<UpdateInfo | null> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(RELEASES_LATEST_API, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    })
    if (!res.ok) return null
    const body = (await res.json()) as { tag_name?: unknown; html_url?: unknown }
    if (typeof body.tag_name !== 'string' || !parseVersion(body.tag_name)) return null
    return {
      version: body.tag_name.trim().replace(/^v/i, ''),
      url: typeof body.html_url === 'string' && body.html_url ? body.html_url : RELEASES_PAGE_URL,
    }
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

let inFlight: Promise<UpdateCheckResult> | null = null

/**
 * Run the update check. `force` bypasses the daily throttle (manual "Check
 * for Updates"); concurrent callers share the same request.
 */
export function checkForUpdate(
  force: boolean,
  currentVersion: string = CURRENT_VERSION,
): Promise<UpdateCheckResult> {
  if (inFlight) return inFlight
  const lastCheckedAt = readJSON<number>(LAST_CHECK_KEY) ?? 0
  if (!force && Date.now() - lastCheckedAt < CHECK_INTERVAL_MS) {
    return Promise.resolve({ status: 'skipped' })
  }
  inFlight = (async (): Promise<UpdateCheckResult> => {
    const latest = await fetchLatestRelease()
    if (!latest) return { status: 'error' }
    writeJSON(LAST_CHECK_KEY, Date.now())
    writeJSON(LATEST_KEY, latest)
    return isNewerVersion(latest.version, currentVersion)
      ? { status: 'update', update: latest }
      : { status: 'up-to-date' }
  })()
  void inFlight.finally(() => {
    inFlight = null
  })
  return inFlight
}
