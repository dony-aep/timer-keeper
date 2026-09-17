import type { CepFsLike } from './dataFile'

/**
 * Sistema de archivos en memoria con la semántica de window.cep.fs que importa a los
 * tests: rename falla si el destino existe y stat da err 3 si no hay nada. Solo para tests.
 */
export class FakeFs implements CepFsLike {
  files = new Map<string, { data: string; mtime: number }>()
  dirs = new Set<string>()
  failWrite = new Set<string>()
  failRead = new Set<string>()
  /** Rutas de origen cuyo rename falla. */
  failRename = new Set<string>()
  failDelete = new Set<string>()
  private clock = 1000

  /** Simula una escritura hecha por otro proceso (fecha de modificación nueva). */
  put(path: string, data: string): void {
    this.files.set(path, { data, mtime: ++this.clock })
  }

  text(path: string): string | undefined {
    return this.files.get(path)?.data
  }

  readFile(path: string): { data: string; err: number } {
    if (this.failRead.has(path)) return { data: '', err: 4 }
    const file = this.files.get(path)
    return file ? { data: file.data, err: 0 } : { data: '', err: 3 }
  }

  writeFile(path: string, data: string): { err: number } {
    if (this.failWrite.has(path)) return { err: 6 }
    this.put(path, data)
    return { err: 0 }
  }

  rename(oldPath: string, newPath: string): { err: number } {
    if (this.failRename.has(oldPath)) return { err: 1 }
    const file = this.files.get(oldPath)
    if (!file) return { err: 3 }
    // AE 26.3 (CEP 12) devuelve 1, no el ERR_FILE_EXISTS (10) que documenta Adobe.
    if (this.files.has(newPath)) return { err: 1 }
    this.files.set(newPath, file)
    this.files.delete(oldPath)
    return { err: 0 }
  }

  deleteFile(path: string): { err: number } {
    if (this.failDelete.has(path)) return { err: 1 }
    return this.files.delete(path) ? { err: 0 } : { err: 3 }
  }

  stat(path: string) {
    const file = this.files.get(path)
    const isDir = this.dirs.has(path)
    return {
      err: file || isDir ? 0 : 3,
      data: {
        isFile: () => Boolean(file),
        isDirectory: () => isDir,
        mtime: file ? new Date(file.mtime) : undefined,
      },
    }
  }

  makedir(path: string): { err: number } {
    this.dirs.add(path)
    return { err: 0 }
  }
}
