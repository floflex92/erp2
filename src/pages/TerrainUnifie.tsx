import { lazy, Suspense, useState } from 'react'
import { canAccess, useAuth } from '@/lib/auth'

const Terrain = lazy(() => import('./Terrain'))
const MapLive = lazy(() => import('./MapLive'))

type Tab = 'terrain' | 'carte'

const TAB_ICONS: Record<Tab, string> = {
  terrain: 'M5 21 9 3M19 21 15 3M9 3h6M5 21h14M10.5 12h3M11 7.5h2M11.5 16.5h1',
  carte:   'M12 21s6-5.8 6-11a6 6 0 1 0-12 0c0 5.2 6 11 6 11ZM12 10a2.2 2.2 0 1 0 0-4.4A2.2 2.2 0 0 0 12 10z',
}

export default function TerrainUnifie() {
  const { role, tenantAllowedPages, enabledModules } = useAuth()

  const hasTerrain = canAccess(role, 'terrain',  tenantAllowedPages, enabledModules)
  const hasCarte   = canAccess(role, 'map-live', tenantAllowedPages, enabledModules)

  const tabs: { key: Tab; label: string }[] = [
    ...(hasTerrain ? [{ key: 'terrain' as Tab, label: 'Terrain' }] : []),
    ...(hasCarte   ? [{ key: 'carte'   as Tab, label: 'Carte live' }] : []),
  ]

  const [tab, setTab] = useState<Tab>(() => tabs[0]?.key ?? 'terrain')

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
          {tab === 'terrain' && <Terrain />}
          {tab === 'carte'   && <MapLive />}
        </div>
      </Suspense>
    </div>
  )
}
