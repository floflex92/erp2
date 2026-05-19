import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { initObservability } from '@/lib/observability'

initObservability()

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root introuvable')
}

const app = (
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)

// createRoot sur le contenu SSR : React reconcilie avec le DOM existant.
// Le HTML pré-rendu reste visible au FCP, React remplace sans flash perceptible.
// hydrateRoot évité car il cause un render delay de ~15s avec les composants lazy (cascade).
createRoot(rootElement).render(app)
