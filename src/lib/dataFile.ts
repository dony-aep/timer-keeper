/**
 * Lectura y escritura de timerData.json con la API de archivos de CEP (window.cep.fs).
 * Esa API corre en el proceso del panel: guardar ya no ocupa el hilo principal de
 * After Effects, como pasaba al escribir desde ExtendScript.
 */

/** Subconjunto de window.cep.fs que usa el guardado (ver CEPEngine_extensions.js de CEP). */
export interface CepFsLike {
  readFile(path: string, encoding?: string): { data: string; err: number }
  writeFile(path: string, data: string, encoding?: string): { err: number }
  rename(oldPath: string, newPath: string): { err: number }
  deleteFile(path: string): { err: number }
  stat(path: string): {
    err: number
    data: { isFile(): boolean; isDirectory(): boolean; mtime?: unknown }
  }
  makedir(path: string): { err: number }
}

export const FS_NO_ERROR = 0
export const FS_ERR_NOT_FOUND = 3
export const UTF8 = 'UTF-8'

export const DATA_FILE = 'timerData.json'
export const BACKUP_FILE = 'timerData.bak.json'
export const TEMP_FILE = 'timerData_temp.json'
export const MIGRATION_BACKUP_FILE = 'timerData.v1.backup.json'

const FS_METHODS = ['readFile', 'writeFile', 'rename', 'deleteFile', 'stat', 'makedir'] as const

export function isCepFs(value: unknown): value is CepFsLike {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return FS_METHODS.every((name) => typeof candidate[name] === 'function')
}

// Barras normales: es el formato que se comprobó con cep.fs en Windows (AE 26.3).
export function normalizeFolder(folder: string): string {
  return folder.replace(/\\/g, '/').replace(/\/+$/, '')
}

export function joinPath(folder: string, name: string): string {
  return `${normalizeFolder(folder)}/${name}`
}

/** Texto con datos reales: ni vacío ni los centinelas '{}' / 'false' del host, y JSON válido. */
export function isUsableJsonText(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed === '' || trimmed === '{}' || trimmed === 'false') return false
  try {
    JSON.parse(trimmed)
    return true
  } catch {
    return false
  }
}

/**
 * Elige qué cargar entre varios candidatos en orden de preferencia, con el contrato de
 * loadData() del host ('' o '{}' = sin datos, 'false' = ilegible). Un archivo que existe
 * pero no parsea se devuelve tal cual para que parseStore lo marque como error y el
 * guardado quede bloqueado: empezar con un almacén vacío pisaría esos datos.
 */
export function chooseLoadResult(candidates: string[]): string {
  const usable = candidates.find(isUsableJsonText)
  if (usable !== undefined) return usable.trim()
  if (candidates.some((text) => text.trim() === 'false')) return 'false'
  const corrupt = candidates.find((text) => {
    const trimmed = text.trim()
    return trimmed !== '' && trimmed !== '{}'
  })
  return corrupt !== undefined ? corrupt.trim() : '{}'
}

function fileExists(fs: CepFsLike, path: string): boolean {
  const result = fs.stat(path)
  return result.err === FS_NO_ERROR && result.data.isFile()
}

function readCandidate(fs: CepFsLike, path: string): string {
  if (!fileExists(fs, path)) return ''
  const result = fs.readFile(path, UTF8)
  return result.err === FS_NO_ERROR ? String(result.data ?? '') : 'false'
}

/** Carga el principal y, si falta o no sirve, la copia anterior o el temporal. */
export function readDataFile(fs: CepFsLike, folder: string): string {
  return chooseLoadResult(
    [DATA_FILE, BACKUP_FILE, TEMP_FILE].map((name) => readCandidate(fs, joinPath(folder, name))),
  )
}

/**
 * Escribe el temporal, mueve el principal a .bak y coloca el temporal como principal.
 * Nunca borra el principal sin haber guardado antes su contenido en .bak; si el último
 * paso falla, restaura el .bak y deja el temporal (puede ser la copia más reciente).
 */
export function writeDataFile(fs: CepFsLike, folder: string, json: string): boolean {
  const dir = normalizeFolder(folder)
  if (fs.stat(dir).err === FS_ERR_NOT_FOUND) fs.makedir(dir)

  const main = joinPath(dir, DATA_FILE)
  const backup = joinPath(dir, BACKUP_FILE)
  const temp = joinPath(dir, TEMP_FILE)

  if (fs.writeFile(temp, json, UTF8).err !== FS_NO_ERROR) {
    fs.deleteFile(temp)
    return false
  }

  const hadMain = fileExists(fs, main)
  if (hadMain) {
    // cep.fs.rename no sobrescribe: el destino tiene que estar libre.
    if (fileExists(fs, backup) && fs.deleteFile(backup).err !== FS_NO_ERROR) {
      fs.deleteFile(temp)
      return false
    }
    if (fs.rename(main, backup).err !== FS_NO_ERROR) {
      fs.deleteFile(temp)
      return false
    }
  }

  if (fs.rename(temp, main).err !== FS_NO_ERROR) {
    if (hadMain) fs.rename(backup, main)
    return false
  }
  return true
}

/** Copia de seguridad previa a una migración: se escribe una sola vez. */
export function writeBackupOnce(fs: CepFsLike, folder: string, raw: string): boolean {
  const path = joinPath(folder, MIGRATION_BACKUP_FILE)
  if (fileExists(fs, path)) return true
  return fs.writeFile(path, raw, UTF8).err === FS_NO_ERROR
}
