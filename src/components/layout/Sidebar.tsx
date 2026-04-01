import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { countAllUnreadDemoMessages, subscribeDemoChatUpdates } from '@/lib/demoChat'
import { countUnreadDemoMails, ensureDemoMailbox, subscribeDemoMailUpdates } from '@/lib/demoMail'
import { isDemoProfil } from '@/lib/demoUsers'
import type { Role } from '@/lib/auth'
import { canAccess, useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { looseSupabase } from '@/lib/supabaseLoose'
import NexoraTruckLogo from './NexoraTruckLogo'

type NavItem = {
  to: string
  page: string
  label: string
  icon: string
}

type NavSection = {
  key: string
  label: string
  items: NavItem[]
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'nexora_sidebar_collapsed_v2'

const NAV_SECTIONS: NavSection[] = [
  {
    key: 'operations',
    label: 'Operations',
    items: [
      { to: '/dashboard', page: 'dashboard', label: 'Dashboard', icon: 'grid' },
      { to: '/tasks', page: 'tasks', label: 'Tâches', icon: 'check' },
      { to: '/planning', page: 'planning', label: 'Planning', icon: 'calendar' },
      { to: '/transports', page: 'transports', label: 'OT / Fret', icon: 'route' },
      { to: '/feuille-route', page: 'feuille-route', label: 'Feuille de route', icon: 'route' },
      { to: '/map-live', page: 'map-live', label: 'Map live', icon: 'pin' },
      { to: '/demandes-clients', page: 'demandes-clients', label: 'Demandes clients', icon: 'briefcase' },
    ],
  },
  {
    key: 'fleet',
    label: 'Flotte et RH',
    items: [
      { to: '/chauffeurs', page: 'chauffeurs', label: 'Conducteurs', icon: 'users' },
      { to: '/vehicules', page: 'vehicules', label: 'Camions', icon: 'truck' },
      { to: '/remorques', page: 'remorques', label: 'Remorques', icon: 'trailer' },
      { to: '/equipements', page: 'equipements', label: 'Equipements', icon: 'layers' },
      { to: '/maintenance', page: 'maintenance', label: 'Atelier', icon: 'wrench' },
      { to: '/tachygraphe', page: 'tachygraphe', label: 'Chronotachygraphe', icon: 'radar' },
      { to: '/amendes', page: 'amendes', label: 'PV et amendes', icon: 'receipt' },
      { to: '/rh', page: 'rh', label: 'Ressources humaines', icon: 'users' },
    ],
  },
  {
    key: 'business',
    label: 'Business',
    items: [
      { to: '/clients', page: 'clients', label: 'Clients', icon: 'briefcase' },
      { to: '/prospection', page: 'prospection', label: 'Prospection', icon: 'spark' },
      { to: '/facturation', page: 'facturation', label: 'Comptabilite', icon: 'receipt' },
      { to: '/paie', page: 'paie', label: 'Paie', icon: 'receipt' },
      { to: '/frais', page: 'frais', label: 'Frais', icon: 'receipt' },
      { to: '/espace-client', page: 'espace-client', label: 'Espace client', icon: 'briefcase' },
      { to: '/espace-affreteur', page: 'espace-affreteur', label: 'Espace affreteur', icon: 'briefcase' },
    ],
  },
  {
    key: 'communication',
    label: 'Communication',
    items: [
      { to: '/communication', page: 'communication', label: 'Communication', icon: 'inbox' },
      { to: '/tchat', page: 'tchat', label: 'Messagerie', icon: 'chat' },
      { to: '/mail', page: 'mail', label: 'Mail', icon: 'mail' },
      { to: '/coffre', page: 'coffre', label: 'Coffre', icon: 'briefcase' },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    items: [
      { to: '/parametres', page: 'parametres', label: 'Reglages', icon: 'settings' },
      { to: '/utilisateurs', page: 'utilisateurs', label: 'Utilisateurs', icon: 'users' },
      { to: '/mentions-legales', page: 'mentions-legales', label: 'Mentions legales', icon: 'shield' },
    ],
  },
]

function NavGlyph({ type, size = 18 }: { type: string; size?: number }) {
  const style = { width: size, height: size }
  const common = { ...style, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.8 as const }
  if (type === 'route') return <svg {...common}><path d="M6 19c0-2.2 1.8-4 4-4h4a4 4 0 1 0-4-4H8a4 4 0 1 1 0-8h10" /><circle cx="18" cy="3" r="1.4" /><circle cx="6" cy="21" r="1.4" /></svg>
  if (type === 'truck') return <svg {...common}><path d="M3 7h11v9H3z" /><path d="M14 10h3l3 3v3h-6z" /><circle cx="7.5" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" /></svg>
  if (type === 'users') return <svg {...common}><path d="M16 19a4 4 0 0 0-8 0" /><circle cx="12" cy="9" r="3" /><path d="M19 19a3 3 0 0 0-3-3" /><path d="M18 8a2.5 2.5 0 1 1 0 5" /></svg>
  if (type === 'calendar') return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
  if (type === 'pin') return <svg {...common}><path d="M12 21s6-5.8 6-11a6 6 0 1 0-12 0c0 5.2 6 11 6 11Z" /><circle cx="12" cy="10" r="2.2" /></svg>
  if (type === 'radar') return <svg {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><path d="M12 12 18 8" /></svg>
  if (type === 'layers') return <svg {...common}><path d="m12 3 9 4.5-9 4.5-9-4.5z" /><path d="m3 12 9 4.5 9-4.5" /></svg>
  if (type === 'spark') return <svg {...common}><path d="M12 3v4M12 17v4M4.9 6.1l2.8 2.8M16.3 15.5l2.8 2.8M3 12h4M17 12h4M4.9 17.9l2.8-2.8M16.3 8.5l2.8-2.8" /><circle cx="12" cy="12" r="2.5" /></svg>
  if (type === 'check') return <svg {...common}><path d="M20 6 9 17l-5-5" /></svg>
  if (type === 'receipt') return <svg {...common}><path d="M7 3h10v18l-3-2-2 2-2-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>
  if (type === 'trailer') return <svg {...common}><path d="M4 7h11v7H4z" /><path d="M15 9h4v5h-4" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="17.5" cy="17.5" r="1.5" /></svg>
  if (type === 'briefcase') return <svg {...common}><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" /><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M3 12h18" /></svg>
  if (type === 'wrench') return <svg {...common}><path d="m14 7 3-3 3 3-3 3" /><path d="M4 20 14 10" /><path d="m9 5-4 4 2 2 4-4" /></svg>
  if (type === 'chat') return <svg {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
  if (type === 'mail') return <svg {...common}><path d="M4 6h16v12H4z" /><path d="m4 7 8 6 8-6" /></svg>
  if (type === 'inbox') return <svg {...common}><path d="M4 6h16v10H4z" /><path d="M4 13h4l2 3h4l2-3h4" /></svg>
  if (type === 'settings') return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-1.8a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1 1 0 0 1-1-1v-1.8a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h1.8a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a1 1 0 0 1 1 1v1.8a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6Z" /></svg>
  if (type === 'shield') return <svg {...common}><path d="M12 3 5 6v6c0 5 3.4 7.7 7 9 3.6-1.3 7-4 7-9V6z" /><path d="m9.5 12 1.8 1.8 3.2-3.3" /></svg>
  if (type === 'expand') return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>
  if (type === 'collapse') return <svg {...common}><path d="m15 18-6-6 6-6" /></svg>
  if (type === 'chevron-down') return <svg {...common}><path d="m6 9 6 6 6-6" /></svg>
  return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></svg>
}

function DockItem({
  item,
  collapsed,
  role,
  notificationCount,
}: {
  item: NavItem
  collapsed: boolean
  role: Role | null
  notificationCount: number
}) {
  if (!canAccess(role, item.page)) return null

  const showBadge = (item.page === 'tchat' || item.page === 'mail') && notificationCount > 0

  return (
    <div className="group/nav-item relative">
      <NavLink
        to={item.to}
        className={({ isActive }) => [
          'flex items-center gap-3 rounded-xl border text-[13px] transition-colors',
          collapsed ? 'h-11 w-11 justify-center px-0' : 'w-full px-3 py-2',
          isActive
            ? 'border-white/20 bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
            : 'border-transparent text-slate-300 hover:border-white/12 hover:bg-white/[0.06] hover:text-white',
        ].join(' ')}
      >
        <span className="flex-shrink-0">
          <NavGlyph type={item.icon} size={collapsed ? 18 : 17} />
        </span>
        {!collapsed && (
          <span className="truncate font-medium">{item.label}</span>
        )}
        {showBadge && (
          <span
            className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${collapsed ? 'absolute -right-1 -top-1' : 'ml-auto'}`}
            style={{ background: 'linear-gradient(180deg, #60A5FA, #2563EB)' }}
          >
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </NavLink>

      {collapsed && (
        <div className="pointer-events-none absolute left-full top-1/2 z-[200] ml-3 -translate-y-1/2 whitespace-nowrap opacity-0 transition-opacity duration-100 group-hover/nav-item:opacity-100">
          <div className="rounded-lg border border-slate-600/70 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white shadow-xl">
            {item.label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
          </div>
        </div>
      )}
    </div>
  )
}

function useBadgeCount(page: string, profilId: string | null, demoProfil: unknown) {
  const [count, setCount] = useState(0)
  const { profil } = useAuth()

  useEffect(() => {
    if (!profilId || (page !== 'tchat' && page !== 'mail')) {
      setCount(0)
      return
    }
    const safeProfilId = profilId

    async function load() {
      if (page === 'mail') {
        if (profil) ensureDemoMailbox(profil)
        setCount(countUnreadDemoMails(safeProfilId))
        return
      }

      if (demoProfil) {
        setCount(countAllUnreadDemoMessages(safeProfilId))
        return
      }

      const { data } = await looseSupabase
        .from('tchat_messages')
        .select('id')
        .neq('sender_id', safeProfilId)
        .is('read_at', null)
      setCount(Array.isArray(data) ? data.length : 0)
    }

    void load()

    if (page === 'mail') return subscribeDemoMailUpdates(() => void load())
    if (demoProfil) return subscribeDemoChatUpdates(() => void load())

    const channel = looseSupabase
      .channel(`dock-badge-${page}-${safeProfilId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tchat_messages' }, () => void load())
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [demoProfil, page, profil, profilId])

  return count
}

export default function Sidebar() {
  const { profil, role, isDemoSession } = useAuth()
  const profilId = profil?.id ?? null
  const demoProfil = isDemoSession && profil && isDemoProfil(profil) ? profil : null

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)
    if (saved === '1') return true
    if (saved === '0') return false
    return window.innerWidth < 1280
  })

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => (
    Object.fromEntries(NAV_SECTIONS.map(section => [section.key, true]))
  ))

  const chatCount = useBadgeCount('tchat', profilId, demoProfil)
  const mailCount = useBadgeCount('mail', profilId, demoProfil)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  const visibleSections = useMemo(() => (
    NAV_SECTIONS
      .map(section => ({
        ...section,
        items: section.items.filter(item => canAccess(role, item.page)),
      }))
      .filter(section => section.items.length > 0)
  ), [role])

  function getBadge(page: string): number {
    if (page === 'tchat') return chatCount
    if (page === 'mail') return mailCount
    return 0
  }

  function toggleSection(sectionKey: string) {
    setOpenSections(current => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }))
  }

  return (
    <>
      <aside
        className="relative shrink-0 overflow-visible transition-all duration-200 ease-in-out"
        style={{ width: collapsed ? '0px' : '236px' }}
      >
        {!collapsed && (
          <div
            className="flex h-full flex-col px-2 py-3 transition-all duration-200"
            style={{
              background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(15,23,42,0.95))',
              borderRight: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="mb-3 flex items-center px-2">
              <NexoraTruckLogo dark size="sm" subtitle="ERP transport" />
            </div>

            <div className="nx-scrollbar flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-1 pb-2">
              {visibleSections.map(section => {
                const sectionOpen = openSections[section.key] ?? true
                return (
                  <div
                    key={section.key}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection(section.key)}
                      className="mb-1 flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-200"
                    >
                      <span className="truncate">{section.label}</span>
                      <span className="ml-auto text-[10px] tracking-normal text-slate-500">{section.items.length}</span>
                      <span className={`text-slate-500 transition-transform ${sectionOpen ? 'rotate-180' : ''}`}>
                        <NavGlyph type="chevron-down" size={14} />
                      </span>
                    </button>

                    {sectionOpen && (
                      <div className="flex flex-col gap-1">
                        {section.items.map(item => (
                          <DockItem
                            key={item.to}
                            item={item}
                            collapsed={false}
                            role={role}
                            notificationCount={getBadge(item.page)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-2 border-t border-white/[0.08] px-1 pt-3">
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="flex w-full items-center gap-2.5 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                title="Replier completement"
              >
                <NavGlyph type="collapse" size={17} />
                <span className="truncate text-xs font-medium">Replier le menu</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {!collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="fixed left-[222px] top-3 z-[95] hidden h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-slate-900/90 text-slate-200 shadow-lg backdrop-blur transition-colors hover:bg-slate-800 hover:text-white lg:flex"
          title="Replier le menu"
          aria-label="Replier le menu"
        >
          <NavGlyph type="collapse" size={16} />
        </button>
      )}

      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="fixed left-2 top-3 z-[95] flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-slate-900/90 text-slate-200 shadow-lg backdrop-blur transition-colors hover:bg-slate-800 hover:text-white"
          title="Afficher le menu"
          aria-label="Afficher le menu"
        >
          <NavGlyph type="expand" size={17} />
        </button>
      )}
    </>
  )
}
