import { useState } from 'react'
import { canAccess, useAuth } from '@/lib/auth'
import AnalytiqueTransport from './AnalytiqueTransport'
import BilanCo2 from './BilanCo2'

type Tab = 'analytique' | 'co2'

export default function Analyses() {
  const { role, tenantAllowedPages, enabledModules } = useAuth()

  const hasAnalytique = canAccess(role, 'analytique-transport', tenantAllowedPages, enabledModules)
  const hasCo2        = canAccess(role, 'bilan-co2',            tenantAllowedPages, enabledModules)

  const tabs: { key: Tab; label: string }[] = [
    ...(hasAnalytique ? [{ key: 'analytique' as Tab, label: 'Analytique transport' }] : []),
    ...(hasCo2        ? [{ key: 'co2'        as Tab, label: 'Bilan CO₂'            }] : []),
  ]

  const [tab, setTab] = useState<Tab>(() => tabs[0]?.key ?? 'analytique')

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
        {tab === 'analytique' && <AnalytiqueTransport />}
        {tab === 'co2'        && <BilanCo2 />}
      </div>
    </div>
  )
}
