import { useRef, useCallback, useMemo } from 'react'

/** True when running inside Adobe CEP (After Effects panel). */
function isInsideCEP(): boolean {
  try {
    return typeof window !== 'undefined' && '__adobe_cep__' in window
  } catch {
    return false
  }
}

const CEP_AVAILABLE = isInsideCEP()

/**
 * Escape a string for injection into an `evalScript` single-quoted argument, matching
 * the v3 host contract: backslashes -> `\\`, single quotes -> `\'`, newlines -> `\n`.
 * Also escapes carriage returns and the Unicode line separators (U+2028/U+2029), which
 * would otherwise terminate the JS string literal the host evaluates and break the call.
 * Implemented per code unit so the source stays pure ASCII (no invisible characters).
 */
export function escapeForEval(str: string): string {
  let out = ''
  for (let i = 0; i < str.length; i++) {
    switch (str.charCodeAt(i)) {
      case 0x5c: // backslash
        out += '\\\\'
        break
      case 0x27: // single quote
        out += "\\'"
        break
      case 0x0a: // newline
        out += '\\n'
        break
      case 0x0d: // carriage return
        out += '\\r'
        break
      case 0x2028: // line separator
        out += '\\u2028'
        break
      case 0x2029: // paragraph separator
        out += '\\u2029'
        break
      default:
        out += str[i]
    }
  }
  return out
}

/**
 * Wraps the CEP CSInterface. `evalScript` is promisified; `evalTS` targets the
 * Timer Keeper host namespace (`$.global.TimerKeeper.<fn>(...)`).
 *
 * Outside CEP (e.g. `npm run dev` in a browser) every host call degrades gracefully:
 * `evalScript`/`evalTS` resolve with `''` instead of throwing, and the UI helpers
 * fall back to browser equivalents or no-ops. Nothing here can crash off-host.
 */
export function useCSInterface() {
  const ref = useRef<CSInterface | null>(null)

  const get = useCallback(() => {
    if (!CEP_AVAILABLE) return null
    if (!ref.current) {
      try {
        ref.current = new CSInterface()
      } catch {
        console.warn('CSInterface not available – running outside CEP')
      }
    }
    return ref.current
  }, [])

  const evalScript = useCallback(
    (script: string): Promise<string> =>
      new Promise((resolve) => {
        const cs = get()
        if (!cs) {
          // Off-host: resolve empty so callers can no-op gracefully.
          resolve('')
          return
        }
        cs.evalScript(script, (result: string) => {
          // CEP returns this sentinel when the ExtendScript engine throws.
          if (typeof result === 'string' && result.indexOf('EvalScript error') === 0) {
            console.error('[host] evalScript failed:', script, result)
            resolve('')
            return
          }
          resolve(result)
        })
      }),
    [get],
  )

  /**
   * Evaluate a call against the Timer Keeper host namespace.
   * Pass the bare call, e.g. `evalTS("getSnapshot()")` or
   * `evalTS(\`saveData('\${escapeForEval(json)}')\`)`.
   */
  const evalTS = useCallback(
    (fnCall: string): Promise<string> => evalScript(`$.global.TimerKeeper.${fnCall}`),
    [evalScript],
  )

  const openURL = useCallback(
    (url: string) => {
      const cs = get()
      if (cs) cs.openURLInDefaultBrowser(url)
      else if (typeof window !== 'undefined') window.open(url, '_blank')
    },
    [get],
  )

  const setPanelFlyout = useCallback(
    (menuXML: string) => {
      get()?.setPanelFlyoutMenu(menuXML)
    },
    [get],
  )

  const addEventListener = useCallback(
    (type: string, listener: (event: CSEvent) => void) => {
      get()?.addEventListener(type, listener)
    },
    [get],
  )

  const removeEventListener = useCallback(
    (type: string, listener: (event: CSEvent) => void) => {
      get()?.removeEventListener(type, listener)
    },
    [get],
  )

  return useMemo(
    () => ({
      isCEP: CEP_AVAILABLE,
      evalScript,
      evalTS,
      openURL,
      setPanelFlyout,
      addEventListener,
      removeEventListener,
    }),
    [evalScript, evalTS, openURL, setPanelFlyout, addEventListener, removeEventListener],
  )
}
