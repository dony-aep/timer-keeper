/**
 * Sign script – builds and packages dist/ as a signed ZXP with Adobe's ZXPSignCmd.
 * Output: releases/timer-keeper-v{version}.zxp
 * Usage: npm run sign              sign with the certificate in TK_CERT_P12
 *        npm run sign -- --cert    create a self-signed certificate and exit
 *        npm run sign -- --verify  only verify the existing zxp
 *        npm run sign -- --no-build  skip the build (sign whatever dist/ holds)
 *
 * Environment: TK_CERT_P12 (path, default tools/certificate.p12), TK_CERT_PASSWORD,
 * TK_ZXPSIGNCMD (path to the tool, default tools/ZXPSignCmd.exe or tools/ZXPSignCmd),
 * TK_TSA (timestamp server, default http://timestamp.digicert.com).
 * Certificate fields for --cert: TK_CERT_COUNTRY, TK_CERT_STATE, TK_CERT_ORG, TK_CERT_NAME.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync, execSync } from 'child_process'

const EXTENSION_ID = 'com.donyaep.TimerKeeper'
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = join(__dirname, '..')
const toolsDir = join(projectRoot, 'tools')
const releasesDir = join(projectRoot, 'releases')

const args = process.argv.slice(2)
const has = (flag) => args.includes(flag)
const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'))
const zxpPath = resolve(releasesDir, `timer-keeper-v${pkg.version}.zxp`)

const toolName = process.platform === 'win32' ? 'ZXPSignCmd.exe' : 'ZXPSignCmd'
const tool = resolve(process.env.TK_ZXPSIGNCMD ?? join(toolsDir, toolName))
const certPath = resolve(process.env.TK_CERT_P12 ?? join(toolsDir, 'certificate.p12'))
const password = process.env.TK_CERT_PASSWORD
const tsa = process.env.TK_TSA ?? 'http://timestamp.digicert.com'

if (!existsSync(tool)) {
  console.error(`ERROR: ZXPSignCmd not found at ${tool}`)
  console.error('Download it (4.1.3) from https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD')
  console.error(`and put it in ${toolsDir} (git-ignored), or set TK_ZXPSIGNCMD.`)
  process.exit(1)
}

// El propio ZXPSignCmd imprime la contraseña en sus mensajes de error, así que no se
// vuelca su salida sin filtrar.
const hidePassword = (text) => (password ? text.split(password).join('***') : text)

function runTool(toolArgs) {
  try {
    return execFileSync(tool, toolArgs, { encoding: 'utf-8' })
  } catch (error) {
    const output = hidePassword(`${error.stdout ?? ''}${error.stderr ?? ''}`.trim())
    console.error(output || hidePassword(String(error.message)))
    process.exit(1)
  }
}

if (has('--cert')) {
  if (!password) {
    console.error('ERROR: set TK_CERT_PASSWORD before creating a certificate.')
    process.exit(1)
  }
  if (existsSync(certPath)) {
    console.error(`ERROR: ${certPath} already exists. Delete it first if you want a new one.`)
    process.exit(1)
  }
  mkdirSync(toolsDir, { recursive: true })
  const country = process.env.TK_CERT_COUNTRY ?? 'CO'
  const state = process.env.TK_CERT_STATE ?? 'Bogota'
  const org = process.env.TK_CERT_ORG ?? 'dony.'
  const name = process.env.TK_CERT_NAME ?? 'dony.'
  // 10 años: un certificado caducado sin sello de tiempo impide que la extensión arranque.
  runTool(['-selfSignedCert', country, state, org, name, password, certPath, '-validityDays', '3650'])
  console.log(`Self-signed certificate created: ${certPath}`)
  console.log('Keep it and its password out of the repository; tools/ and *.p12 are git-ignored.')
  process.exit(0)
}

if (has('--verify')) {
  if (!existsSync(zxpPath)) {
    console.error(`ERROR: ${zxpPath} not found. Run npm run sign first.`)
    process.exit(1)
  }
  console.log(runTool(['-verify', zxpPath, '-certInfo']))
  process.exit(0)
}

if (!password) {
  console.error('ERROR: set TK_CERT_PASSWORD with the certificate password.')
  process.exit(1)
}
if (!existsSync(certPath)) {
  console.error(`ERROR: certificate not found at ${certPath}. Create one with: npm run sign -- --cert`)
  process.exit(1)
}

if (!has('--no-build')) {
  console.log(`Building Timer Keeper v${pkg.version}...`)
  try {
    execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' })
  } catch {
    console.error('Build failed. Aborting.')
    process.exit(1)
  }
}

const distDir = join(projectRoot, 'dist')
if (!existsSync(distDir)) {
  console.error('ERROR: dist/ not found after build.')
  process.exit(1)
}
mkdirSync(releasesDir, { recursive: true })

// Se firma una copia: sin .debug (abriría el depurador remoto en cada instalación) y sin
// restos de macOS, que Adobe pide quitar para distribuir.
const stageDir = resolve(releasesDir, '.stage-zxp')
rmSync(stageDir, { recursive: true, force: true })
cpSync(distDir, stageDir, { recursive: true })
rmSync(join(stageDir, '.debug'), { force: true })
for (const junk of ['.DS_Store', '__MACOSX']) {
  rmSync(join(stageDir, junk), { recursive: true, force: true })
}

if (existsSync(zxpPath)) rmSync(zxpPath)
runTool(['-sign', stageDir, zxpPath, certPath, password, '-tsa', tsa])
rmSync(stageDir, { recursive: true, force: true })

if (!existsSync(zxpPath)) {
  console.error('ERROR: Failed to create the ZXP.')
  process.exit(1)
}
const sizeMB = (statSync(zxpPath).size / 1024 / 1024).toFixed(2)
console.log(`Signed package created: releases/timer-keeper-v${pkg.version}.zxp (${sizeMB} MB) as ${EXTENSION_ID}`)
console.log(runTool(['-verify', zxpPath, '-certInfo']))
