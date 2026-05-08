import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/lib/theme'
import ScrollToTop from '@/components/routing/ScrollToTop'
import { getPublicSiteRoutes } from '@/site/publicRoutes'

/**
 * AppErpShell est chargé en lazy : vendor-supabase n'est PAS dans le bundle
 * critique des pages marketing (/, /fonctionnalites, etc.).
 * Supabase se charge uniquement lorsque l'utilisateur navigue vers /login
 * ou toute autre route ERP.
 */
const AppErpShell = lazy(() => import('@/components/layout/AppErpShell'))

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ScrollToTop includeSearch />
        <Suspense fallback={null}>
          <Routes>
            {getPublicSiteRoutes()}
            {/* Toutes les routes ERP sont dans AppErpShell (chargé en lazy)
                → vendor-supabase n'est PAS dans le bundle critique marketing */}
            <Route path="*" element={<AppErpShell />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  )
}
