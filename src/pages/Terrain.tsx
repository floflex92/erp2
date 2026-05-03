import { useState } from 'react'
import { canAccess, useAuth } from '@/lib/auth'
import FeuilleRoute from './FeuilleRoute'
import FormulairesTerrain from './FormulairesTerrain'

type Tab = 'feuille-route' | 'formulaires'

const TAB_ICONS: Record<Tab, string> = {
  'feuille-route': 'M3 12h18M3 6h18M3 18h12',
  'formulaires':   'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 12h6M9 16h4',
}

export default function Terrain() {
  const { role, tenantAllowedPages, enabledModules } = useAuth()

  const hasFeuille    = canAccess(role, 'feuille-route',      tenantAllowedPages, enabledModules)
  const hasFormulaire = canAccess(role, 'formulaires-terrain', tenantAllowedPages, enabledModules)

  const tabs: { key: Tab; label: string }[] = [
    ...(hasFeuille    ? [{ key: 'feuille-route' as Tab, label: 'Feuille de route'   }] : []),
    ...(hasFormulaire ? [{ key: 'formulaires'   as Tab, label: 'Formulaires terrain' }] : []),
  ]

  const [tab, setTab] = useState<Tab>(() => tabs[0]?.key ?? 'feuille-route')

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
      <div className="flex-1 min-h-0">
        {tab === 'feuille-route' && <FeuilleRoute />}
        {tab === 'formulaires'   && <FormulairesTerrain />}
      </div>
    </div>
  )
}
