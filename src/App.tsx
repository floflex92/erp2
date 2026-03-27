import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, canAccess, useAuth, type Role } from '@/lib/auth'
import RequireAuth from '@/components/layout/RequireAuth'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Chauffeurs from '@/pages/Chauffeurs'
import Vehicules from '@/pages/Vehicules'
import Transports from '@/pages/Transports'
import Clients from '@/pages/Clients'
import Facturation from '@/pages/Facturation'
import Tachygraphe from '@/pages/Tachygraphe'
import Planning from '@/pages/Planning'
import Utilisateurs from '@/pages/Utilisateurs'

function RequireRole({ page, children }: { page: string; children: React.ReactNode }) {
  const { role, loading } = useAuth()
  if (loading) return null
  if (!canAccess(role as Role, page)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"    element={<RequireRole page="dashboard"><Dashboard /></RequireRole>} />
              <Route path="chauffeurs"   element={<RequireRole page="chauffeurs"><Chauffeurs /></RequireRole>} />
              <Route path="vehicules"    element={<RequireRole page="vehicules"><Vehicules /></RequireRole>} />
              <Route path="transports"   element={<RequireRole page="transports"><Transports /></RequireRole>} />
              <Route path="clients"      element={<RequireRole page="clients"><Clients /></RequireRole>} />
              <Route path="facturation"  element={<RequireRole page="facturation"><Facturation /></RequireRole>} />
              <Route path="tachygraphe"  element={<RequireRole page="tachygraphe"><Tachygraphe /></RequireRole>} />
              <Route path="planning"     element={<RequireRole page="planning"><Planning /></RequireRole>} />
              <Route path="utilisateurs" element={<RequireRole page="utilisateurs"><Utilisateurs /></RequireRole>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
