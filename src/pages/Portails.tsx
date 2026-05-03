import { useState } from 'react'
import { canAccess, useAuth } from '@/lib/auth'
import EspaceClient from './EspaceClient'
import EspaceAffreteur from './EspaceAffreteur'

type Tab = 'client' | 'affreteur'

export default function Portails() {
  const { role, tenantAllowedPages, enabledModules } = useAuth()

  const hasClient    = canAccess(role, 'espace-client',    tenantAllowedPages, enabledModules)
  const hasAffreteur = canAccess(role, 'espace-affreteur', tenantAllowedPages, enabledModules)

  const tabs: { key: Tab; label: string }[] = [
    ...(hasClient    ? [{ key: 'client'    as Tab, label: 'Portail client'    }] : []),
    ...(hasAffreteur ? [{ key: 'affreteur' as Tab, label: 'Portail affréteur' }] : []),
  ]

  const [tab, setTab] = useState<Tab>(() => tabs[0]?.key ?? 'client')

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
        {tab === 'client'    && <EspaceClient />}
        {tab === 'affreteur' && <EspaceAffreteur />}
      </div>
    </div>
  )
}
