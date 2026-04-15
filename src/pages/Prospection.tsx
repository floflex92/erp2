import { useState } from 'react'
import PipelineTab  from '@/components/prospection/PipelineTab'
import ContactsTab  from '@/components/prospection/ContactsTab'
import DevisTab     from '@/components/prospection/DevisTab'
import RelancesTab  from '@/components/prospection/RelancesTab'
import DashboardTab from '@/components/prospection/DashboardTab'
import { useScrollToTopOnChange } from '@/hooks/useScrollToTopOnChange'

type Tab = 'pipeline' | 'contacts' | 'devis' | 'relances' | 'dashboard'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'pipeline',  label: 'Pipeline',  icon: '\u{1F3AF}' },
  { key: 'contacts',  label: 'Contacts',  icon: '\u{1F465}' },
  { key: 'devis',     label: 'Devis',     icon: '\u{1F4CB}' },
  { key: 'relances',  label: 'Relances',  icon: '\u{1F514}' },
  { key: 'dashboard', label: 'Dashboard', icon: '\u{1F4CA}' },
]

export default function Prospection() {
  const [activeTab, setActiveTab] = useState<Tab>('pipeline')
  useScrollToTopOnChange(activeTab)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] nx-muted">Developpement commercial</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">CRM et Prospection</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 nx-subtle">
          Pipeline, contacts, devis avec calcul auto, relances intelligentes et tableau de bord commercial.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto nx-scrollbar rounded-2xl p-1" style={{ background: 'rgba(0,0,0,0.15)' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'pipeline'  && <PipelineTab />}
      {activeTab === 'contacts'  && <ContactsTab />}
      {activeTab === 'devis'     && <DevisTab />}
      {activeTab === 'relances'  && <RelancesTab />}
      {activeTab === 'dashboard' && <DashboardTab />}
    </div>
  )
}
