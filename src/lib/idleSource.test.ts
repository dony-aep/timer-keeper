import { describe, it, expect } from 'vitest'
import {
  encodePowerShell,
  parseIdleMsLines,
  parseIoregIdle,
  startIdleSource,
  windowsIdleScript,
  type NodeLike,
} from './idleSource'

function fakeWindowsNode() {
  const handlers: Record<string, (arg?: unknown) => void> = {}
  const calls: { cmd: string; args: string[] }[] = []
  let killed = false
  const node: NodeLike = {
    platform: 'win32',
    pid: 4242,
    spawn(cmd, args) {
      calls.push({ cmd, args })
      return {
        pid: 777,
        stdout: { on: (_e, cb) => (handlers.data = cb as (arg?: unknown) => void) },
        on: (event: string, cb: () => void) => {
          handlers[event] = cb
        },
        kill: () => {
          killed = true
        },
      }
    },
    execFile() {},
  }
  return { node, handlers, calls, isKilled: () => killed }
}

describe('encodePowerShell', () => {
  it('encodes UTF-16LE base64, as -EncodedCommand expects', () => {
    const script = "Write-Output 'hi'"
    const bytes = atob(encodePowerShell(script))
    let decoded = ''
    for (let i = 0; i < bytes.length; i += 2) {
      decoded += String.fromCharCode(bytes.charCodeAt(i) | (bytes.charCodeAt(i + 1) << 8))
    }
    expect(decoded).toBe(script)
  })
})

describe('windowsIdleScript', () => {
  it('watches the panel process and prints at the given interval', () => {
    const script = windowsIdleScript(4242, 15)
    expect(script).toContain('Get-Process -Id 4242')
    expect(script).toContain('Start-Sleep -Seconds 15')
    expect(/[^\x00-\x7f]/.test(script)).toBe(false)
  })
})

describe('parseIdleMsLines', () => {
  it('takes the last complete number and converts to seconds', () => {
    expect(parseIdleMsLines('1500\r\n62999\r\n')).toBe(62)
  })

  it('ignores noise and returns null without numbers', () => {
    expect(parseIdleMsLines('warning\n')).toBeNull()
    expect(parseIdleMsLines('')).toBeNull()
  })
})

describe('parseIoregIdle', () => {
  it('reads HIDIdleTime in nanoseconds', () => {
    const out = '  |   "HIDIdleTime" = 125000000000\n  |   "Other" = 1'
    expect(parseIoregIdle(out)).toBe(125)
  })

  it('returns null when the key is missing', () => {
    expect(parseIoregIdle('nothing here')).toBeNull()
  })
})

describe('startIdleSource on Windows', () => {
  it('spawns one hidden PowerShell and reports lines split across chunks', () => {
    const { node, handlers, calls } = fakeWindowsNode()
    const seen: (number | null)[] = []
    const source = startIdleSource(node, 15, (s) => seen.push(s))
    expect(source?.helperPid).toBe(777)
    expect(calls).toHaveLength(1)
    expect(calls[0].cmd).toBe('powershell.exe')
    expect(calls[0].args).toContain('-EncodedCommand')
    handlers.data('12')
    handlers.data('000\r\n30')
    handlers.data('500\r\n')
    expect(seen).toEqual([12, 30])
  })

  it('reports null when the helper dies, but not after stop()', () => {
    const a = fakeWindowsNode()
    const seenA: (number | null)[] = []
    startIdleSource(a.node, 15, (s) => seenA.push(s))
    a.handlers.exit()
    expect(seenA).toEqual([null])

    const b = fakeWindowsNode()
    const seenB: (number | null)[] = []
    const source = startIdleSource(b.node, 15, (s) => seenB.push(s))
    source?.stop()
    b.handlers.exit()
    expect(seenB).toEqual([])
    expect(b.isKilled()).toBe(true)
  })
})

describe('startIdleSource on other platforms', () => {
  it('returns null where there is no reader', () => {
    const { node } = fakeWindowsNode()
    expect(startIdleSource({ ...node, platform: 'linux' }, 15, () => {})).toBeNull()
  })
})
