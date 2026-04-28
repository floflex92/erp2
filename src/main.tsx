import { StrictMode, startTransition } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
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

const isSsrHydration = rootElement.dataset.ssr === 'true' || rootElement.hasChildNodes()

const app = (
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)

if (isSsrHydration) {
  hydrateRoot(rootElement, app)
  window.setTimeout(() => {
    rootElement.removeAttribute('data-ssr')
  }, 0)
} else {
  createRoot(rootElement).render(app)
}

// Précharge les routes les plus fréquentes en idle (après le rendu initial)
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    startTransition(() => {
      void import('@/pages/Transports')
      void import('@/pages/Planning')
      void import('@/pages/Dashboard')
    })
  })
}
