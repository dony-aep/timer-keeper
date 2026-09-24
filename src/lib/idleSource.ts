/**
 * Tiempo sin teclado ni ratón en todo el sistema, leído con el Node de CEP. After Effects no
 * avisa al panel de la actividad del usuario, y el panel solo ve el ratón cuando pasa por
 * encima, así que la señal sale del sistema operativo.
 */

/** Segundos sin actividad, o null cuando no hay dato (el lector falló o terminó). */
export type IdleListener = (idleSeconds: number | null) => void

export interface IdleSource {
  readonly kind: 'windows' | 'macos'
  /** PID del proceso auxiliar de Windows, para comprobar que no queda huérfano. */
  readonly helperPid: number | null
  stop(): void
}

interface ChildLike {
  pid?: number
  stdout: { on(event: 'data', cb: (chunk: unknown) => void): void } | null
  on(event: 'exit', cb: () => void): void
  on(event: 'error', cb: () => void): void
  kill(): void
}

export interface NodeLike {
  platform: string
  pid: number
  spawn(cmd: string, args: string[], opts: { windowsHide: boolean }): ChildLike
  execFile(cmd: string, args: string[], cb: (err: unknown, stdout: string) => void): void
}

/** El Node de CEP, o null si el manifest no lo activa (`--enable-nodejs`). */
export function getCepNode(): NodeLike | null {
  const w = window as unknown as {
    cep_node?: { require: (m: string) => unknown }
    require?: (m: string) => unknown
  }
  const req = w.cep_node?.require ?? w.require
  if (!req) return null
  try {
    const cp = req('child_process') as {
      spawn: NodeLike['spawn']
      execFile: NodeLike['execFile']
    }
    const proc = req('process') as { platform: string; pid: number }
    return {
      platform: proc.platform,
      pid: proc.pid,
      spawn: cp.spawn,
      execFile: (cmd, args, cb) => cp.execFile(cmd, args, cb),
    }
  } catch {
    return null
  }
}

/** -EncodedCommand espera UTF-16LE en base64; evita escribir un .ps1 y los problemas de comillas. */
export function encodePowerShell(script: string): string {
  let bytes = ''
  for (let i = 0; i < script.length; i++) {
    const code = script.charCodeAt(i)
    bytes += String.fromCharCode(code & 0xff, code >> 8)
  }
  return btoa(bytes)
}

/**
 * Bucle de PowerShell que imprime los milisegundos sin actividad. Termina solo si el proceso
 * del panel desaparece (After Effects cerrado o colgado) o si ya no puede escribir en la
 * tubería: así no queda un powershell.exe huérfano.
 */
export function windowsIdleScript(parentPid: number, intervalSeconds: number): string {
  return `$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class TkIdle {
  [StructLayout(LayoutKind.Sequential)]
  struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
  [DllImport("user32.dll")] static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
  public static uint IdleMs() {
    var info = new LASTINPUTINFO();
    info.cbSize = (uint)Marshal.SizeOf(info);
    if (!GetLastInputInfo(ref info)) return 0;
    return unchecked((uint)Environment.TickCount - info.dwTime);
  }
}
'@
while ($true) {
  if (-not (Get-Process -Id ${parentPid} -ErrorAction SilentlyContinue)) { exit 0 }
  [Console]::Out.WriteLine([TkIdle]::IdleMs())
  [Console]::Out.Flush()
  Start-Sleep -Seconds ${intervalSeconds}
}
`
}

/** Última línea numérica completa de un trozo de stdout, en segundos. */
export function parseIdleMsLines(text: string): number | null {
  const lines = text.split(/\r?\n/).filter((l) => /^\d+$/.test(l.trim()))
  if (lines.length === 0) return null
  return Math.floor(Number(lines[lines.length - 1].trim()) / 1000)
}

/** HIDIdleTime de `ioreg -c IOHIDSystem` viene en nanosegundos. */
export function parseIoregIdle(output: string): number | null {
  const match = /"HIDIdleTime"\s*=\s*(\d+)/.exec(output)
  if (!match) return null
  return Math.floor(Number(match[1]) / 1e9)
}

export function startIdleSource(node: NodeLike, intervalSeconds: number, listener: IdleListener): IdleSource | null {
  if (node.platform === 'win32') return startWindows(node, intervalSeconds, listener)
  if (node.platform === 'darwin') return startMac(node, intervalSeconds, listener)
  return null
}

function startWindows(node: NodeLike, intervalSeconds: number, listener: IdleListener): IdleSource {
  const child = node.spawn(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-EncodedCommand',
      encodePowerShell(windowsIdleScript(node.pid, intervalSeconds)),
    ],
    { windowsHide: true },
  )
  let stopped = false
  let pending = ''
  child.stdout?.on('data', (chunk) => {
    pending += String(chunk)
    const cut = pending.lastIndexOf('\n')
    if (cut < 0) return
    const seconds = parseIdleMsLines(pending.slice(0, cut))
    pending = pending.slice(cut + 1)
    if (seconds !== null) listener(seconds)
  })
  const dead = () => {
    if (!stopped) listener(null)
  }
  child.on('exit', dead)
  child.on('error', dead)
  return {
    kind: 'windows',
    helperPid: child.pid ?? null,
    stop() {
      stopped = true
      child.kill()
    },
  }
}

function startMac(node: NodeLike, intervalSeconds: number, listener: IdleListener): IdleSource {
  let stopped = false
  const poll = () => {
    node.execFile('/usr/sbin/ioreg', ['-c', 'IOHIDSystem', '-d', '4'], (err, stdout) => {
      if (stopped) return
      listener(err ? null : parseIoregIdle(String(stdout)))
    })
  }
  poll()
  const timer = window.setInterval(poll, intervalSeconds * 1000)
  return {
    kind: 'macos',
    helperPid: null,
    stop() {
      stopped = true
      window.clearInterval(timer)
    },
  }
}
