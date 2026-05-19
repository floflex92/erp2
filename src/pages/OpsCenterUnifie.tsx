import { lazy, Suspense, useState } from 'react'
import { canAccess, useAuth } from '@/lib/auth'

const OpsCenter            = lazy(() => import('./OpsCenter'))
const DemandesClients      = lazy(() => import('./DemandesClients'))
const Tasks                = lazy(() => import('./Tasks'))
const OptimisationTournees = lazy(() => import('./OptimisationTournees'))

type Tab = 'surveillance' | 'demandes' | 'tasks' | 'optimisation'

const TAB_ICONS: Record<Tab, string> = {
  surveillance: 'M12 3c0 0-7 3.5-7 9s7 9 7 9 7-3.5 7-9-7-9-7-9zM12 12m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0',
  demandes:     'M4 6h16v12H4zM4 13h4l2 3h4l2-3h4M12 3v5M9.5 5.5 12 3l2.5 2.5',
  tasks:        'M20 6 9 17l-5-5',
  optimisation: 'M3 10h18M3 14h18m-11-8 5 4 5-4m-15 8 5-4 5 4',
}

export default function OpsCenterUnifie() {
  const { role, tenantAllowedPages, enabledModules } = useAuth()

  const hasSurveillance = canAccess(role, 'ops-center',            tenantAllowedPages, enabledModules)
  const hasDemandes     = canAccess(role, 'demandes-clients',      tenantAllowedPages, enabledModules)
  const hasTasks        = canAccess(role, 'tasks',                 tenantAllowedPages, enabledModules)
  const hasOptimisation = canAccess(role, 'optimisation-tournees', tenantAllowedPages, enabledModules)

  const tabs: { key: Tab; label: string }[] = [
    ...(hasSurveillance ? [{ key: 'surveillance' as Tab, label: 'Surveillance' }] : []),
    ...(hasDemandes     ? [{ key: 'demandes'     as Tab, label: 'Demandes clients' }] : []),
    ...(hasTasks        ? [{ key: 'tasks'        as Tab, label: 'Tâches' }] : []),
    ...(hasOptimisation ? [{ key: 'optimisation' as Tab, label: 'Optim. tournées' }] : []),
  ]

  const [tab, setTab] = useState<Tab>(() => tabs[0]?.key ?? 'surveillance')

  if (tabs.length === 0) return null

  return (
    <div className="flex flex-col h-full">
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
                'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg -mb-px border-b-2 transition-colors',
                tab === t.key
                  ? 'border-[color:var(--primary)] text-[color:var(--primary)]'
                  : 'border-transparent text-[color:var(--muted)] hover:text-[color:var(--text)]',
              ].join(' ')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 shrink-0">
                <path d={TAB_ICONS[t.key]} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>
      )}
      <Suspense fallback={<div className="flex-1" />}>
        <div className="flex-1 min-h-0">
          {tab === 'surveillance' && <OpsCenter />}
          {tab === 'demandes'     && <DemandesClients />}
          {tab === 'tasks'        && <Tasks />}
          {tab === 'optimisation' && <OptimisationTournees />}
        </div>
      </Suspense>
    </div>
  )
}
