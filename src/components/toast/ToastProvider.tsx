import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Button as AriaButton } from 'react-aria-components'
import { useTimer, type NoticeKind } from '../../context/TimerContext'
import { Icon } from '../ui/Icon'
import styles from './Toast.module.css'

const EXIT_MS = 220
const MAX_VISIBLE = 4

/* Auto-dismiss: scaled to reading time instead of a flat delay. */
const MIN_DISMISS_MS = 5000
const MAX_DISMISS_MS = 12000
const MS_PER_CHAR = 45 // ~comfortable reading pace
const SEVERITY_FACTOR = 1.3 // warnings/errors linger a little longer
const RESUME_GRACE_MS = 2000 // time left after the pointer leaves a hovered toast

function autoDismissDelay(message: string, kind: NoticeKind): number {
  const base = Math.min(Math.max(MIN_DISMISS_MS, message.length * MS_PER_CHAR), MAX_DISMISS_MS)
  return kind === 'warning' || kind === 'error' ? Math.round(base * SEVERITY_FACTOR) : base
}

/** Monochrome vocabulary: state is icon + luminance, never hue. */
const KIND_ICON: Record<NoticeKind, string> = {
  success: 'check_circle',
  warning: 'warning',
  error: 'error',
  info: 'info',
}

interface ToastItem {
  id: number
  message: string
  kind: NoticeKind
  leaving: boolean
}

interface ToastContextValue {
  push: (message: string, kind?: NoticeKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToasts(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToasts must be used within a ToastProvider')
  return ctx
}

/**
 * Bridges TimerContext notices into the toast stack. A ref guards against
 * duplicate pushes from StrictMode's double-invoked effects — the v3 panel
 * had a double-listener bug on the close button; this system attaches every
 * handler exactly once through React.
 */
function NoticeBridge() {
  const { notice, clearNotice } = useTimer()
  const { push } = useToasts()
  const lastRef = useRef<unknown>(null)

  useEffect(() => {
    if (!notice || lastRef.current === notice) return
    lastRef.current = notice
    push(notice.message, notice.kind)
    clearNotice()
  }, [notice, push, clearNotice])

  return null
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const timersRef = useRef(new Map<number, number>())

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const dismiss = useCallback(
    (id: number) => {
      const pending = timersRef.current.get(id)
      if (pending !== undefined) {
        window.clearTimeout(pending)
        timersRef.current.delete(id)
      }
      setToasts((list) =>
        list.map((t) => (t.id === id && !t.leaving ? { ...t, leaving: true } : t)),
      )
      window.setTimeout(() => remove(id), EXIT_MS)
    },
    [remove],
  )

  const push = useCallback(
    (message: string, kind: NoticeKind = 'info') => {
      const id = ++idRef.current
      setToasts((list) => {
        const next = [...list, { id, message, kind, leaving: false }]
        // Cap the stack: silently drop the oldest.
        return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next
      })
      timersRef.current.set(
        id,
        window.setTimeout(() => dismiss(id), autoDismissDelay(message, kind)),
      )
    },
    [dismiss],
  )

  /** Pointer entered a toast: hold it open while it's being read. */
  const hold = useCallback((id: number) => {
    const pending = timersRef.current.get(id)
    if (pending !== undefined) {
      window.clearTimeout(pending)
      timersRef.current.delete(id)
    }
  }, [])

  /** Pointer left: give a short grace period, then dismiss. */
  const resume = useCallback(
    (id: number) => {
      if (timersRef.current.has(id)) return // never held (e.g. already leaving)
      timersRef.current.set(
        id,
        window.setTimeout(() => dismiss(id), RESUME_GRACE_MS),
      )
    },
    [dismiss],
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      timers.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      <NoticeBridge />
      {children}
      <div className={styles.viewport} aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            className={[
              styles.toast,
              styles[toast.kind],
              toast.leaving ? styles.leaving : '',
            ].join(' ')}
            onMouseEnter={() => hold(toast.id)}
            onMouseLeave={() => resume(toast.id)}
          >
            <Icon
              name={KIND_ICON[toast.kind]}
              size={17}
              filled={toast.kind === 'error' || toast.kind === 'warning'}
              className={styles.kindIcon}
            />
            <p className={styles.message}>{toast.message}</p>
            <AriaButton
              className={styles.close}
              aria-label="Dismiss notification"
              onPress={() => dismiss(toast.id)}
            >
              <Icon name="close" size={14} />
            </AriaButton>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
