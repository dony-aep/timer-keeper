import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { HostSnapshot, StoreV2 } from '../types/data'
import { dayKey, formatTime } from '../lib/time'
import {
  basename,
  creditTime,
  parseStore,
  projectTotal,
  removeProject as removeProjectFromStore,
  resetProject as resetProjectFromStore,
  sanitizePath,
  serializeStore,
  upsertProject,
} from '../lib/store'
import { escapeForEval, useCSInterface } from '../hooks/useCSInterface'

/** Milliseconds between UI ticks while the timer runs. */
const TICK_MS = 1000
/** Milliseconds between host snapshot polls. */
const SNAPSHOT_MS = 2000
/** Autosave cadence while running. */
const SAVE_INTERVAL_MS = 5000
/** Consecutive "no project" polls required before tearing down the timer — debounces
 *  the brief null AE reports mid-open (avoids a spurious pause/clear cycle). */
const NO_PROJECT_CONFIRM_POLLS = 2
/** Consecutive host write failures before we warn the user. */
const SAVE_FAIL_THRESHOLD = 3

export type NoticeKind = 'info' | 'success' | 'warning' | 'error'
export interface Notice {
  message: string
  kind: NoticeKind
}

/** Result of an `openProject` attempt, distinguishable by the UI. */
export type OpenProjectResult = 'opened' | 'canceled' | 'error'

export interface CurrentProject {
  path: string
  title: string
}

export interface TimerContextValue {
  /** The full persisted store (for dashboards / project lists). */
  store: StoreV2
  /** Whether the timer is actively accumulating. */
  running: boolean
  /** The project currently attached to the timer, or null. */
  currentProject: CurrentProject | null
  /** Accumulated seconds for the current project (floored), 0 when none. */
  elapsedSeconds: number
  /** Latest host snapshot (lets the UI label "Untitled Project*" vs "No project open"). */
  snapshot: HostSnapshot | null
  /**
   * Set when a project opened via the panel came up as an UNSAVED converted copy
   * (AE opens projects from older versions as "name (converted).aep *" with no file
   * on disk). Lets the UI keep showing the real project name instead of "Untitled".
   */
  convertedPending: CurrentProject | null
  /** Traditional "HH:MM:SS" vs descriptive time formatting. */
  useDescriptiveFormat: boolean
  /** Last toast-worthy notice/error, or null. */
  notice: Notice | null
  clearNotice: () => void

  /** Async: verifies the host state with a fresh snapshot before starting. */
  start: () => Promise<void>
  pause: () => void
  resetProject: (path: string) => void
  removeProject: (path: string) => void
  refresh: () => Promise<void>
  openProject: (path: string) => Promise<OpenProjectResult>
  toggleTimeFormat: () => void
}

const TimerContext = createContext<TimerContextValue | null>(null)

const EMPTY_STORE: StoreV2 = { version: 2, projects: [] }

/**
 * The converted-copy link survives panel reloads via sessionStorage (in-memory state
 * would otherwise reset the label to "Untitled Project*" even though the converted
 * copy is still open). The restored value is re-validated by the snapshot state
 * machine on the first poll, so a stale entry self-clears.
 */
const CONVERTED_PENDING_KEY = 'timerKeeper.convertedPending'

function readStoredConvertedPending(): CurrentProject | null {
  try {
    const raw = sessionStorage.getItem(CONVERTED_PENDING_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as Partial<CurrentProject>
    if (typeof obj.path === 'string' && obj.path !== '' && typeof obj.title === 'string') {
      return { path: obj.path, title: obj.title }
    }
  } catch {
    /* storage unavailable or corrupt -> start clean */
  }
  return null
}

function writeStoredConvertedPending(v: CurrentProject | null): void {
  try {
    if (v) sessionStorage.setItem(CONVERTED_PENDING_KEY, JSON.stringify(v))
    else sessionStorage.removeItem(CONVERTED_PENDING_KEY)
  } catch {
    /* storage unavailable -> label just won't survive a reload */
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const cep = useCSInterface()

  // --- React state (drives rendering) ---
  const [store, setStore] = useState<StoreV2>(EMPTY_STORE)
  const [running, setRunning] = useState(false)
  const [currentProject, setCurrentProject] = useState<CurrentProject | null>(null)
  const [snapshot, setSnapshot] = useState<HostSnapshot | null>(null)
  const [useDescriptiveFormat, setUseDescriptiveFormat] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [convertedPending, setConvertedPendingState] =
    useState<CurrentProject | null>(readStoredConvertedPending)

  // --- Engine refs (read by intervals/listeners without stale closures) ---
  const storeRef = useRef<StoreV2>(EMPTY_STORE)
  const runningRef = useRef(false)
  const currentPathRef = useRef<string | null>(null)
  const currentTitleRef = useRef('')
  const previousPathRef = useRef<string | null>(null)
  const emptyPollsRef = useRef(0)
  const lastSnapshotRef = useRef<HostSnapshot | null>(null)
  const lastTickRef = useRef(0)
  const lastSaveRef = useRef(0)
  const pollingRef = useRef(false)
  // Data-safety guard: writes stay disabled until a load has SUCCEEDED, so a failed
  // read can never let an empty in-memory store overwrite good data on disk.
  const canPersistRef = useRef(false)
  const saveFailuresRef = useRef(0)
  // Conversion tracking: the path we just asked AE to open (so an ensuing "unsaved"
  // snapshot can be recognised as that project's converted copy), and its promotion.
  const pendingOpenPathRef = useRef<string | null>(null)
  const convertedPendingRef = useRef<CurrentProject | null>(convertedPending)

  const setConvertedPending = useCallback((v: CurrentProject | null) => {
    convertedPendingRef.current = v
    setConvertedPendingState(v)
    writeStoredConvertedPending(v)
  }, [])

  const commitStore = useCallback((s: StoreV2) => {
    storeRef.current = s
    setStore(s)
  }, [])

  const notify = useCallback((message: string, kind: NoticeKind) => {
    setNotice({ message, kind })
  }, [])

  const clearNotice = useCallback(() => setNotice(null), [])

  /**
   * Persist the store to disk (host does the atomic temp+rename write). Blocked until
   * a load has succeeded — never clobber good data after a read error. Repeated
   * host-side write failures surface a one-time warning so saves can't fail silently.
   */
  const persist = useCallback(
    async (s: StoreV2) => {
      if (!cep.isCEP || !canPersistRef.current) return
      const json = serializeStore(s)
      const res = await cep.evalTS(`saveData('${escapeForEval(json)}')`)
      if (res === 'true') {
        saveFailuresRef.current = 0
        return
      }
      saveFailuresRef.current += 1
      if (saveFailuresRef.current === SAVE_FAIL_THRESHOLD) {
        notify(
          'Unable to save timing data to disk. Your recent time may not be persisted.',
          'error',
        )
      }
    },
    [cep, notify],
  )

  /**
   * Credit elapsed wall-clock time to the active project using a monotonic delta from
   * the previous tick (never derived from an absolute start time -> no drift, no
   * negative jumps). The delta is credited to whatever local day the tick lands on.
   */
  const tick = useCallback(() => {
    const path = currentPathRef.current
    const now = Date.now()
    const delta = (now - lastTickRef.current) / 1000
    lastTickRef.current = now
    if (!path || !(delta > 0)) return
    const next = creditTime(storeRef.current, path, currentTitleRef.current, delta, dayKey())
    commitStore(next)
    if (now - lastSaveRef.current >= SAVE_INTERVAL_MS) {
      lastSaveRef.current = now
      persist(next)
    }
  }, [commitStore, persist])

  const clearCurrent = useCallback(() => {
    currentPathRef.current = null
    currentTitleRef.current = ''
    setCurrentProject(null)
  }, [])

  /** Attach the timer to `path` and start accumulating from now. */
  const beginTiming = useCallback(
    (path: string, title: string) => {
      commitStore(upsertProject(storeRef.current, path, title))
      currentPathRef.current = path
      currentTitleRef.current = title
      setCurrentProject({ path, title })
      const now = Date.now()
      lastTickRef.current = now
      lastSaveRef.current = now
      runningRef.current = true
      setRunning(true)
    },
    [commitStore],
  )

  /** Stop the timer, flushing the final partial delta and saving. */
  const doPause = useCallback(
    (showNotice: boolean) => {
      if (!runningRef.current) return
      tick() // flush partial time before stopping
      runningRef.current = false
      setRunning(false)
      persist(storeRef.current)
      if (showNotice) {
        const total = projectTotal(storeRef.current, currentPathRef.current ?? '')
        notify(`Timer paused for: ${currentTitleRef.current}\nTotal time: ${formatTime(total)}`, 'info')
      }
    },
    [tick, persist, notify],
  )

  /**
   * Host state machine:
   *  - unsaved -> pause + clear current (UI shows "Untitled Project*"). AE reports a
   *    version-converting project as an unsaved/no-file project, so this branch also
   *    covers the "pause while converting" case (the old dedicated `converting` branch
   *    was unreachable — unsaved always short-circuited first — and has been removed).
   *  - no project -> pause + clear, but only after NO_PROJECT_CONFIRM_POLLS consecutive
   *    empty polls (AE briefly reports "no project" mid-open; debouncing avoids a
   *    spurious pause/clear flicker).
   *  - project changed -> pause previous, switch, and auto-start iff the new project
   *    already has accumulated time (else stay paused).
   */
  const applySnapshot = useCallback(
    (snap: HostSnapshot) => {
      const path = snap.projectPath

      // 1. Unsaved / untitled (also how AE surfaces a project mid-conversion).
      if (snap.unsaved) {
        emptyPollsRef.current = 0
        if (runningRef.current) doPause(false)
        clearCurrent()
        previousPathRef.current = null
        // "Unsaved" right after WE opened a project = AE created a converted copy
        // (project from an older AE version). Keep the real name + guide the user.
        if (pendingOpenPathRef.current) {
          const p = pendingOpenPathRef.current
          pendingOpenPathRef.current = null
          setConvertedPending({ path: p, title: basename(p) })
          notify(
            'This project was made in an older version of After Effects, so a converted copy was opened. Save it to resume tracking.',
            'info',
          )
        } else if (convertedPendingRef.current && !snap.converting) {
          // The converted copy is gone: closing it makes AE spawn a fresh, EMPTY
          // "Untitled Project" (still unsaved, so no path change to react to). The
          // host flags unsaved-with-items as `converting`; unsaved WITHOUT items is
          // that fresh untitled — drop the stale converted label.
          setConvertedPending(null)
        }
        return
      }

      // 2. No project open (debounced against transient nulls during open).
      if (!path) {
        const hadContext =
          previousPathRef.current !== null ||
          pendingOpenPathRef.current !== null ||
          convertedPendingRef.current !== null
        if (!hadContext) return
        emptyPollsRef.current += 1
        if (emptyPollsRef.current < NO_PROJECT_CONFIRM_POLLS) return
        if (runningRef.current) doPause(false)
        clearCurrent()
        previousPathRef.current = null
        pendingOpenPathRef.current = null
        if (convertedPendingRef.current) setConvertedPending(null)
        return
      }

      // A real, saved project is present from here on.
      emptyPollsRef.current = 0
      pendingOpenPathRef.current = null
      const converted = convertedPendingRef.current
      if (converted) {
        setConvertedPending(null)
        // Saved under a NEW path: the fresh entry starts at zero; tell the user where
        // their old time lives. (Same path = overwrite; auto-resume below handles it.)
        if (path !== converted.path && projectTotal(storeRef.current, converted.path) > 0) {
          notify(`Saved as a new project — previous time stays on "${converted.title}".`, 'info')
        }
      }

      // 3. Project changed -> pause previous, switch, auto-resume iff it already has time.
      if (path !== previousPathRef.current) {
        if (runningRef.current) doPause(false)
        previousPathRef.current = path
        const title = snap.projectName || basename(path)
        commitStore(upsertProject(storeRef.current, path, title))
        const saved = projectTotal(storeRef.current, path)
        if (saved > 0) {
          beginTiming(path, title)
        } else {
          // Known project with no time: make it current but stay paused.
          currentPathRef.current = path
          currentTitleRef.current = title
          setCurrentProject({ path, title })
          runningRef.current = false
          setRunning(false)
        }
        return
      }

      // 4. Same saved project, no change: leave running/paused state as-is.
    },
    [doPause, clearCurrent, commitStore, beginTiming, notify, setConvertedPending],
  )

  /** Fetch + parse a fresh host snapshot. Returns null off-host or on malformed data. */
  const fetchSnapshot = useCallback(async (): Promise<HostSnapshot | null> => {
    const raw = await cep.evalTS('getSnapshot()')
    try {
      const obj = JSON.parse(raw) as Partial<HostSnapshot>
      return {
        projectPath: obj.projectPath ? sanitizePath(obj.projectPath) : null,
        projectName: obj.projectName ? sanitizePath(obj.projectName) : null,
        unsaved: !!obj.unsaved,
        converting: !!obj.converting,
      }
    } catch {
      return null // off-host or malformed -> ignore
    }
  }, [cep])

  const pollSnapshot = useCallback(async () => {
    if (pollingRef.current) return // skip if a previous poll is still in flight (slow host)
    pollingRef.current = true
    try {
      const parsed = await fetchSnapshot()
      if (!parsed) return
      lastSnapshotRef.current = parsed
      setSnapshot(parsed)
      applySnapshot(parsed)
    } finally {
      pollingRef.current = false
    }
  }, [fetchSnapshot, applySnapshot])

  /**
   * Load the store from disk, migrating + backing up older formats on first read.
   * A host read failure ("false") or corrupt JSON does NOT commit an empty store and
   * leaves writes disabled (`canPersistRef` stays false), so a transient read error
   * can't let an empty store clobber good data on the next save.
   */
  const loadFromDisk = useCallback(async () => {
    const raw = await cep.evalTS('loadData()')
    const rawTrim = (raw ?? '').trim()
    const result = parseStore(raw)
    if (rawTrim === 'false' || result.error === true) {
      canPersistRef.current = false
      notify(
        'Could not read your saved data. Saving is disabled to protect your file — use Refresh to retry.',
        'error',
      )
      return result
    }
    if (result.migratedFrom === 'v1' || result.migratedFrom === 'legacy') {
      // Back up the ORIGINAL raw payload once, then persist the migrated v2 store.
      await cep.evalTS(`saveBackup('${escapeForEval(raw)}')`)
      await cep.evalTS(`saveData('${escapeForEval(serializeStore(result.store))}')`)
    }
    commitStore(result.store)
    canPersistRef.current = true
    saveFailuresRef.current = 0
    return result
  }, [cep, commitStore, notify])

  // --- Public actions ---

  const start = useCallback(async () => {
    if (runningRef.current) return
    // Decide on a FRESH snapshot (the interval poll can be up to 2s stale), so hitting
    // Start right after saving/opening a project doesn't trip a false "no project" warning.
    const snap = (await fetchSnapshot()) ?? lastSnapshotRef.current
    if (snap) {
      lastSnapshotRef.current = snap
      setSnapshot(snap)
    }
    if (!snap || !snap.projectPath || snap.unsaved) {
      notify("No project is open or it's not saved. Please save your project first.", 'warning')
      return
    }
    if (snap.converting) {
      notify('This project is being converted. Please wait.', 'warning')
      return
    }
    const path = snap.projectPath
    const title = snap.projectName || basename(path)
    previousPathRef.current = path
    emptyPollsRef.current = 0
    beginTiming(path, title)
    notify(`Timer started for: ${title}`, 'success')
  }, [fetchSnapshot, notify, beginTiming])

  const pause = useCallback(() => {
    if (!runningRef.current) return
    doPause(true)
  }, [doPause])

  const resetProject = useCallback(
    (path: string) => {
      const isCurrent = currentPathRef.current === path
      if (isCurrent && runningRef.current) doPause(false)
      const next = resetProjectFromStore(storeRef.current, path)
      commitStore(next)
      persist(next)
      notify(`Timer reset for project: ${basename(path)}`, 'success')
    },
    [doPause, commitStore, persist, notify],
  )

  const removeProject = useCallback(
    (path: string) => {
      const isCurrent = currentPathRef.current === path
      if (isCurrent && runningRef.current) doPause(false)
      const next = removeProjectFromStore(storeRef.current, path)
      commitStore(next)
      if (isCurrent) {
        clearCurrent()
        previousPathRef.current = null
      }
      persist(next)
      notify('Project successfully deleted.', 'info')
    },
    [doPause, commitStore, clearCurrent, persist, notify],
  )

  const refresh = useCallback(async () => {
    if (runningRef.current) doPause(false)
    clearCurrent()
    previousPathRef.current = null
    pendingOpenPathRef.current = null
    setConvertedPending(null)
    await loadFromDisk()
    notify('Timer data refreshed successfully.', 'success')
  }, [doPause, clearCurrent, loadFromDisk, notify, setConvertedPending])

  const openProject = useCallback(
    async (path: string): Promise<OpenProjectResult> => {
      const escaped = escapeForEval(path)
      const validationRaw = await cep.evalTS(`validateFilePath('${escaped}')`)
      let validation: { exists?: boolean; readable?: boolean; error?: string } | null = null
      try {
        validation = JSON.parse(validationRaw)
      } catch {
        validation = null
      }
      if (!validation || !validation.exists || !validation.readable) {
        notify(
          `Cannot access the project file. ${validation?.error || 'Check path and permissions.'}`,
          'error',
        )
        return 'error'
      }
      // Flush + pause the outgoing project BEFORE AE switches, so no wall-clock time is
      // wrongly credited to it during the ~2s until the next poll detects the change.
      if (runningRef.current) doPause(false)
      const result = await cep.evalTS(`openProjectFile('${escaped}')`)
      if (result === 'true') {
        notify('Project opened. Timer will start if applicable.', 'success')
        // Remember what we opened: if the next snapshot reports "unsaved", AE opened
        // a converted copy of this project and the UI can keep its real name.
        pendingOpenPathRef.current = path
        void pollSnapshot() // react to the switch immediately instead of waiting for the interval
        return 'opened'
      }
      if (result === 'USER_CANCELED_CLOSE') {
        notify('Project opening cancelled by user.', 'info')
        return 'canceled'
      }
      notify(`Error opening project: ${result || 'Unknown error'}`, 'error')
      return 'error'
    },
    [cep, notify, doPause, pollSnapshot],
  )

  const toggleTimeFormat = useCallback(() => setUseDescriptiveFormat((v) => !v), [])

  // --- Effects ---

  // Initial load (with migration/backup).
  useEffect(() => {
    void loadFromDisk()
  }, [loadFromDisk])

  // Host snapshot polling every 2s.
  useEffect(() => {
    void pollSnapshot()
    const id = window.setInterval(() => void pollSnapshot(), SNAPSHOT_MS)
    return () => window.clearInterval(id)
  }, [pollSnapshot])

  // Persistent 1s UI tick, gated by running.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (runningRef.current) tick()
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [tick])

  // Autosave on panel unload and when hidden.
  useEffect(() => {
    const flush = () => {
      if (runningRef.current) {
        tick()
        runningRef.current = false
      }
      persist(storeRef.current)
    }
    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        if (runningRef.current) tick()
        persist(storeRef.current)
      }
    }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onHidden)
    }
  }, [tick, persist])

  const elapsedSeconds = currentProject
    ? Math.floor(projectTotal(store, currentProject.path))
    : 0

  const value: TimerContextValue = {
    store,
    running,
    currentProject,
    elapsedSeconds,
    snapshot,
    convertedPending,
    useDescriptiveFormat,
    notice,
    clearNotice,
    start,
    pause,
    resetProject,
    removeProject,
    refresh,
    openProject,
    toggleTimeFormat,
  }

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimer must be used within a TimerProvider')
  return ctx
}
