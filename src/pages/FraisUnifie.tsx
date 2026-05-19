import { useState } from 'react'
import { canAccess, useAuth } from '@/lib/auth'
import Frais from './Frais'
import FraisRapide from './FraisRapide'

type Tab = 'gestion' | 'rapide'

/** Rôles qui accèdent uniquement à la saisie rapide terrain */
const CONDUCTEUR_ROLES = new Set(['conducteur', 'conducteur_affreteur'])

export default function FraisUnifie() {
  const { role, tenantAllowedPages, enabledModules } = useAuth()

  const isConducteurRole = role !== null && CONDUCTEUR_ROLES.has(role)

  const hasGestion = !isConducteurRole && canAccess(role, 'frais',        tenantAllowedPages, enabledModules)
  const hasRapide  =                      canAccess(role, 'frais-rapide', tenantAllowedPages, enabledModules)

  const tabs: { key: Tab; label: string }[] = [
    ...(hasGestion ? [{ key: 'gestion' as Tab, label: 'Gestion des frais' }] : []),
    ...(hasRapide  ? [{ key: 'rapide'  as Tab, label: 'Saisie rapide'     }] : []),
  ]

  const [tab, setTab] = useState<Tab>(() => tabs[0]?.key ?? 'rapide')

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
        {tab === 'gestion' && <Frais />}
        {tab === 'rapide'  && <FraisRapide />}
      </div>
    </div>
  )
}
