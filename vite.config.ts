import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// CEP extension bundle id – used as the deploy target folder name
export const EXTENSION_ID = 'com.donyaep.TimerKeeper'

// Injects the package.json version into the built manifest.xml (replaces __APP_VERSION__)
function syncManifestVersion() {
  return {
    name: 'sync-manifest-version',
    closeBundle() {
      const manifestPath = resolve('dist/CSXS/manifest.xml')
      try {
        const xml = readFileSync(manifestPath, 'utf-8').replace(/__APP_VERSION__/g, pkg.version)
        writeFileSync(manifestPath, xml)
      } catch {
        /* dist/manifest not present (e.g. dev) */
      }
    },
  }
}

// CEP loads the panel from file://, where <script type="module"> never runs: the local
// file arrives with an empty MIME type and the engine drops the module, leaving a blank
// panel. Seen on CEP 11 / Chromium 88 (AE 2022). Ship a classic script instead.
// It becomes `defer` rather than a bare script because Vite injects the tag in <head>:
// deferring keeps the module ordering the panel relies on, running after the DOM is
// parsed and after the classic lib/CSInterface.js at the end of <body>.
function cepClassicScriptTags() {
  return {
    name: 'cep-classic-script-tags',
    transformIndexHtml: {
      order: 'post' as const,
      handler(html: string) {
        return html.replace(/\s+type="module"/g, ' defer').replace(/\s+crossorigin/g, '')
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cepClassicScriptTags(), syncManifestVersion()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    // CEP 11 ships Chromium 88 (After Effects 2021+)
    target: 'chrome88',
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
    // Same reason as cepClassicScriptTags: no module graph in the browser, so no
    // modulepreload links and a single self-contained bundle.
    modulePreload: false,
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    port: 5174,
  },
})
