import { describe, it, expect } from 'vitest'
import {
  chooseLoadResult,
  isCepFs,
  isUsableJsonText,
  joinPath,
  normalizeFolder,
  readDataFile,
  readMainText,
  saveWithMerge,
  writeBackupOnce,
  writeDataFile,
} from './dataFile'
import { FakeFs } from './testFakeFs'
import { rebaseOnMerged, serializeStore } from './store'

const dir = 'C:/data'
const main = `${dir}/timerData.json`
const bak = `${dir}/timerData.bak.json`
const temp = `${dir}/timerData_temp.json`
const migrationBackup = `${dir}/timerData.v1.backup.json`

function fsWithDir(): FakeFs {
  const fs = new FakeFs()
  fs.dirs.add(dir)
  return fs
}

describe('normalizeFolder / joinPath', () => {
  it('uses forward slashes and a single separator', () => {
    expect(normalizeFolder('C:\\Users\\x\\TimerData\\')).toBe('C:/Users/x/TimerData')
    expect(joinPath('C:\\Users\\x\\TimerData', 'a.json')).toBe('C:/Users/x/TimerData/a.json')
    expect(joinPath('/Users/x/TimerData/', 'a.json')).toBe('/Users/x/TimerData/a.json')
  })
})

describe('writeDataFile', () => {
  it('writes the main file when none exists yet', () => {
    const fs = fsWithDir()
    expect(writeDataFile(fs, dir, '{"v":1}')).toBe(true)
    expect(fs.text(main)).toBe('{"v":1}')
    expect(fs.files.has(bak)).toBe(false)
    expect(fs.files.has(temp)).toBe(false)
  })

  it('keeps the previous version as .bak', () => {
    const fs = fsWithDir()
    fs.put(main, '{"old":1}')
    expect(writeDataFile(fs, dir, '{"new":1}')).toBe(true)
    expect(fs.text(main)).toBe('{"new":1}')
    expect(fs.text(bak)).toBe('{"old":1}')
    expect(fs.files.has(temp)).toBe(false)
  })

  it('rotates .bak on every save', () => {
    const fs = fsWithDir()
    fs.put(main, 'O')
    writeDataFile(fs, dir, 'A')
    writeDataFile(fs, dir, 'B')
    expect(fs.text(main)).toBe('B')
    expect(fs.text(bak)).toBe('A')
  })

  it('leaves the main file untouched when the temp write fails', () => {
    const fs = fsWithDir()
    fs.put(main, '{"old":1}')
    fs.failWrite.add(temp)
    expect(writeDataFile(fs, dir, '{"new":1}')).toBe(false)
    expect(fs.text(main)).toBe('{"old":1}')
    expect(fs.files.has(temp)).toBe(false)
  })

  it('leaves the main file untouched when it cannot be moved to .bak', () => {
    const fs = fsWithDir()
    fs.put(main, '{"old":1}')
    fs.failRename.add(main)
    expect(writeDataFile(fs, dir, '{"new":1}')).toBe(false)
    expect(fs.text(main)).toBe('{"old":1}')
    expect(fs.files.has(temp)).toBe(false)
  })

  it('restores .bak and keeps the temp copy when the final rename fails', () => {
    const fs = fsWithDir()
    fs.put(main, '{"old":1}')
    fs.failRename.add(temp)
    expect(writeDataFile(fs, dir, '{"new":1}')).toBe(false)
    expect(fs.text(main)).toBe('{"old":1}')
    expect(fs.text(temp)).toBe('{"new":1}')
  })

  it('creates the data folder when it is missing', () => {
    const fs = new FakeFs()
    expect(writeDataFile(fs, 'C:\\data\\', '{"v":1}')).toBe(true)
    expect(fs.dirs.has(dir)).toBe(true)
    expect(fs.text(main)).toBe('{"v":1}')
  })
})

describe('isUsableJsonText / chooseLoadResult', () => {
  it('accepts only real JSON data', () => {
    expect(isUsableJsonText('{"a":1}')).toBe(true)
    for (const text of ['', '  ', '{}', 'false', '{roto']) expect(isUsableJsonText(text)).toBe(false)
  })

  it('picks the first usable candidate, then errors, then corrupt text', () => {
    expect(chooseLoadResult(['{"a":1}', '{"b":1}'])).toBe('{"a":1}')
    expect(chooseLoadResult(['{}', '{"b":1}'])).toBe('{"b":1}')
    expect(chooseLoadResult(['{roto', '{"b":1}'])).toBe('{"b":1}')
    expect(chooseLoadResult(['false', '{}'])).toBe('false')
    expect(chooseLoadResult(['{roto', ''])).toBe('{roto')
    expect(chooseLoadResult(['', '{}'])).toBe('{}')
  })
})

describe('readDataFile', () => {
  it('reads the main file', () => {
    const fs = fsWithDir()
    fs.put(main, '{"main":1}')
    fs.put(bak, '{"bak":1}')
    expect(readDataFile(fs, dir)).toBe('{"main":1}')
  })

  it('falls back to .bak and then to the temp file', () => {
    const fs = fsWithDir()
    fs.put(bak, '{"bak":1}')
    expect(readDataFile(fs, dir)).toBe('{"bak":1}')
    fs.files.delete(bak)
    fs.put(temp, '{"temp":1}')
    expect(readDataFile(fs, dir)).toBe('{"temp":1}')
  })

  it('reports no data for an empty folder', () => {
    expect(readDataFile(fsWithDir(), dir)).toBe('{}')
  })

  it('returns corrupt text so saving stays blocked', () => {
    const fs = fsWithDir()
    fs.put(main, '{roto')
    expect(readDataFile(fs, dir)).toBe('{roto')
  })

  it('reports a read error when nothing usable could be read', () => {
    const fs = fsWithDir()
    fs.put(main, '{"main":1}')
    fs.failRead.add(main)
    expect(readDataFile(fs, dir)).toBe('false')
  })
})

describe('writeBackupOnce', () => {
  it('writes the migration backup only once', () => {
    const fs = fsWithDir()
    expect(writeBackupOnce(fs, dir, 'first')).toBe(true)
    expect(writeBackupOnce(fs, dir, 'second')).toBe(true)
    expect(fs.text(migrationBackup)).toBe('first')
  })
})

describe('isCepFs', () => {
  it('recognizes an object with the whole file API', () => {
    expect(isCepFs(new FakeFs())).toBe(true)
    expect(isCepFs(undefined)).toBe(false)
    expect(isCepFs({})).toBe(false)
    const partial = { ...new FakeFs() } as Record<string, unknown>
    expect(isCepFs(partial)).toBe(false)
  })
})

describe('saveWithMerge', () => {
  const A = 'C:\\p\\A.aep'
  const B = 'C:\\p\\B.aep'
  const DAY = '2026-09-16'
  const project = (path: string, seconds: number) => ({
    path,
    title: path.split('\\').pop() as string,
    totalSeconds: seconds,
    daily: { [DAY]: seconds },
  })
  const store = (...projects: ReturnType<typeof project>[]) => ({ version: 2 as const, projects })

  function loaded(fs: FakeFs, initial = store(project(A, 100))) {
    writeDataFile(fs, dir, serializeStore(initial))
    return { base: initial, text: readMainText(fs, dir) }
  }

  it('writes our store when nobody else touched the file', () => {
    const fs = fsWithDir()
    const sync = loaded(fs)
    const ours = store(project(A, 160))
    const result = saveWithMerge(fs, dir, ours, sync)
    expect(result.ok).toBe(true)
    expect(result.merged).toBe(false)
    expect(JSON.parse(fs.text(main) as string)).toEqual(ours)
    expect(result.sync.base).toBe(ours)
  })

  it('merges what another instance wrote since our last read', () => {
    const fs = fsWithDir()
    const sync = loaded(fs)
    fs.put(main, serializeStore(store(project(A, 130), project(B, 40))))
    const result = saveWithMerge(fs, dir, store(project(A, 160)), sync)
    expect(result.ok).toBe(true)
    expect(result.merged).toBe(true)
    expect(JSON.parse(fs.text(main) as string)).toEqual(store(project(A, 190), project(B, 40)))
  })

  it('does not overwrite a corrupt file written by someone else', () => {
    const fs = fsWithDir()
    const sync = loaded(fs)
    fs.put(main, '{roto')
    const result = saveWithMerge(fs, dir, store(project(A, 160)), sync)
    expect(result.ok).toBe(false)
    expect(fs.text(main)).toBe('{roto')
    expect(result.sync).toBe(sync)
  })

  it('does not overwrite a file it cannot read', () => {
    const fs = fsWithDir()
    const sync = loaded(fs)
    fs.put(main, serializeStore(store(project(A, 130))))
    fs.failRead.add(main)
    expect(saveWithMerge(fs, dir, store(project(A, 160)), sync).ok).toBe(false)
  })

  it('keeps what another instance wrote across two saves in a row', () => {
    // Al cerrar el panel se guarda dos veces seguidas (beforeunload y visibilitychange).
    // La segunda ve el archivo tal como lo dejó la primera y no vuelve a fusionar, así que
    // tiene que partir del resultado fusionado y no del almacén de antes.
    const fs = fsWithDir()
    const sync = loaded(fs)
    fs.put(main, serializeStore(store(project(A, 130), project(B, 40))))
    const ours = store(project(A, 160))
    const first = saveWithMerge(fs, dir, ours, sync)
    const current = rebaseOnMerged(ours, ours, first.store)
    const second = saveWithMerge(fs, dir, current, first.sync)
    expect(second.merged).toBe(false)
    expect(JSON.parse(fs.text(main) as string)).toEqual(store(project(A, 190), project(B, 40)))
  })

  it('writes the first save when no file exists yet', () => {
    const fs = fsWithDir()
    const result = saveWithMerge(fs, dir, store(project(A, 10)), { base: store(), text: '' })
    expect(result).toMatchObject({ ok: true, merged: false })
    expect(result.sync.text).toBe(readMainText(fs, dir))
  })
})
