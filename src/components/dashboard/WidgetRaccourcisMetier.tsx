import { Link } from 'react-router-dom'
import { canAccess, useAuth, type Role } from '@/lib/auth'

interface ShortcutDef {
  page: string
  label: string
  note: string
  helper: string
  icon: 'transport' | 'planning' | 'tasks' | 'clients' | 'facturation' | 'maintenance' | 'frais' | 'communication'
}

const SHORTCUTS: ShortcutDef[] = [
  { page: 'transports', label: 'Ordres de transport', note: 'Suivre les missions en cours', helper: 'Operations live', icon: 'transport' },
  { page: 'planning', label: 'Planning', note: 'Affectations et disponibilites', helper: 'Jours et equipes', icon: 'planning' },
  { page: 'tasks', label: 'Taches', note: 'Actions a traiter aujourd\'hui', helper: 'Priorites du jour', icon: 'tasks' },
  { page: 'clients', label: 'Clients', note: 'Infos clients et priorites', helper: 'Fiches et contacts', icon: 'clients' },
  { page: 'facturation', label: 'Facturation', note: 'Suivi de la facturation', helper: 'Paiements et relances', icon: 'facturation' },
  { page: 'maintenance', label: 'Atelier', note: 'Entretien et interventions', helper: 'Parc roulant', icon: 'maintenance' },
  { page: 'frais', label: 'Frais', note: 'Saisie et validation', helper: 'Notes et controle', icon: 'frais' },
  { page: 'communication', label: 'Communication', note: 'Coordination equipe', helper: 'Messages internes', icon: 'communication' },
]

export function WidgetRaccourcisMetier() {
  const { role, tenantAllowedPages, enabledModules } = useAuth()
  const currentRole = (role as Role) ?? null

  const links = SHORTCUTS.filter(shortcut => canAccess(currentRole, shortcut.page, tenantAllowedPages, enabledModules)).slice(0, 6)

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border" style={{ borderColor: 'color-mix(in srgb, var(--border) 60%, #a78bfa)' }}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: 'var(--primary)' }}>
            <path d="M12 3v18M3 12h18" />
          </svg>
        </div>
        <p className="text-sm text-slate-500">Aucun raccourci disponible pour ce metier.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div
        className="rounded-2xl border px-3 py-2.5"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--surface-soft)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--primary)' }}>
              Hub metier
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Acces rapide a tes modules essentiels</p>
          </div>
          <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ borderColor: 'color-mix(in srgb, var(--border) 55%, #a78bfa)', color: 'var(--primary)' }}>
            {links.length} actifs
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {links.map(link => (
        <Link
          key={link.page}
          to={`/${link.page}`}
          className="group rounded-2xl border px-3 py-3 transition-colors hover:bg-[color:var(--surface-soft)]"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)',
          }}
        >
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
              style={{
                borderColor: 'color-mix(in srgb, var(--border) 55%, #a78bfa)',
                background: 'color-mix(in srgb, var(--primary-soft) 65%, var(--surface))',
                color: 'var(--primary)',
              }}
            >
              <ShortcutIcon icon={link.icon} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{link.label}</p>
                <span className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: 'color-mix(in srgb, var(--border) 50%, #a78bfa)', color: 'var(--primary)' }}>
                  {link.helper}
                </span>
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{link.note}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t pt-2" style={{ borderColor: 'var(--border)' }}>
            <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>{link.page}</p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--primary)' }}>
              Ouvrir
              <svg className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </div>
        </Link>
      ))}
      </div>
    </div>
  )
}

function ShortcutIcon({ icon }: { icon: ShortcutDef['icon'] }) {
  const path = icon === 'transport'
    ? <path d="M3 16V7a2 2 0 0 1 2-2h9v11H3Zm11-7h4l3 3v4h-7V9Zm-7 9.5a1.5 1.5 0 1 1 0 .01Zm11 0a1.5 1.5 0 1 1 0 .01Z" />
    : icon === 'planning'
      ? <path d="M8 3v3M16 3v3M4 8h16M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Zm2 7h3v3H8v-3Z" />
      : icon === 'tasks'
        ? <path d="m9 11 2 2 4-4M7 5h10a2 2 0 0 1 2 2v12H5V7a2 2 0 0 1 2-2Z" />
        : icon === 'clients'
          ? <path d="M16 19a4 4 0 0 0-8 0M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 7a4 4 0 0 0-3-3.87M17 8a3 3 0 0 1 0 6" />
          : icon === 'facturation'
            ? <path d="M7 3h10v18l-3-2-2 2-2-2-3 2V3Zm3 5h4M9 11h6M9 14h4" />
            : icon === 'maintenance'
              ? <path d="m14.5 6.5 3-3 3 3-3 3-3-3ZM3 20l7.2-7.2m2.8-2.8L7 3l-4 4 7 6" />
              : icon === 'frais'
                ? <path d="M5 4h14v16H5V4Zm3 4h8M8 12h8M8 16h5" />
                : <path d="M4 6h16v12H4V6Zm8 6 8-6M4 6l8 6" />

  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  )
}
