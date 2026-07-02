import { useCallback, useEffect, useRef, useState } from 'react'
import {
  checkForUpdate,
  readCachedUpdate,
  type UpdateCheckResult,
  type UpdateInfo,
} from '../lib/updates'

/**
 * Panel-side update awareness. On mount it surfaces whatever the last
 * successful check found (instant and offline-safe), then refreshes from the
 * GitHub API if the daily throttle allows. `checkNow` is the flyout's manual
 * check — it bypasses the throttle and returns the outcome so the caller can
 * toast it.
 */
export function useUpdateCheck() {
  const [update, setUpdate] = useState<UpdateInfo | null>(() => readCachedUpdate())
  const startedRef = useRef(false)

  const apply = useCallback((result: UpdateCheckResult) => {
    if (result.status === 'update') setUpdate(result.update)
    else if (result.status === 'up-to-date') setUpdate(null)
    // 'skipped' / 'error': keep whatever the cache said
  }, [])

  useEffect(() => {
    if (startedRef.current) return // StrictMode double-invoke guard
    startedRef.current = true
    void checkForUpdate(false).then(apply)
  }, [apply])

  const checkNow = useCallback(async (): Promise<UpdateCheckResult> => {
    const result = await checkForUpdate(true)
    apply(result)
    return result
  }, [apply])

  return { update, checkNow }
}
