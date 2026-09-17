/**
 * Resuelve con `fallback` si `promise` no termina en `ms`; la respuesta tardía se ignora.
 * Nunca rechaza: un rechazo también se resuelve con `fallback`. Sin esto, una llamada a
 * evalScript cuyo callback no llega deja bloqueado para siempre a quien la espera.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  onTimeout?: () => void,
): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      onTimeout?.()
      resolve(fallback)
    }, ms)
    const finish = (value: T) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }
    promise.then(finish, () => finish(fallback))
  })
}

/**
 * Límite para llamadas periódicas al host. AE bloquea su hilo en renders y diálogos; un
 * límite corto encolaría más llamadas detrás de la que espera.
 */
export const HOST_CALL_TIMEOUT_MS = 60000
