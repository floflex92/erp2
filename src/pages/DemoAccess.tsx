import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DemoAccessForm from '@/components/DemoAccessForm'
import { useAuth } from '@/lib/auth'

export default function DemoAccessPage() {
  const navigate = useNavigate()
  const { user, setSessionRole } = useAuth()
  const [checking, setChecking] = useState(true)

  // Vérifier si l'utilisateur a déjà rempli le formulaire
  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }

    // Marquer qu'on a accepté le formulaire démo
    const hasCompletedDemoForm = sessionStorage.getItem('demo_form_completed')
    if (hasCompletedDemoForm) {
      navigate('/dashboard')
    }

    setChecking(false)
  }, [user, navigate])

  const handleFormSuccess = () => {
    // Enregistrer dans sessionStorage que le formulaire a été complété
    sessionStorage.setItem('demo_form_completed', 'true')
    
    // Activer le rôle demo
    setSessionRole('demo')
    
    // Rediriger vers le dashboard
    navigate('/dashboard')
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400">Vérification...</div>
      </div>
    )
  }

  return <DemoAccessForm onSuccess={handleFormSuccess} />
}
