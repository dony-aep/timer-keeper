/**
 * Package script – builds and zips dist/ for distribution.
 * Output: releases/timer-keeper-v{version}.zip
 * Usage: node scripts/package.mjs
 */
import { existsSync, mkdirSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

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

const distAbs = resolve(distDir)
const zipAbs = resolve(zipPath)
execSync(
  `Compress-Archive -Path "${distAbs}\\*" -DestinationPath "${zipAbs}" -Force`,
  { shell: 'powershell.exe', stdio: 'inherit' },
)

if (!existsSync(zipPath)) {
  console.error('ERROR: Failed to create zip.')
  process.exit(1)
}
const sizeMB = (statSync(zipPath).size / 1024 / 1024).toFixed(2)
console.log(`Package created: releases/timer-keeper-v${version}.zip (${sizeMB} MB)`)
