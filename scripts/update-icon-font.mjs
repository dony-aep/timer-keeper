/**
 * Icon font script – downloads a Material Symbols Outlined subset with only the icons in
 * src/components/ui/iconNames.ts and saves it to src/styles/fonts/.
 * Usage: npm run icons
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

// La red solo se usa aquí, en desarrollo: el panel carga la fuente desde sus propios archivos.
const projectRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const namesFile = join(projectRoot, 'src', 'components', 'ui', 'iconNames.ts')
const outDir = join(projectRoot, 'src', 'styles', 'fonts')
const outFile = join(outDir, 'material-symbols-outlined-subset.woff2')

const source = readFileSync(namesFile, 'utf-8')
const block = source.match(/ICON_NAMES = \[([\s\S]*?)\]/)
if (!block) {
  console.error('ERROR: ICON_NAMES not found in src/components/ui/iconNames.ts')
  process.exit(1)
}
// Google Fonts exige la lista en orden alfabético.
const names = [...block[1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]).sort()
if (names.length === 0) {
  console.error('ERROR: ICON_NAMES is empty')
  process.exit(1)
}

// Mismos ejes que Icon.module.css: FILL se anima (0..1); wght, GRAD y opsz son fijos.
const cssUrl =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,380,0..1,0' +
  `&icon_names=${names.join(',')}&display=block`
// Google elige el formato por el User-Agent; con uno de Chromium devuelve woff2.
const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36',
}

const cssRes = await fetch(cssUrl, { headers })
if (!cssRes.ok) {
  console.error(`ERROR: Google Fonts CSS request failed (${cssRes.status})`)
  process.exit(1)
}
const css = await cssRes.text()
const fontUrl = css.match(/url\((https:[^)]+)\)\s*format\('woff2'\)/)?.[1]
if (!fontUrl) {
  console.error('ERROR: no woff2 URL in the Google Fonts response')
  process.exit(1)
}
const fontRes = await fetch(fontUrl, { headers })
if (!fontRes.ok) {
  console.error(`ERROR: font download failed (${fontRes.status})`)
  process.exit(1)
}
const bytes = Buffer.from(await fontRes.arrayBuffer())
mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, bytes)
console.log(
  `Icon font: ${names.length} icons, ${(bytes.length / 1024).toFixed(1)} KB -> src/styles/fonts/material-symbols-outlined-subset.woff2`,
)
