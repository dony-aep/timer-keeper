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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), syncManifestVersion()],
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
    rollupOptions: {
      output: {
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
