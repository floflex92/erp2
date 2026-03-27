import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import Chauffeurs from '@/pages/Chauffeurs'
import Vehicules from '@/pages/Vehicules'
import Transports from '@/pages/Transports'
import Clients from '@/pages/Clients'
import Facturation from '@/pages/Facturation'
import Tachygraphe from '@/pages/Tachygraphe'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="chauffeurs"  element={<Chauffeurs />} />
          <Route path="vehicules"   element={<Vehicules />} />
          <Route path="transports"  element={<Transports />} />
          <Route path="clients"     element={<Clients />} />
          <Route path="facturation" element={<Facturation />} />
          <Route path="tachygraphe" element={<Tachygraphe />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
