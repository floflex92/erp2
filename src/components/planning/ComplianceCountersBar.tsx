/**
 * Composant compteurs CE 561 en temps réel
 * Affiche dans le Planning les minutes de conduite/repos du jour
 */

import { useEffect, useState } from 'react'
import type { PlanningComplianceService } from '@/lib/planningCompliance'

interface ComplianceCountersProps {
  conducteurId: string | null
  date: Date
  service: PlanningComplianceService | null
}

interface Counters {
  conduite_jour_minutes: number
  conduite_semaine_minutes: number
  conduite_14j_minutes: number
  repos_jour_minutes: number
  repos_semaine_minimum: number
  jours_consecutifs_travailles: number
}

const DEFAULT_COUNTERS: Counters = {
  conduite_jour_minutes: 0,
  conduite_semaine_minutes: 0,
  conduite_14j_minutes: 0,
  repos_jour_minutes: 0,
  repos_semaine_minimum: 0,
  jours_consecutifs_travailles: 0,
}

/**
 * Affichage des compteurs (affichée en haut du planning)
 */
export function ComplianceCountersBar({
  conducteurId,
  date,
  service,
}: ComplianceCountersProps) {
  const [counters, setCounters] = useState<Counters>(DEFAULT_COUNTERS)
  const [loading, setLoading] = useState(!conducteurId)

  useEffect(() => {
    if (!conducteurId || !service) {
      setCounters(DEFAULT_COUNTERS)
      setLoading(false)
      return
    }

    setLoading(true)
    service
      .getCompteursCE(conducteurId, date)
      .then(setCounters)
      .catch(err => {
        console.error('Erreur compteurs CE:', err)
        setCounters(DEFAULT_COUNTERS)
      })
      .finally(() => setLoading(false))
  }, [conducteurId, date, service])

  if (!conducteurId) {
    return (
      <div className="border-b px-4 py-3" style={{ background: 'var(--surface-soft)', borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Sélectionnez un conducteur pour voir les compteurs</p>
      </div>
    )
  }

  const rules = {
    conduite_jour_max: 540, // 9h
    conduite_semaine_max: 3360, // 56h
    conduite_14j_max: 5400, // 90h
    repos_jour_min: 540, // 9h
    repos_semaine_min: 1440, // 24h
  }

  const getWarningLevel = (value: number, max: number): 'normal' | 'warning' | 'critical' => {
    const percent = (value / max) * 100
    if (percent >= 95) return 'critical'
    if (percent >= 80) return 'warning'
    return 'normal'
  }

  const formatMinutes = (min: number): string => {
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${h}h${m.toString().padStart(2, '0')}`
  }

  const getCounterColor = (level: 'normal' | 'warning' | 'critical'): string => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 border-red-300 text-red-900'
      case 'warning':
        return 'bg-yellow-100 border-yellow-300 text-yellow-900'
      default:
        return 'bg-green-100 border-green-300 text-green-900'
    }
  }

  const conduiteJourLevel = getWarningLevel(
    counters.conduite_jour_minutes,
    rules.conduite_jour_max
  )
  const conduiteWeekLevel = getWarningLevel(
    counters.conduite_semaine_minutes,
    rules.conduite_semaine_max
  )
  const conduite14jLevel = getWarningLevel(
    counters.conduite_14j_minutes,
    rules.conduite_14j_max
  )

  return (
    <div className="border-b px-4 py-3" style={{ background: 'var(--surface-soft)', borderColor: 'var(--border)' }}>
      {loading ? (
        <p className="text-sm italic" style={{ color: 'var(--muted)' }}>Chargement des compteurs...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {/* Conduite du jour */}
          <div className={`border-l-4 px-2 py-1 rounded text-sm font-medium ${getCounterColor(conduiteJourLevel)}`}>
            <p className="text-xs opacity-75">Aujourd'hui</p>
            <p>{formatMinutes(counters.conduite_jour_minutes)} / {formatMinutes(rules.conduite_jour_max)}</p>
            <p className="text-xs opacity-75 mt-0.5">Conduite</p>
          </div>

          {/* Conduite semaine */}
          <div className={`border-l-4 px-2 py-1 rounded text-sm font-medium ${getCounterColor(conduiteWeekLevel)}`}>
            <p className="text-xs opacity-75">Semaine</p>
            <p>{formatMinutes(counters.conduite_semaine_minutes)} / {formatMinutes(rules.conduite_semaine_max)}</p>
            <p className="text-xs opacity-75 mt-0.5">Conduite</p>
          </div>

          {/* Conduite 14j */}
          <div className={`border-l-4 px-2 py-1 rounded text-sm font-medium ${getCounterColor(conduite14jLevel)}`}>
            <p className="text-xs opacity-75">14 jours</p>
            <p>{formatMinutes(counters.conduite_14j_minutes)} / {formatMinutes(rules.conduite_14j_max)}</p>
            <p className="text-xs opacity-75 mt-0.5">Conduite</p>
          </div>

          {/* Repos du jour */}
          <div className={`border-l-4 px-2 py-1 rounded text-sm font-medium ${
            counters.repos_jour_minutes < rules.repos_jour_min
              ? getCounterColor('warning')
              : getCounterColor('normal')
          }`}>
            <p className="text-xs opacity-75">Aujourd'hui</p>
            <p>{formatMinutes(counters.repos_jour_minutes)} / {formatMinutes(rules.repos_jour_min)}</p>
            <p className="text-xs opacity-75 mt-0.5">Repos</p>
          </div>

          {/* Repos semaine min */}
          <div className={`border-l-4 px-2 py-1 rounded text-sm font-medium ${
            counters.repos_semaine_minimum < rules.repos_semaine_min
              ? getCounterColor('warning')
              : getCounterColor('normal')
          }`}>
            <p className="text-xs opacity-75">Semaine (min)</p>
            <p>{formatMinutes(counters.repos_semaine_minimum)} / {formatMinutes(rules.repos_semaine_min)}</p>
            <p className="text-xs opacity-75 mt-0.5">Repos</p>
          </div>

          {/* Jours consécutifs */}
          <div className={`border-l-4 px-2 py-1 rounded text-sm font-medium ${
            counters.jours_consecutifs_travailles > 6
              ? getCounterColor('critical')
              : counters.jours_consecutifs_travailles >= 5
                ? getCounterColor('warning')
                : getCounterColor('normal')
          }`}>
            <p className="text-xs opacity-75">Consécutifs</p>
            <p>{counters.jours_consecutifs_travailles} / 6</p>
            <p className="text-xs opacity-75 mt-0.5">Jours</p>
          </div>
        </div>
      )}
    </div>
  )
}
