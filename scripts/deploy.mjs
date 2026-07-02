/**
 * Deploy script – copies dist/ to the Adobe CEP extensions directory.
 * Usage: node scripts/deploy.mjs
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const EXTENSION_ID = 'com.donyaep.TimerKeeper'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = join(__dirname, '..')
const distDir = join(projectRoot, 'dist')

const appData = process.env.APPDATA
if (!appData) {
  console.error('ERROR: APPDATA not found. Are you on Windows?')
  process.exit(1)
}

if (!existsSync(distDir)) {
  console.error('ERROR: dist/ not found. Run "npm run build" first.')
  process.exit(1)
}

const cepExtensionsDir = join(appData, 'Adobe', 'CEP', 'extensions')
const targetDir = join(cepExtensionsDir, EXTENSION_ID)

if (!existsSync(cepExtensionsDir)) mkdirSync(cepExtensionsDir, { recursive: true })
if (existsSync(targetDir)) rmSync(targetDir, { recursive: true, force: true })

cpSync(distDir, targetDir, { recursive: true })

console.log(`Deployed to: ${targetDir}`)
console.log('Restart After Effects to load the updated extension.')
