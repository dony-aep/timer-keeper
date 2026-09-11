/**
 * Package script – builds and zips dist/ for distribution.
 * Output: releases/timer-keeper-v{version}.zip, holding a com.donyaep.TimerKeeper/ folder and Add Keys.reg
 * Usage: node scripts/package.mjs
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync, execSync } from 'child_process'

const EXTENSION_ID = 'com.donyaep.TimerKeeper'
// Turns on PlayerDebugMode for unsigned builds on Windows with a double click.
const REG_FILE = 'Add Keys.reg'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = join(__dirname, '..')

const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'))
const version = pkg.version

const distDir = join(projectRoot, 'dist')
const releasesDir = join(projectRoot, 'releases')
const zipPath = join(releasesDir, `timer-keeper-v${version}.zip`)

console.log(`Building Timer Keeper v${version}...`)
try {
  execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' })
} catch {
  console.error('Build failed. Aborting.')
  process.exit(1)
}

if (!existsSync(distDir)) {
  console.error('ERROR: dist/ not found after build.')
  process.exit(1)
}
if (!existsSync(releasesDir)) mkdirSync(releasesDir, { recursive: true })

const zipAbs = resolve(zipPath)
// The zip holds a folder named after the extension ID, so installing is copying that folder
// into the CEP extensions directory as it comes. The .reg file sits next to it, not inside.
const stageDir = resolve(releasesDir, '.stage')
rmSync(stageDir, { recursive: true, force: true })
cpSync(distDir, join(stageDir, EXTENSION_ID), { recursive: true })
cpSync(join(projectRoot, REG_FILE), join(stageDir, REG_FILE))
// Windows PowerShell 5.1's Compress-Archive stores entry paths with backslashes, which macOS
// extracts as flat files named "CSXS\manifest.xml". The bsdtar bundled with Windows writes
// forward slashes, and "-a" picks the zip format from the extension.
const tar = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe')
if (existsSync(zipAbs)) rmSync(zipAbs)
execFileSync(tar, ['-a', '-cf', zipAbs, '-C', stageDir, EXTENSION_ID, REG_FILE], { stdio: 'inherit' })
rmSync(stageDir, { recursive: true, force: true })

if (!existsSync(zipPath)) {
  console.error('ERROR: Failed to create zip.')
  process.exit(1)
}
const sizeMB = (statSync(zipPath).size / 1024 / 1024).toFixed(2)
console.log(`Package created: releases/timer-keeper-v${version}.zip (${sizeMB} MB)`)
