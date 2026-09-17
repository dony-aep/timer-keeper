import { escapeForEval } from '../hooks/useCSInterface'
import {
  chooseLoadResult,
  isUsableJsonText,
  readDataFile,
  writeBackupOnce,
  writeDataFile,
  type CepFsLike,
} from './dataFile'

/** Dónde se leen y escriben los datos del timer. */
export interface DataBackend {
  readonly kind: 'cep-fs' | 'host'
  /** Mismo contrato que loadData() del host: JSON, '{}' sin datos, 'false' si no se pudo leer. */
  load(): Promise<string>
  save(json: string): Promise<boolean>
  saveBackupOnce(raw: string): Promise<boolean>
  /** Guardado síncrono para beforeunload; solo existe con cep.fs. */
  saveNow?: (json: string) => boolean
}

export function createCepFsBackend(fs: CepFsLike, folder: string): DataBackend {
  return {
    kind: 'cep-fs',
    load: async () => readDataFile(fs, folder),
    save: async (json) => writeDataFile(fs, folder, json),
    saveBackupOnce: async (raw) => writeBackupOnce(fs, folder, raw),
    saveNow: (json) => writeDataFile(fs, folder, json),
  }
}

/** Respaldo para motores CEP sin window.cep.fs: escribe desde ExtendScript, en el hilo de AE. */
export function createHostBackend(evalTS: (fnCall: string) => Promise<string>): DataBackend {
  return {
    kind: 'host',
    load: async () => {
      const main = await evalTS('loadData()')
      if (isUsableJsonText(main)) return main
      const backup = await evalTS('loadBackupData()')
      return chooseLoadResult([main, backup])
    },
    save: async (json) => (await evalTS(`saveData('${escapeForEval(json)}')`)) === 'true',
    saveBackupOnce: async (raw) => (await evalTS(`saveBackup('${escapeForEval(raw)}')`)) === 'true',
  }
}
