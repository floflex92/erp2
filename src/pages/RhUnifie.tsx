import { useState } from 'react'
import { canAccess, useAuth } from '@/lib/auth'
import Rh from './Rh'
import EntretiensSalaries from './EntretiensSalaries'

type Tab = 'rh' | 'entretiens'

export default function RhUnifie() {
  const { role, tenantAllowedPages, enabledModules } = useAuth()

  const hasRh         = canAccess(role, 'rh',                  tenantAllowedPages, enabledModules)
  const hasEntretiens = canAccess(role, 'entretiens-salaries',  tenantAllowedPages, enabledModules)

  const tabs: { key: Tab; label: string }[] = [
    ...(hasRh         ? [{ key: 'rh'         as Tab, label: 'Ressources humaines'  }] : []),
    ...(hasEntretiens ? [{ key: 'entretiens'  as Tab, label: 'Entretiens salariés'  }] : []),
  ]

  const [tab, setTab] = useState<Tab>(() => tabs[0]?.key ?? 'rh')

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
        {tab === 'rh'         && <Rh />}
        {tab === 'entretiens' && <EntretiensSalaries />}
      </div>
    </div>
  )
}
