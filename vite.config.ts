import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version?: string }
const appVersion = packageJson.version ?? '0.0.0'
const buildDate = new Date().toISOString().slice(0, 10)

/**
 * Injecte des <link rel="modulepreload"> pour les chunks critiques du chemin
 * de rendu de la home page + toutes leurs dépendances transitives, afin que
 * hydrateRoot trouve tous les modules en cache et ne suspende pas en cascade.
 */
function preloadCriticalChunksPlugin(): Plugin {
  // Sources dont les chunks racine doivent être préchargés dès le HTML initial
  const criticalSources = [
    'src/site/components/SiteLayout',
    'src/site/pages/HomePage',
    // AppLayout exclu : ses deps (entry+supabase+demo*) créent trop de concurrence bande passante
  ]
  return {
    name: 'preload-critical-chunks',
    apply: 'build',
    closeBundle() {
      try {
        const manifestPath = path.resolve(__dirname, 'dist/.vite/manifest.json')
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<
          string,
          { file: string; imports?: string[] }
        >

        // Résolution transitive des imports statiques d'un chunk
        const collectTransitive = (key: string, visited = new Set<string>()): string[] => {
          if (visited.has(key)) return []
          visited.add(key)
          const entry = manifest[key]
          if (!entry) return []
          const deps: string[] = [entry.file]
          for (const imp of entry.imports ?? []) {
            deps.push(...collectTransitive(imp, visited))
          }
          return deps
        }

        // Trouver les clés racine critiques et collecter leurs dépendances
        const allFiles = new Set<string>()
        for (const [key] of Object.entries(manifest)) {
          if (criticalSources.some(s => key.includes(s))) {
            collectTransitive(key).forEach(f => allFiles.add(f))
          }
        }

        if (allFiles.size === 0) return

        const preloads = [...allFiles].map(f => `<link rel="modulepreload" crossorigin href="/${f}">`)
        const htmlPath = path.resolve(__dirname, 'dist/index.html')
        let html = readFileSync(htmlPath, 'utf8')
        // Évite les doublons si le plugin tourne plusieurs fois (build client + SSR)
        const newPreloads = preloads.filter(tag => !html.includes(tag))
        if (newPreloads.length === 0) return
        html = html.replace('</head>', newPreloads.join('\n') + '\n</head>')
        writeFileSync(htmlPath, html)
        console.log(`[preload-critical] ${newPreloads.length} modulepreload hints injectés`)
      } catch {
        // pas de manifest = mode watch, ignorer
      }
    },
  }
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(buildDate),
  },
  plugins: [react(), tailwindcss(), preloadCriticalChunksPlugin()],
  build: {
    target: 'es2022',
    manifest: true,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 160,
    reportCompressedSize: false,
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor-react'
          if (id.includes('node_modules/react-router')) return 'vendor-router'
          if (id.includes('node_modules/@supabase/')) return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/')) return 'vendor-leaflet'
          if (id.includes('node_modules/@anthropic-ai/')) return 'vendor-ai'
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
})

