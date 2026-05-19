import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DemoAccessForm from '@/components/DemoAccessForm'
import { useAuth } from '@/lib/auth'

export default function DemoAccessPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
    setChecking(false)
  }, [user, navigate])

  const handleFormSuccess = () => {
    // Formulaire démo complété — le rôle est géré par le profil en base (demo-magic-link)
    navigate('/dashboard', { replace: true })
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-muted">Vérification...</div>
      </div>
    )
  }

  return <DemoAccessForm onSuccess={handleFormSuccess} />
}
