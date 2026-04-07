import { StrictMode, startTransition } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

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
