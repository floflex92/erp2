import { useNavigation } from 'react-router-dom'

export function PageLoader() {
  const { state } = useNavigation()
  if (state === 'idle') return null

  return (
    <div
      role="progressbar"
      aria-label="Chargement de la page"
      aria-valuetext="Chargement en cours"
      className="fixed inset-x-0 top-0 z-50 h-1 animate-pulse bg-[color:var(--primary)]"
    />
  )
}
