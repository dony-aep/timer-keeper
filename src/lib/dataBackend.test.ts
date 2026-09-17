import { describe, it, expect, vi } from 'vitest'
import { createCepFsBackend, createHostBackend } from './dataBackend'
import { FakeFs } from './testFakeFs'
import { serializeStore } from './store'

/** evalTS falso: responde según el nombre de la función y registra las llamadas. */
function fakeHost(responses: Record<string, string>) {
  const calls: string[] = []
  const evalTS = async (fnCall: string) => {
    calls.push(fnCall)
    const name = fnCall.slice(0, fnCall.indexOf('('))
    return responses[name] ?? ''
  }
  return { calls, evalTS }
}

describe('createHostBackend', () => {
  it('reports a save as successful only when the host answers "true"', async () => {
    expect(await createHostBackend(fakeHost({ saveData: 'true' }).evalTS).save('{}')).toBe(true)
    expect(await createHostBackend(fakeHost({ saveData: '' }).evalTS).save('{}')).toBe(false)
    expect(await createHostBackend(fakeHost({ saveData: 'false' }).evalTS).save('{}')).toBe(false)
  })

  it('escapes single quotes in the JSON sent to saveData', async () => {
    const host = fakeHost({ saveData: 'true' })
    await createHostBackend(host.evalTS).save('{"title":"It\'s"}')
    expect(host.calls[0]).toBe(`saveData('{"title":"It\\'s"}')`)
  })

  it('loads the main file without asking for the backup when it is usable', async () => {
    const host = fakeHost({ loadData: '{"version":2,"projects":[]}', loadBackupData: '{"b":1}' })
    expect(await createHostBackend(host.evalTS).load()).toBe('{"version":2,"projects":[]}')
    expect(host.calls).toEqual(['loadData()'])
  })

  it('falls back to the backup when the main file is missing', async () => {
    const host = fakeHost({ loadData: '{}', loadBackupData: '{"b":1}' })
    expect(await createHostBackend(host.evalTS).load()).toBe('{"b":1}')
  })

  it('reports a read error when neither file could be read', async () => {
    const host = fakeHost({ loadData: 'false', loadBackupData: 'false' })
    expect(await createHostBackend(host.evalTS).load()).toBe('false')
  })

  it('treats a save that never answers as failed after 60 s', async () => {
    vi.useFakeTimers()
    try {
      const backend = createHostBackend(() => new Promise<string>(() => {}))
      const saved = backend.save('{}')
      vi.advanceTimersByTime(60000)
      expect(await saved).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('createCepFsBackend', () => {
  const main = 'C:/data/timerData.json'
  const project = (seconds: number) => ({
    path: 'C:\\p\\A.aep',
    title: 'A.aep',
    totalSeconds: seconds,
    daily: { '2026-09-16': seconds },
  })

  function setup() {
    const fs = new FakeFs()
    fs.dirs.add('C:/data')
    return { fs, backend: createCepFsBackend(fs, 'C:\\data') }
  }

  it('saves synchronously through saveMerged', () => {
    const { fs, backend } = setup()
    const store = { version: 2 as const, projects: [project(10)] }
    expect(backend.saveMerged?.(store)).toEqual({ ok: true, store, merged: false })
    expect(JSON.parse(fs.text(main) as string)).toEqual(store)
  })

  it('merges time another instance wrote after markLoaded', () => {
    const { fs, backend } = setup()
    const loaded = { version: 2 as const, projects: [project(100)] }
    fs.put(main, serializeStore(loaded))
    backend.markLoaded?.(loaded)
    fs.put(main, serializeStore({ version: 2, projects: [project(130)] }))
    const result = backend.saveMerged?.({ version: 2, projects: [project(160)] })
    expect(result?.merged).toBe(true)
    expect(JSON.parse(fs.text(main) as string).projects[0].totalSeconds).toBe(190)
  })

  it('does not merge its own previous save again', () => {
    const { fs, backend } = setup()
    const loaded = { version: 2 as const, projects: [project(100)] }
    fs.put(main, serializeStore(loaded))
    backend.markLoaded?.(loaded)
    backend.saveMerged?.({ version: 2, projects: [project(130)] })
    const second = backend.saveMerged?.({ version: 2, projects: [project(160)] })
    expect(second?.merged).toBe(false)
    expect(JSON.parse(fs.text(main) as string).projects[0].totalSeconds).toBe(160)
  })
})
