import { useState } from 'react'
import { canAccess, useAuth } from '@/lib/auth'
import Transports from './Transports'
import MessagerieColis from './MessagerieColis'
import GestionTemperature from './GestionTemperature'

type Tab = 'ot' | 'colis' | 'temperature'

const TAB_ICONS: Record<Tab, string> = {
  ot:          'M9 17H7A5 5 0 0 1 7 7h2m6 0h2a5 5 0 1 1 0 10h-2m-9-5h12',
  colis:       'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
  temperature: 'M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z',
}

export default function TransportsUnifie() {
  const { role, tenantAllowedPages, enabledModules } = useAuth()

  const hasOt    = canAccess(role, 'transports',          tenantAllowedPages, enabledModules)
  const hasColis = canAccess(role, 'messagerie-colis',    tenantAllowedPages, enabledModules)
  const hasTemp  = canAccess(role, 'gestion-temperature', tenantAllowedPages, enabledModules)

  const tabs: { key: Tab; label: string }[] = [
    ...(hasOt    ? [{ key: 'ot'          as Tab, label: 'OT / Fret'         }] : []),
    ...(hasColis ? [{ key: 'colis'       as Tab, label: 'Messagerie colis'  }] : []),
    ...(hasTemp  ? [{ key: 'temperature' as Tab, label: 'Température frigo' }] : []),
  ]

  const [tab, setTab] = useState<Tab>(() => tabs[0]?.key ?? 'ot')

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
        {tab === 'ot'          && <Transports />}
        {tab === 'colis'       && <MessagerieColis />}
        {tab === 'temperature' && <GestionTemperature />}
      </div>
    </div>
  )
}
