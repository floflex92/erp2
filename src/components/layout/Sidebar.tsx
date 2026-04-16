import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { countAllUnreadDemoMessages, subscribeDemoChatUpdates } from '@/lib/demoChat'
import { countUnreadDemoMails, ensureDemoMailbox, subscribeDemoMailUpdates } from '@/lib/demoMail'
import { isDemoProfil } from '@/lib/demoUsers'
import type { Role } from '@/lib/auth'
import { canAccess, useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { looseSupabase } from '@/lib/supabaseLoose'
import { countAlertesActives } from '@/lib/alertesTransport'
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
const SIDEBAR_COLLAPSED_EVENT = 'nexora:sidebar-collapsed-change'

// Couleur de l'avatar selon la famille de rôle
export function getRoleAvatarColor(role: Role | null): string {
  if (!role) return '#6E6E73'
  const map: Partial<Record<Role, string>> = {
    admin:               '#007AFF',
    super_admin:         '#007AFF',
    dirigeant:           '#007AFF',
    exploitant:          '#007AFF',
    logisticien:         '#007AFF',
    commercial:          '#34C759',
    observateur:         '#6E6E73',
    demo:                '#6E6E73',
    investisseur:        '#5856D6',
    comptable:           '#5856D6',
    facturation:         '#5856D6',
    administratif:       '#5856D6',
    mecanicien:          '#FF9500',
    maintenance:         '#FF9500',
    flotte:              '#FF9500',
    conducteur:          '#32ADE6',
    conducteur_affreteur:'#32ADE6',
    rh:                  '#FF2D55',
    affreteur:           '#30B0C7',
    client:              '#30B0C7',
  }
  return map[role] ?? '#6E6E73'
}

const NAV_SECTIONS: NavSection[] = [
  {
    key: 'operations',
    label: 'Opérations',
    items: [
      { to: '/ops-center',         page: 'ops-center',         label: 'Ops Center',           icon: 'ops-center' },
      { to: '/dashboard',         page: 'dashboard',         label: 'Tableau de bord',      icon: 'dashboard' },
      { to: '/dashboard-conducteur', page: 'dashboard-conducteur', label: 'Mon accueil',   icon: 'house' },
      { to: '/planning',          page: 'planning',          label: 'Planning',             icon: 'calendar' },
      { to: '/planning-conducteur', page: 'planning-conducteur', label: 'Mon planning',   icon: 'calendar-user' },
      { to: '/transports',        page: 'transports',        label: 'OT / Fret',            icon: 'route' },
      { to: '/feuille-route',     page: 'feuille-route',     label: 'Feuille de route',     icon: 'road' },
      { to: '/map-live',          page: 'map-live',          label: 'Map live',             icon: 'pin' },
      { to: '/demandes-clients',  page: 'demandes-clients',  label: 'Demandes clients',     icon: 'inbox-request' },
      { to: '/tasks',             page: 'tasks',             label: 'Tâches',               icon: 'check' },
    ],
  },
  {
    key: 'fleet',
    label: 'Flotte',
    items: [
      { to: '/chauffeurs',   page: 'chauffeurs',   label: 'Conducteurs',       icon: 'driver' },
      { to: '/vehicules',    page: 'vehicules',    label: 'Camions',           icon: 'truck' },
      { to: '/remorques',    page: 'remorques',    label: 'Remorques',         icon: 'trailer' },
      { to: '/equipements',  page: 'equipements',  label: 'Equipements',       icon: 'layers' },
      { to: '/maintenance',  page: 'maintenance',  label: 'Atelier',           icon: 'wrench' },
      { to: '/tachygraphe',  page: 'tachygraphe',  label: 'Chronotachygraphe', icon: 'tachy' },
      { to: '/amendes',      page: 'amendes',      label: 'PV & Amendes',      icon: 'amende' },
      { to: '/entrepots',    page: 'entrepots',    label: 'Entrepôts',         icon: 'warehouse' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    items: [
      { to: '/facturation',          page: 'facturation',          label: 'Facturation',  icon: 'invoice' },
      { to: '/reglements',           page: 'reglements',           label: 'Règlements',   icon: 'payment' },
      { to: '/tresorerie',           page: 'tresorerie',           label: 'Trésorerie',   icon: 'bank' },
      { to: '/analytique-transport', page: 'analytique-transport', label: 'Analytique',   icon: 'pie-chart' },
      { to: '/bilan-co2',                page: 'bilan-co2',                label: 'Bilan CO₂',   icon: 'leaf' },
      { to: '/frais',                page: 'frais',                label: 'Frais',        icon: 'expense' },
      { to: '/frais-rapide',         page: 'frais-rapide',         label: 'Saisie frais rapide', icon: 'receipt-quick' },
      { to: '/paie',                 page: 'paie',                 label: 'Paie',         icon: 'payroll' },
    ],
  },
  {
    key: 'crm',
    label: 'CRM',
    items: [
      { to: '/clients',          page: 'clients',          label: 'Clients',          icon: 'company' },
      { to: '/prospection',      page: 'prospection',      label: 'Prospection',      icon: 'spark' },
      { to: '/espace-client',    page: 'espace-client',    label: 'Espace client',    icon: 'client-space' },
      { to: '/compte-client-db', page: 'compte-client-db', label: 'Compte client DB', icon: 'database' },
      { to: '/espace-affreteur', page: 'espace-affreteur', label: 'Espace affreteur', icon: 'handshake' },
    ],
  },
  {
    key: 'rh',
    label: 'RH',
    items: [
      { to: '/rh', page: 'rh', label: 'Ressources humaines', icon: 'rh' },
      { to: '/entretiens-salaries', page: 'entretiens-salaries', label: 'Entretiens salaries', icon: 'interview' },
    ],
  },
  {
    key: 'communications',
    label: 'Communications',
    items: [
      { to: '/tchat',         page: 'tchat',         label: 'Messagerie',   icon: 'chat' },
      { to: '/mail',          page: 'mail',          label: 'Mail',         icon: 'mail' },
      { to: '/inter-erp',     page: 'inter-erp',     label: 'Inter-ERP',    icon: 'inter-erp' },
      { to: '/communication', page: 'communication', label: 'Communication', icon: 'inbox' },
      { to: '/coffre',        page: 'coffre',        label: 'Coffre',       icon: 'safe' },
    ],
  },
  {
    key: 'admin',
    label: 'Administration',
    items: [
      { to: '/parametres',     page: 'parametres',     label: 'Réglages',         icon: 'settings' },
      { to: '/utilisateurs',   page: 'utilisateurs',   label: 'Comptes',          icon: 'users' },
      { to: '/tenant-admin',   page: 'tenant-admin',   label: 'Réglages tenant',  icon: 'shield' },
      { to: '/super-admin',    page: 'super-admin',    label: 'Plateforme',       icon: 'spark' },
      { to: '/mentions-legales', page: 'mentions-legales', label: 'Mentions légales', icon: 'doc' },
    ],
  },
]

function NavGlyph({ type, size = 18 }: { type: string; size?: number }) {
  const style = { width: size, height: size }
  const common = { ...style, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.8 as const }
  // Opérations
  if (type === 'war-room')     return <svg {...common}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><circle cx="12" cy="17" r=".6" fill="currentColor" /></svg>
  if (type === 'ops-center')   return <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><line x1="12" y1="3" x2="12" y2="7" /><line x1="12" y1="17" x2="12" y2="21" /><line x1="3" y1="12" x2="7" y2="12" /><line x1="17" y1="12" x2="21" y2="12" /></svg>
  if (type === 'bell-alert')   return <svg {...common}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /><circle cx="12" cy="3" r="1.2" fill="currentColor" /></svg>
  if (type === 'dashboard')    return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
  if (type === 'house')        return <svg {...common}><path d="M3 10.5 12 3l9 7.5V21H3V10.5Z" /><path d="M9 21v-8h6v8" /></svg>
  if (type === 'calendar')     return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
  if (type === 'calendar-user') return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /><circle cx="12" cy="16" r="2" /><path d="M8.5 21a3.5 3.5 0 0 1 7 0" /></svg>
  if (type === 'route')        return <svg {...common}><path d="M6 19c0-2.2 1.8-4 4-4h4a4 4 0 1 0-4-4H8a4 4 0 1 1 0-8h10" /><circle cx="18" cy="3" r="1.4" /><circle cx="6" cy="21" r="1.4" /></svg>
  if (type === 'road')         return <svg {...common}><path d="M5 21 9 3M19 21 15 3M9 3h6M5 21h14" /><path d="M10.5 12h3M11 7.5h2M11.5 16.5h1" /></svg>
  if (type === 'pin')          return <svg {...common}><path d="M12 21s6-5.8 6-11a6 6 0 1 0-12 0c0 5.2 6 11 6 11Z" /><circle cx="12" cy="10" r="2.2" /></svg>
  if (type === 'inbox-request') return <svg {...common}><path d="M4 6h16v12H4z" /><path d="M4 13h4l2 3h4l2-3h4" /><path d="M12 3v5M9.5 5.5 12 3l2.5 2.5" /></svg>
  if (type === 'check')        return <svg {...common}><path d="M20 6 9 17l-5-5" /></svg>
  if (type === 'receipt-quick') return <svg {...common}><path d="M7 3h10v14l-3-2-2 2-2-2-3 2z" /><path d="M9 8h6M9 11h4" /><path d="M15 18l3 3" /><circle cx="19" cy="21" r="1" /></svg>
  // Flotte
  if (type === 'driver')       return <svg {...common}><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0" /><path d="M9 11.5 7.5 14M15 11.5l1.5 2.5" /></svg>
  if (type === 'truck')        return <svg {...common}><path d="M3 7h11v9H3z" /><path d="M14 10h3l3 3v3h-6z" /><circle cx="7.5" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" /></svg>
  if (type === 'trailer')      return <svg {...common}><path d="M4 7h11v7H4z" /><path d="M15 9h4v5h-4" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="17.5" cy="17.5" r="1.5" /></svg>
  if (type === 'layers')       return <svg {...common}><path d="m12 3 9 4.5-9 4.5-9-4.5z" /><path d="m3 12 9 4.5 9-4.5" /></svg>
  if (type === 'wrench')       return <svg {...common}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
  if (type === 'tachy')        return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 12 7 7" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><path d="M12 6v1M6 12h1M18 12h-1M7.76 7.76l.7.7M16.24 7.76l-.7.7" /></svg>
  if (type === 'amende')       return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5M12 16v1" /></svg>
  if (type === 'warehouse')    return <svg {...common}><path d="M3 9.5 12 4l9 5.5V20H3V9.5Z" /><path d="M9 20v-6h6v6" /></svg>
  // Finance
  if (type === 'invoice')      return <svg {...common}><path d="M7 3h10v18l-3-2-2 2-2-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /><path d="M14 16l1.5 1.5" /></svg>
  if (type === 'payment')      return <svg {...common}><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20" /><path d="M7 14h.01M11 14h3" /></svg>
  if (type === 'bank')         return <svg {...common}><path d="M6 10v7M10 10v7M14 10v7M18 10v7" /><path d="M4 17h16M2 10h20M12 3 2 8h20L12 3z" /></svg>
  if (type === 'pie-chart')    return <svg {...common}><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
  if (type === 'leaf')         return <svg {...common}><path d="M7 20c0-5.5 4-9 9-9M7 20c4-1 7-4 7-9" /><path d="M21 3c-3 4-7 7-14 7" /></svg>
  if (type === 'expense')      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5c.5-1.5 4-1.5 4 .5 0 2-4 1-4 3.5 0 2 4 2.5 4.5 1" /><path d="M12 7v1M12 16v1" /></svg>
  if (type === 'payroll')      return <svg {...common}><path d="M16 19a4 4 0 0 0-8 0" /><circle cx="12" cy="9" r="3" /><path d="M3 17h3M18 17h3" /><circle cx="3" cy="14" r="2" /><circle cx="21" cy="14" r="2" /></svg>
  // CRM
  if (type === 'company')      return <svg {...common}><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 10h2M13 10h2M9 15h2M13 15h2" /></svg>
  if (type === 'spark')        return <svg {...common}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /><circle cx="12" cy="12" r="2.5" /></svg>
  if (type === 'client-space') return <svg {...common}><circle cx="12" cy="8" r="3" /><path d="M6 20a6 6 0 0 1 12 0" /><path d="m9 14 2 2 4-4" /></svg>
  if (type === 'handshake')    return <svg {...common}><path d="M7 11V7a2 2 0 0 1 4 0v3" /><path d="M11 10h2l3-3a2 2 0 0 1 2.83 2.83L15 13H7a2 2 0 0 0-2 2v2" /><path d="M5 17a2 2 0 0 0 4 0" /><path d="m13 14 2 2" /></svg>
  // RH
  if (type === 'rh')           return <svg {...common}><path d="M16 19a4 4 0 0 0-8 0" /><circle cx="12" cy="9" r="3" /><path d="M19 19a3 3 0 0 0-3-3" /><path d="M18 8a2.5 2.5 0 1 1 0 5" /><path d="M5 19a3 3 0 0 1 3-3" /><path d="M6 8a2.5 2.5 0 1 0 0 5" /></svg>
  if (type === 'interview')    return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /><path d="M8 14h8M8 17h5" /></svg>
  // Communications
  if (type === 'chat')         return <svg {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
  if (type === 'mail')         return <svg {...common}><path d="M4 6h16v12H4z" /><path d="m4 7 8 6 8-6" /></svg>
  if (type === 'inter-erp')    return <svg {...common}><circle cx="5" cy="12" r="2" /><circle cx="19" cy="12" r="2" /><path d="M7 12h10" /><circle cx="12" cy="5" r="2" /><path d="M12 7v3M7.5 10l-2 2M16.5 10l2 2" /></svg>
  if (type === 'inbox')        return <svg {...common}><path d="M4 6h16v10H4z" /><path d="M4 13h4l2 3h4l2-3h4" /></svg>
  if (type === 'safe')         return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M12 9v-2M12 17v-2M21 10h-2M5 10H3" /></svg>
  // Admin
  if (type === 'settings')     return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-1.8a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1 1 0 0 1-1-1v-1.8a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.2-1.2a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h1.8a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a1 1 0 0 1 1 1v1.8a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6Z" /></svg>
  if (type === 'users')        return <svg {...common}><path d="M16 19a4 4 0 0 0-8 0" /><circle cx="12" cy="9" r="3" /><path d="M19 19a3 3 0 0 0-3-3" /><path d="M18 8a2.5 2.5 0 1 1 0 5" /></svg>
  if (type === 'shield')       return <svg {...common}><path d="M12 3 5 6v6c0 5 3.4 7.7 7 9 3.6-1.3 7-4 7-9V6z" /><path d="m9.5 12 1.8 1.8 3.2-3.3" /></svg>
  if (type === 'doc')          return <svg {...common}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 12h6M9 16h4" /></svg>
  // Navigation
  if (type === 'expand')       return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>
  if (type === 'collapse')     return <svg {...common}><path d="m15 18-6-6 6-6" /></svg>
  if (type === 'chevron-down') return <svg {...common}><path d="m6 9 6 6 6-6" /></svg>
  // Fallback
  return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></svg>
}

function DockItem({
  item,
  collapsed,
  role,
  tenantAllowedPages,
  enabledModules,
  notificationCount,
}: {
  item: NavItem
  collapsed: boolean
  role: Role | null
  tenantAllowedPages: string[] | null
  enabledModules: import('@/lib/tenantAdmin').TenantModule[] | null
  notificationCount: number
}) {
  if (!canAccess(role, item.page, tenantAllowedPages, enabledModules)) return null

  const isMessageBadge = (item.page === 'tchat' || item.page === 'mail') && notificationCount > 0
  const isAlertesBadge = item.page === 'ops-center' && notificationCount > 0
  const isWarRoom = item.page === 'war-room'
  const isOpsCenter = item.page === 'ops-center'

  return (
    <div className="group/nav-item relative">
      <NavLink
        to={item.to}
        className={({ isActive }) => [
          'nx-sidebar-item flex items-center gap-3 rounded-xl border text-[13px] transition-colors',
          collapsed ? 'h-11 w-11 justify-center px-0' : 'w-full px-3 py-2',
          isActive ? 'nx-sidebar-item-active' : '',
          isWarRoom && !collapsed ? 'nx-sidebar-warroom' : '',
          isOpsCenter && !collapsed ? 'nx-sidebar-warroom' : '',
        ].join(' ')}
      >
        <span className={`flex-shrink-0 ${isWarRoom || isOpsCenter ? 'nx-warroom-icon' : ''}`}>
          <NavGlyph type={item.icon} size={collapsed ? 18 : 17} />
        </span>
        {!collapsed && (
          <span className="truncate font-medium">{item.label}</span>
        )}
        {isMessageBadge && (
          <span
            className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${collapsed ? 'absolute -right-1 -top-1' : 'ml-auto'}`}
            style={{ background: 'linear-gradient(180deg, #60A5FA, #2563EB)' }}
          >
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
        {isAlertesBadge && (
          <span
            className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${collapsed ? 'absolute -right-1 -top-1' : 'ml-auto'}`}
            style={{ background: 'linear-gradient(180deg, #F87171, #DC2626)' }}
          >
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        )}
        {isWarRoom && !isMessageBadge && (
          <span
            className={`inline-flex h-2 w-2 rounded-full ${collapsed ? 'absolute -right-0.5 -top-0.5' : 'ml-auto'}`}
            style={{ background: '#FF3B30', boxShadow: '0 0 6px 2px rgba(255,59,48,0.5)' }}
            title="Surveillance active"
          />
        )}
      </NavLink>

      {collapsed && (
        <div className="pointer-events-none absolute left-full top-1/2 z-[200] ml-3 -translate-y-1/2 whitespace-nowrap opacity-0 transition-opacity duration-100 group-hover/nav-item:opacity-100">
          <div className="rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-xl" style={{ borderColor: 'var(--sidebar-border)', background: 'var(--surface-sidebar)', color: 'var(--sidebar-text-strong)' }}>
            {item.label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent" style={{ borderRightColor: 'var(--surface-sidebar)' }} />
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
  const { user, profil, accountProfil, role, isDemoSession, tenantAllowedPages, enabledModules, canUseSessionPicker } = useAuth()
  const profilId = profil?.id ?? null
  const demoProfil = isDemoSession && profil && isDemoProfil(profil) ? profil : null
  const navigate = useNavigate()

  const firstName = profil?.prenom?.trim() || accountProfil?.prenom?.trim() || ''
  const lastName = profil?.nom?.trim() || accountProfil?.nom?.trim() || ''
  const emailNameParts = (user?.email ?? '')
    .split('@')[0]
    ?.split(/[._-]+/)
    .map(part => part.trim())
    .filter(Boolean) ?? []
  const derivedFirstName = !firstName && emailNameParts.length >= 2
    ? emailNameParts[emailNameParts.length - 1]
    : ''
  const derivedLastNameInitial = !lastName && emailNameParts.length >= 1
    ? emailNameParts[0].charAt(0).toUpperCase()
    : ''
  const lastNameInitial = lastName.charAt(0).toUpperCase()
  const displayName = firstName
    ? [firstName, lastNameInitial ? `${lastNameInitial}.` : ''].filter(Boolean).join(' ')
    : derivedFirstName
      ? [derivedFirstName, derivedLastNameInitial ? `${derivedLastNameInitial}.` : ''].filter(Boolean).join(' ')
      : lastName || 'Utilisateur'

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('')

  const avatarColor = getRoleAvatarColor(role)

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

  const chatCount   = useBadgeCount('tchat', profilId, demoProfil)
  const mailCount   = useBadgeCount('mail', profilId, demoProfil)
  const [alertesCount, setAlertesCount] = useState(0)

  useEffect(() => {
    let mounted = true
    async function loadAlertes() {
      try {
        const n = await countAlertesActives()
        if (mounted) setAlertesCount(n)
      } catch {
        // silencieux
      }
    }
    void loadAlertes()
    const timer = setInterval(() => void loadAlertes(), 5 * 60 * 1000)
    return () => { mounted = false; clearInterval(timer) }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0')
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT))
  }, [collapsed])

  const visibleSections = useMemo(() => (
    NAV_SECTIONS
      .map(section => ({
        ...section,
        items: section.items.filter(item => canAccess(role, item.page, tenantAllowedPages, enabledModules)),
      }))
      .filter(section => section.items.length > 0)
  ), [role, tenantAllowedPages, enabledModules])

  function getBadge(page: string): number {
    if (page === 'tchat')     return chatCount
    if (page === 'mail')      return mailCount
    if (page === 'ops-center') return alertesCount
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
            className="nx-sidebar-panel flex h-full flex-col px-2 py-3 transition-all duration-200"
          >
            {/* Logo */}
            <div className="mb-2 flex items-center px-2">
              <NexoraTruckLogo dark size="sm" subtitle="ERP transport" />
            </div>

            {/* Carte profil */}
            <div className="mb-3 mx-1 flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                style={{ background: avatarColor }}
              >
                {initials || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold" style={{ color: 'var(--sidebar-text-strong)' }}>{displayName}</p>
                <p className="truncate text-[10px]" style={{ color: 'var(--sidebar-text)', opacity: 0.78 }}>
                  {role ? (role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ')) : 'Utilisateur'}
                </p>
              </div>
              {isDemoSession && (
                <span className="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}>
                  DEMO
                </span>
              )}
            </div>

            <div className="nx-scrollbar flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-1 pb-2">
              {visibleSections.map(section => {
                const sectionOpen = openSections[section.key] ?? true
                return (
                  <div
                    key={section.key}
                    className="nx-sidebar-section p-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection(section.key)}
                      className="mb-1 flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--sidebar-text)] transition-colors hover:bg-[color:var(--sidebar-item-hover)] hover:text-[color:var(--sidebar-text-strong)]"
                    >
                      <span className="truncate">{section.label}</span>
                      <span className="ml-auto text-[10px] tracking-normal text-[color:var(--sidebar-text)]">{section.items.length}</span>
                      <span className={`text-[color:var(--sidebar-text)] transition-transform ${sectionOpen ? 'rotate-180' : ''}`}>
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
                            tenantAllowedPages={tenantAllowedPages}
                            enabledModules={enabledModules}
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
              <div className="flex flex-col gap-1">
                {canUseSessionPicker && (
                  <>
                    <NavLink
                      to="/parametres"
                      className={({ isActive }) => [
                        'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[color:var(--sidebar-text)] transition-colors hover:bg-[color:var(--sidebar-item-hover)] hover:text-[color:var(--sidebar-text-strong)]',
                        isActive ? 'nx-sidebar-item-active' : '',
                      ].join(' ')}
                      style={{ borderColor: 'var(--sidebar-border)' }}
                      title="Espace Administration"
                    >
                      <NavGlyph type="shield" size={17} />
                      <span className="truncate text-xs font-medium">Espace Admin</span>
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => navigate('/session-picker')}
                      className="flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-[color:var(--sidebar-text)] transition-colors hover:bg-[color:var(--sidebar-item-hover)] hover:text-[color:var(--sidebar-text-strong)]"
                      style={{ borderColor: 'var(--sidebar-border)' }}
                      title="Changer de rôle / simuler un espace métier"
                    >
                      <NavGlyph type="users" size={17} />
                      <span className="truncate text-xs font-medium">Changer de rôle</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-[color:var(--sidebar-text)] transition-colors hover:bg-[color:var(--sidebar-item-hover)] hover:text-[color:var(--sidebar-text-strong)]"
                  style={{ borderColor: 'var(--sidebar-border)' }}
                  title="Replier completement"
                >
                  <NavGlyph type="collapse" size={17} />
                  <span className="truncate text-xs font-medium">Replier le menu</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {!collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="fixed left-[222px] top-3 z-[95] hidden h-10 w-10 items-center justify-center rounded-xl border text-[color:var(--sidebar-text)] shadow-lg backdrop-blur transition-colors hover:text-[color:var(--sidebar-text-strong)] lg:flex"
          style={{ borderColor: 'var(--sidebar-border)', background: 'color-mix(in srgb, var(--sidebar-grad-end) 90%, transparent)' }}
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
          className="fixed left-2 top-3 z-[95] flex h-11 w-11 items-center justify-center rounded-xl border text-[color:var(--sidebar-text)] shadow-lg backdrop-blur transition-colors hover:text-[color:var(--sidebar-text-strong)]"
          style={{ borderColor: 'var(--sidebar-border)', background: 'color-mix(in srgb, var(--sidebar-grad-end) 90%, transparent)' }}
          title="Afficher le menu"
          aria-label="Afficher le menu"
        >
          <NavGlyph type="expand" size={17} />
        </button>
      )}
    </>
  )
}
