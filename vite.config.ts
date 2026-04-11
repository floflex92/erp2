import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 200,
    reportCompressedSize: false,
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor-react'
          if (id.includes('node_modules/react-router-dom/')) return 'vendor-router'
          if (id.includes('node_modules/@supabase/')) return 'vendor-supabase'
          if (id.includes('node_modules/leaflet/')) return 'vendor-leaflet'
          if (id.includes('node_modules/jspdf/')) return 'vendor-pdf'
          if (id.includes('node_modules/@anthropic-ai/')) return 'vendor-ai'
          if (id.includes('/src/site/pages/HomePage')) return 'site-home'
          if (id.includes('/src/site/pages/') || id.includes('/src/site/components/') || id.includes('/src/site/lib/') || id.includes('/src/site/hooks/') || id.includes('/src/site/content/')) return 'site-public'
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

