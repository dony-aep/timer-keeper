import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { HostSnapshot, StoreV2 } from '../types/data'
import { creditableSeconds, dayKey, formatTime, MAX_TICK_GAP_MS } from '../lib/time'
import {
  addPending,
  applyPending,
  basename,
  parseStore,
  pendingTotal,
  projectTotal,
  removeProject as removeProjectFromStore,
  removeTime,
  resetProject as resetProjectFromStore,
  setProjectColor as setProjectColorInStore,
  sanitizePath,
  serializeStore,
  upsertProject,
  type PendingTime,
} from '../lib/store'
import { escapeForEval, useCSInterface } from '../hooks/useCSInterface'
import { reduceSnapshot, type SnapshotMachineState } from '../lib/snapshotMachine'
import { createCepFsBackend, createHostBackend, type DataBackend } from '../lib/dataBackend'
import { isCepFs } from '../lib/dataFile'
import { nextPollDelay, sameSnapshot, TRIGGER_MIN_GAP_MS } from '../lib/polling'
import { HOST_CALL_TIMEOUT_MS, withTimeout } from '../lib/withTimeout'
import { getCepNode, startIdleSource } from '../lib/idleSource'
import { decideIdle, formatIdleDuration, readIdleThreshold, spanByDay, writeIdleThreshold } from '../lib/idle'

/** Milliseconds between UI ticks while the timer runs. */
const TICK_MS = 1000
/** Autosave cadence while running; pausing, switching projects and closing the panel also save. */
const SAVE_INTERVAL_MS = 30000
/** Consecutive host write failures before we warn the user. */
const SAVE_FAIL_THRESHOLD = 3
/** Cadencia del lector de inactividad; no pasa por evalScript, así que no carga a AE. */
const IDLE_POLL_SECONDS = 5
/** Caídas seguidas del lector antes de dar la pausa automática por no disponible. */
const IDLE_MAX_FAILURES = 3

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
  /** Color "#rrggbb" for the Dashboard; null goes back to the automatic grey. */
  setProjectColor: (path: string, color: string | null) => void
  refresh: () => Promise<void>
  openProject: (path: string) => Promise<OpenProjectResult>
  toggleTimeFormat: () => void
  /** Segundos sin actividad antes de pausar solo; 0 = desactivado (valor por defecto). */
  idleThreshold: number
  setIdleThreshold: (seconds: number) => void
}

const TimerContext = createContext<TimerContextValue | null>(null)

export interface TimerClockValue {
  /** Segundos del proyecto actual (redondeados hacia abajo), incluido lo contado desde el último volcado. */
  elapsedSeconds: number
  /** Segundos contados desde el último volcado al almacén (proyecto actual). */
  liveSeconds: number
}

// Contexto aparte para lo que cambia cada segundo: así solo se re-renderizan sus
// consumidores y no la lista de proyectos ni el Dashboard.
const TimerClockContext = createContext<TimerClockValue>({ elapsedSeconds: 0, liveSeconds: 0 })

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
  const [liveSeconds, setLiveSeconds] = useState(0)
  const [idleThreshold, setIdleThresholdState] = useState(readIdleThreshold)
  const [autoPausedPath, setAutoPausedPathState] = useState<string | null>(null)
  const [idleUnavailable, setIdleUnavailable] = useState(false)
  const [idleRestart, setIdleRestart] = useState(0)

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
  const pendingRef = useRef<PendingTime>({})
  const pollingRef = useRef(false)
  // Data-safety guard: writes stay disabled until a load has SUCCEEDED, so a failed
  // read can never let an empty in-memory store overwrite good data on disk.
  const canPersistRef = useRef(false)
  const saveFailuresRef = useRef(0)
  const backendRef = useRef<DataBackend | null>(null)
  const backendPromiseRef = useRef<Promise<DataBackend | null> | null>(null)
  const saveInFlightRef = useRef(false)
  const pendingStoreRef = useRef<StoreV2 | null>(null)
  // Conversion tracking: the path we just asked AE to open (so an ensuing "unsaved"
  // snapshot can be recognised as that project's converted copy), and its promotion.
  const pendingOpenPathRef = useRef<string | null>(null)
  const convertedPendingRef = useRef<CurrentProject | null>(convertedPending)
  // Pausa por inactividad: proyecto a reanudar, umbral vigente, segundos acreditados desde
  // el último arranque (tope del descuento) y caídas seguidas del lector.
  const autoPausedPathRef = useRef<string | null>(null)
  const idleThresholdRef = useRef(idleThreshold)
  const creditedRunRef = useRef(0)
  const idleFailuresRef = useRef(0)

  const setConvertedPending = useCallback((v: CurrentProject | null) => {
    convertedPendingRef.current = v
    setConvertedPendingState(v)
    writeStoredConvertedPending(v)
  }, [])

  const setAutoPaused = useCallback((path: string | null) => {
    autoPausedPathRef.current = path
    setAutoPausedPathState(path)
  }, [])

  const commitStore = useCallback((s: StoreV2) => {
    storeRef.current = s
    setStore(s)
  }, [])

  // El segundero acumula aparte y solo toca el almacén al guardar o pausar: cambiar `store`
  // cada segundo re-renderizaba la lista de proyectos y el Dashboard enteros.
  const flushPending = useCallback((): StoreV2 => {
    const path = currentPathRef.current
    const pending = pendingRef.current
    pendingRef.current = {}
    setLiveSeconds(0)
    if (!path || Object.keys(pending).length === 0) return storeRef.current
    const next = applyPending(storeRef.current, path, currentTitleRef.current, pending)
    commitStore(next)
    return next
  }, [commitStore])

  const notify = useCallback((message: string, kind: NoticeKind) => {
    setNotice({ message, kind })
  }, [])

  const clearNotice = useCallback(() => setNotice(null), [])

  // Se decide una sola vez dónde se escribe: window.cep.fs corre en el proceso del panel
  // y no ocupa el hilo principal de After Effects; el host queda como respaldo.
  const resolveBackend = useCallback((): Promise<DataBackend | null> => {
    if (!cep.isCEP) return Promise.resolve(null)
    if (!backendPromiseRef.current) {
      backendPromiseRef.current = (async () => {
        let backend: DataBackend = createHostBackend(cep.evalTS)
        const fs = (window as Window & { cep?: { fs?: unknown } }).cep?.fs
        if (isCepFs(fs)) {
          const folder = (await cep.evalTS('getDataFolderPath()')).trim()
          if (folder !== '' && folder !== 'false') backend = createCepFsBackend(fs, folder)
        }
        backendRef.current = backend
        // Permite comprobar desde el depurador remoto qué backend quedó activo.
        const debugWindow = window as Window & { __tkDataBackend?: string }
        debugWindow.__tkDataBackend = backend.kind
        return backend
      })()
    }
    return backendPromiseRef.current
  }, [cep])

  /**
   * Persist the store to disk. Blocked until a load has succeeded — never clobber good
   * data after a read error. Repeated write failures surface a one-time warning so saves
   * can't fail silently.
   */
  const persist = useCallback(
    async (s: StoreV2) => {
      if (!cep.isCEP || !canPersistRef.current) return
      const backend = await resolveBackend()
      if (!backend) return
      pendingStoreRef.current = s
      // Una sola escritura a la vez: si AE está ocupado, los guardados no se encolan; el
      // bucle en curso recoge el almacén más reciente.
      if (saveInFlightRef.current) return
      saveInFlightRef.current = true
      try {
        while (pendingStoreRef.current !== null) {
          const next: StoreV2 = pendingStoreRef.current
          pendingStoreRef.current = null
          let ok: boolean
          if (backend.saveMerged) {
            const result = backend.saveMerged(next)
            ok = result.ok
            // Muestra lo que añadió otra instancia de AE, salvo que el almacén ya haya
            // cambiado: entonces el siguiente guardado vuelve a fusionar.
            if (ok && result.merged && storeRef.current === next) commitStore(result.store)
          } else {
            ok = await backend.save(serializeStore(next))
          }
          if (ok) {
            saveFailuresRef.current = 0
            continue
          }
          saveFailuresRef.current += 1
          if (saveFailuresRef.current === SAVE_FAIL_THRESHOLD) {
            notify(
              'Unable to save timing data to disk. Your recent time may not be persisted.',
              'error',
            )
          }
        }
      } finally {
        saveInFlightRef.current = false
      }
    },
    [cep, notify, resolveBackend, commitStore],
  )

  /**
   * Credit elapsed wall-clock time to the active project using a monotonic delta from
   * the previous tick (never derived from an absolute start time -> no drift, no
   * negative jumps). The delta is credited to whatever local day the tick lands on.
   * Gaps longer than MAX_TICK_GAP_MS (sleep, clock jumps) are not credited.
   */
  const tick = useCallback(() => {
    const path = currentPathRef.current
    const now = Date.now()
    const deltaMs = now - lastTickRef.current
    lastTickRef.current = now
    if (path && deltaMs > MAX_TICK_GAP_MS) {
      // Un hueco así solo ocurre si el PC se suspendió o el reloj saltó: no es trabajo.
      notify(
        `Not counted: ${Math.round(deltaMs / 60000)} min while the computer was asleep or the panel was frozen.`,
        'info',
      )
    }
    const seconds = creditableSeconds(deltaMs)
    if (!path || !(seconds > 0)) return
    creditedRunRef.current += seconds
    pendingRef.current = addPending(pendingRef.current, dayKey(), seconds)
    setLiveSeconds(pendingTotal(pendingRef.current))
    if (now - lastSaveRef.current >= SAVE_INTERVAL_MS) {
      lastSaveRef.current = now
      persist(flushPending())
    }
  }, [persist, notify, flushPending])

  const clearCurrent = useCallback(() => {
    currentPathRef.current = null
    currentTitleRef.current = ''
    setCurrentProject(null)
  }, [])

  /** Attach the timer to `path` and start accumulating from now. */
  const beginTiming = useCallback(
    (path: string, title: string) => {
      // Si quedara tiempo pendiente, pertenece al proyecto anterior: se vuelca antes de cambiar.
      flushPending()
      commitStore(upsertProject(storeRef.current, path, title))
      currentPathRef.current = path
      currentTitleRef.current = title
      setCurrentProject({ path, title })
      const now = Date.now()
      lastTickRef.current = now
      lastSaveRef.current = now
      creditedRunRef.current = 0
      runningRef.current = true
      setRunning(true)
    },
    [commitStore, flushPending],
  )

  /** Stop the timer, flushing the final partial delta and saving. */
  const doPause = useCallback(
    (showNotice: boolean) => {
      if (!runningRef.current) return
      tick() // flush partial time before stopping
      const saved = flushPending()
      runningRef.current = false
      setRunning(false)
      persist(saved)
      if (showNotice) {
        const total = projectTotal(saved, currentPathRef.current ?? '')
        notify(`Timer paused for: ${currentTitleRef.current}\nTotal time: ${formatTime(total)}`, 'info')
      }
    },
    [tick, flushPending, persist, notify],
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
      const prev: SnapshotMachineState = {
        previousPath: previousPathRef.current,
        emptyPolls: emptyPollsRef.current,
        pendingOpenPath: pendingOpenPathRef.current,
        convertedPending: convertedPendingRef.current,
      }
      const { state: next, effects } = reduceSnapshot(prev, snap, (p) =>
        projectTotal(storeRef.current, p),
      )
      for (const effect of effects) {
        switch (effect.type) {
          case 'pause':
            doPause(false)
            break
          case 'clearCurrent':
            clearCurrent()
            break
          case 'notify':
            notify(effect.message, effect.kind)
            break
          case 'switchProject':
            commitStore(upsertProject(storeRef.current, effect.path, effect.title))
            if (effect.autoStart) {
              beginTiming(effect.path, effect.title)
            } else {
              // Known project with no time: make it current but stay paused.
              currentPathRef.current = effect.path
              currentTitleRef.current = effect.title
              setCurrentProject({ path: effect.path, title: effect.title })
              runningRef.current = false
              setRunning(false)
            }
            break
        }
      }
      previousPathRef.current = next.previousPath
      emptyPollsRef.current = next.emptyPolls
      pendingOpenPathRef.current = next.pendingOpenPath
      if (next.convertedPending !== prev.convertedPending) setConvertedPending(next.convertedPending)
    },
    [doPause, clearCurrent, commitStore, beginTiming, notify, setConvertedPending],
  )

  /** Fetch + parse a fresh host snapshot. Returns null off-host or on malformed data. */
  const fetchSnapshot = useCallback(async (): Promise<HostSnapshot | null> => {
    const raw = await withTimeout(cep.evalTS('getSnapshot()'), HOST_CALL_TIMEOUT_MS, '', () =>
      console.warn('[host] getSnapshot timed out after 60 s'),
    )
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
      // Sin cambios no hace falta volver a renderizar el panel.
      if (!sameSnapshot(lastSnapshotRef.current, parsed)) setSnapshot(parsed)
      lastSnapshotRef.current = parsed
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
    const backend = await resolveBackend()
    const raw = backend ? await backend.load() : ''
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
    if (backend && (result.migratedFrom === 'v1' || result.migratedFrom === 'legacy')) {
      // Back up the ORIGINAL raw payload once, then persist the migrated v2 store.
      await backend.saveBackupOnce(raw)
      await backend.save(serializeStore(result.store))
    }
    backend?.markLoaded?.(result.store)
    commitStore(result.store)
    canPersistRef.current = true
    saveFailuresRef.current = 0
    return result
  }, [resolveBackend, commitStore, notify])

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
    setAutoPaused(null)
    beginTiming(path, title)
    notify(`Timer started for: ${title}`, 'success')
  }, [fetchSnapshot, notify, beginTiming, setAutoPaused])

  const pause = useCallback(() => {
    setAutoPaused(null)
    if (!runningRef.current) return
    doPause(true)
  }, [doPause, setAutoPaused])

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

  const setProjectColor = useCallback(
    (path: string, color: string | null) => {
      const next = setProjectColorInStore(storeRef.current, path, color)
      if (next === storeRef.current) return
      commitStore(next)
      persist(next)
    },
    [commitStore, persist],
  )

  const refresh = useCallback(async () => {
    if (runningRef.current) doPause(false)
    clearCurrent()
    previousPathRef.current = null
    pendingOpenPathRef.current = null
    setConvertedPending(null)
    setAutoPaused(null)
    await loadFromDisk()
    notify('Timer data refreshed successfully.', 'success')
  }, [doPause, clearCurrent, loadFromDisk, notify, setConvertedPending, setAutoPaused])

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

  const setIdleThreshold = useCallback(
    (seconds: number) => {
      writeIdleThreshold(seconds)
      idleThresholdRef.current = seconds
      setIdleThresholdState(seconds)
      idleFailuresRef.current = 0
      setIdleUnavailable(false)
      if (seconds <= 0) setAutoPaused(null)
    },
    [setAutoPaused],
  )

  /** Pausa por inactividad: descuenta el tramo sin actividad, que ya se había sumado. */
  const idlePause = useCallback(
    (discountSeconds: number) => {
      const path = currentPathRef.current
      if (!path || !runningRef.current) return
      tick()
      const flushed = flushPending()
      runningRef.current = false
      setRunning(false)
      const next = removeTime(flushed, path, spanByDay(Date.now(), discountSeconds))
      commitStore(next)
      persist(next)
      setAutoPaused(path)
      notify(
        `Paused: no activity for ${formatIdleDuration(discountSeconds)}. That time was not counted.`,
        'info',
      )
    },
    [tick, flushPending, commitStore, persist, setAutoPaused, notify],
  )

  /** Reanuda solo si sigue abierto y guardado el proyecto que se pausó. */
  const idleResume = useCallback(() => {
    const path = autoPausedPathRef.current
    const snap = lastSnapshotRef.current
    setAutoPaused(null)
    if (!path || runningRef.current || !snap || snap.unsaved || snap.projectPath !== path) return
    const title = currentTitleRef.current || snap.projectName || basename(path)
    beginTiming(path, title)
    notify(`Activity detected. Timer resumed for: ${title}`, 'success')
  }, [setAutoPaused, beginTiming, notify])

  const handleIdleReading = useCallback(
    (idleSeconds: number) => {
      const decision = decideIdle({
        idleSeconds,
        thresholdSeconds: idleThresholdRef.current,
        running: runningRef.current,
        currentPath: currentPathRef.current,
        autoPausedPath: autoPausedPathRef.current,
        runSeconds: creditedRunRef.current,
      })
      if (decision.type === 'pause') idlePause(decision.discountSeconds)
      else if (decision.type === 'resume') idleResume()
      else if (decision.type === 'forget') setAutoPaused(null)
    },
    [idlePause, idleResume, setAutoPaused],
  )
  const idleHandlerRef = useRef(handleIdleReading)
  useEffect(() => {
    idleHandlerRef.current = handleIdleReading
  }, [handleIdleReading])

  // --- Effects ---

  // Initial load (with migration/backup).
  useEffect(() => {
    void loadFromDisk()
  }, [loadFromDisk])

  // Initial host snapshot.
  useEffect(() => {
    void pollSnapshot()
  }, [pollSnapshot])

  // Host snapshot polling: slower while paused; see src/lib/polling.ts. `running` en las
  // dependencias reprograma el sondeo al arrancar o pausar: si no, tras Start seguiría
  // pendiente el temporizador de 10 s programado en pausa.
  useEffect(() => {
    let cancelled = false
    let timer = 0
    const schedule = () => {
      timer = window.setTimeout(async () => {
        await pollSnapshot()
        if (!cancelled) schedule()
      }, nextPollDelay(runningRef.current, emptyPollsRef.current))
    }
    schedule()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [pollSnapshot, running])

  // AE no emite eventos de cambio de proyecto: sondear al volver al panel acorta la espera
  // sin subir la cadencia de fondo. mouseenter y no pointerenter: CEP 11 en macOS no emite
  // Pointer Events.
  useEffect(() => {
    let lastTrigger = 0
    const trigger = () => {
      const now = Date.now()
      if (now - lastTrigger < TRIGGER_MIN_GAP_MS) return
      lastTrigger = now
      void pollSnapshot()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') trigger()
    }
    const root = document.documentElement
    window.addEventListener('focus', trigger)
    root.addEventListener('mouseenter', trigger)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', trigger)
      root.removeEventListener('mouseenter', trigger)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [pollSnapshot])

  // El lector de inactividad solo corre si la función está activada y hay algo que vigilar:
  // el timer en marcha o una pausa automática pendiente de reanudar. Desactivada, no se
  // lanza ningún proceso.
  const idleActive =
    cep.isCEP && idleThreshold > 0 && !idleUnavailable && (running || autoPausedPath !== null)
  useEffect(() => {
    if (!idleActive) return
    let restartTimer = 0
    const node = getCepNode()
    const source = node
      ? startIdleSource(node, IDLE_POLL_SECONDS, (seconds) => {
          if (seconds === null) {
            idleFailuresRef.current += 1
            if (idleFailuresRef.current >= IDLE_MAX_FAILURES) {
              setIdleUnavailable(true)
              notify('Auto-pause is unavailable: the panel could not read system activity.', 'warning')
            } else {
              restartTimer = window.setTimeout(() => setIdleRestart((n) => n + 1), 5000)
            }
            return
          }
          idleFailuresRef.current = 0
          // Permite comprobar la lectura desde el depurador remoto.
          const debugWindow = window as Window & { __tkIdle?: unknown }
          debugWindow.__tkIdle = { seconds, at: Date.now() }
          idleHandlerRef.current(seconds)
        })
      : null
    if (!source) {
      setIdleUnavailable(true)
      notify('Auto-pause is unavailable on this computer.', 'warning')
      return
    }
    const stop = () => source.stop()
    window.addEventListener('beforeunload', stop)
    return () => {
      window.clearTimeout(restartTimer)
      window.removeEventListener('beforeunload', stop)
      stop()
    }
  }, [idleActive, idleRestart, notify])

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
      const saved = flushPending()
      // Síncrono cuando hay cep.fs: un evalScript lanzado al descargarse el panel puede
      // no llegar a ejecutarse.
      const backend = backendRef.current
      if (backend?.saveMerged && cep.isCEP && canPersistRef.current) {
        backend.saveMerged(saved)
        return
      }
      void persist(saved)
    }
    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        if (runningRef.current) tick()
        persist(flushPending())
      }
    }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onHidden)
    }
  }, [tick, flushPending, persist, cep])

  const elapsedSeconds = currentProject
    ? Math.floor(projectTotal(store, currentProject.path) + liveSeconds)
    : 0

  const clock = useMemo(() => ({ elapsedSeconds, liveSeconds }), [elapsedSeconds, liveSeconds])

  const value = useMemo<TimerContextValue>(
    () => ({
      store,
      running,
      currentProject,
      snapshot,
      convertedPending,
      useDescriptiveFormat,
      notice,
      clearNotice,
      start,
      pause,
      resetProject,
      removeProject,
      setProjectColor,
      refresh,
      openProject,
      toggleTimeFormat,
      idleThreshold,
      setIdleThreshold,
    }),
    [
      store,
      running,
      currentProject,
      snapshot,
      convertedPending,
      useDescriptiveFormat,
      notice,
      clearNotice,
      start,
      pause,
      resetProject,
      removeProject,
      setProjectColor,
      refresh,
      openProject,
      toggleTimeFormat,
      idleThreshold,
      setIdleThreshold,
    ],
  )

  return (
    <TimerContext.Provider value={value}>
      <TimerClockContext.Provider value={clock}>{children}</TimerClockContext.Provider>
    </TimerContext.Provider>
  )
}

export function useTimerClock(): TimerClockValue {
  return useContext(TimerClockContext)
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimer must be used within a TimerProvider')
  return ctx
}
