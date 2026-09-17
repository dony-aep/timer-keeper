import { escapeForEval } from '../hooks/useCSInterface'
import type { StoreV2 } from '../types/data'
import {
  chooseLoadResult,
  isUsableJsonText,
  readDataFile,
  readMainText,
  saveWithMerge,
  writeBackupOnce,
  writeDataFile,
  type CepFsLike,
  type SyncState,
} from './dataFile'
import { HOST_CALL_TIMEOUT_MS, withTimeout } from './withTimeout'

/** Dónde se leen y escriben los datos del timer. */
export interface DataBackend {
  readonly kind: 'cep-fs' | 'host'
  /** Mismo contrato que loadData() del host: JSON, '{}' sin datos, 'false' si no se pudo leer. */
  load(): Promise<string>
  save(json: string): Promise<boolean>
  saveBackupOnce(raw: string): Promise<boolean>
  /** Solo cep-fs: fija la base de la fusión tras cargar o migrar. */
  markLoaded?: (store: StoreV2) => void
  /**
   * Solo cep-fs y síncrono (sirve en beforeunload): guarda fusionando antes lo que otra
   * instancia de After Effects haya escrito desde la última carga o guardado propio.
   */
  saveMerged?: (store: StoreV2) => { ok: boolean; store: StoreV2; merged: boolean }
}

export function createCepFsBackend(fs: CepFsLike, folder: string): DataBackend {
  let sync: SyncState = { base: { version: 2, projects: [] }, text: '' }
  return {
    kind: 'cep-fs',
    load: async () => readDataFile(fs, folder),
    save: async (json) => writeDataFile(fs, folder, json),
    saveBackupOnce: async (raw) => writeBackupOnce(fs, folder, raw),
    markLoaded: (store) => {
      sync = { base: store, text: readMainText(fs, folder) }
    },
    saveMerged: (store) => {
      const result = saveWithMerge(fs, folder, store, sync)
      sync = result.sync
      return { ok: result.ok, store: result.store, merged: result.merged }
    },
  }
}

/**
 * Respaldo para motores CEP sin window.cep.fs: escribe desde ExtendScript, en el hilo de AE.
 * Sin fusión: si dos instancias de AE guardan a la vez, gana la última escritura.
 */
export function createHostBackend(evalTS: (fnCall: string) => Promise<string>): DataBackend {
  // Una llamada sin respuesta bloquearía la cola de guardados de TimerContext.
  const call = (fnCall: string) => withTimeout(evalTS(fnCall), HOST_CALL_TIMEOUT_MS, '')
  return {
    kind: 'host',
    load: async () => {
      const main = await call('loadData()')
      if (isUsableJsonText(main)) return main
      const backup = await call('loadBackupData()')
      return chooseLoadResult([main, backup])
    },
    save: async (json) => (await call(`saveData('${escapeForEval(json)}')`)) === 'true',
    saveBackupOnce: async (raw) => (await call(`saveBackup('${escapeForEval(raw)}')`)) === 'true',
  }
}
