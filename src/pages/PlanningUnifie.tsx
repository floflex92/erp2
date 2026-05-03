import { lazy, Suspense, useState } from 'react'
import { canAccess, useAuth } from '@/lib/auth'

const Planning = lazy(() => import('./Planning'))
const PlanningConducteur = lazy(() => import('./PlanningConducteur'))

type Tab = 'global' | 'conducteur'

/** Rôles dont la vue est exclusivement la feuille conducteur */
const CONDUCTEUR_ROLES = new Set(['conducteur', 'conducteur_affreteur'])

export default function PlanningUnifie() {
  const { role, tenantAllowedPages, enabledModules } = useAuth()

  const isConducteurRole = role !== null && CONDUCTEUR_ROLES.has(role)

  // Le planning global n'est visible que pour les rôles dispatch/admin
  const hasGlobal     = !isConducteurRole && canAccess(role, 'planning',            tenantAllowedPages, enabledModules)
  // Le planning conducteur est visible pour les rôles conducteur + admin/dirigeant qui ont tout
  const hasConducteur = canAccess(role, 'planning-conducteur', tenantAllowedPages, enabledModules)

  const [tab, setTab] = useState<Tab>(() =>
    hasConducteur && !hasGlobal ? 'conducteur' : 'global'
  )

  const tabs: { key: Tab; label: string }[] = [
    ...(hasGlobal     ? [{ key: 'global'     as Tab, label: 'Planning'     }] : []),
    ...(hasConducteur ? [{ key: 'conducteur' as Tab, label: 'Mon planning' }] : []),
  ]

  if (tabs.length === 0) return null

  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={null}>
      {tabs.length > 1 && (
        <div
          className="flex gap-1 border-b px-4 pt-3 shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={[
                'px-4 py-2.5 text-sm font-semibold rounded-t-lg -mb-px border-b-2 transition-colors',
                tab === t.key
                  ? 'border-[color:var(--primary)] text-[color:var(--primary)]'
                  : 'border-transparent text-[color:var(--muted)] hover:text-[color:var(--text)]',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 min-h-0">
        {tab === 'global'     && <Planning />}
        {tab === 'conducteur' && <PlanningConducteur />}
      </div>
      </Suspense>
    </div>
  )
}
