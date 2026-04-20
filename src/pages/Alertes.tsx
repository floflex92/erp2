import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAlertesTransport } from '@/hooks/useAlertesTransport'
import { usePageMeta } from '@/hooks/usePageMeta'
import type { AlerteItem, CategorieAlerte, SeveriteAlerte, TypeAlerte } from '@/lib/alertesTransport'
import { LABELS_TYPE } from '@/lib/alertesTransport'

// ─── Config visuelle ────────────────────────────────────────────────────────────

const SEV_CONFIG: Record<SeveriteAlerte, { label: string; dot: string; badge: string; border: string; bg: string }> = {
  critique: {
    label: 'Critique',
    dot:   'bg-red-500',
    badge: 'bg-red-100 text-red-700 border-red-200',
    border:'border-red-200',
    bg:    'bg-red-50',
  },
  warning: {
    label: 'Attention',
    dot:   'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    border:'border-amber-200',
    bg:    'bg-amber-50',
  },
  info: {
    label: 'Info',
    dot:   'bg-blue-400',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    border:'border-slate-200',
    bg:    'bg-slate-50',
  },
}

const CAT_CONFIG: Record<CategorieAlerte, { label: string; icon: React.ReactNode }> = {
  transport:   { label: 'Transport',   icon: <TruckIcon /> },
  facturation: { label: 'Facturation', icon: <InvoiceIcon /> },
}

const TYPE_ICONS: Partial<Record<TypeAlerte, React.ReactNode>> = {
  retard_livraison:         <ClockAlertIcon />,
  retard_ops_majeur:        <ClockAlertIcon />,
  retard_ops_mineur:        <ClockIcon />,
  ot_sans_ressource:        <UserXIcon />,
  ot_bloque:                <LockIcon />,
  facture_en_retard:        <EuroAlertIcon />,
  ot_non_facture:           <EuroIcon />,
  facture_brouillon_vieille:<FileIcon />,
}

// ─── Icônes SVG inline ──────────────────────────────────────────────────────────

function TruckIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 7h11v9H3z" /><path d="M14 10h3l3 3v3h-6z" /><circle cx="7.5" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" /></svg>
}
function InvoiceIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M7 3h10v18l-3-2-2 2-2-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>
}
function ClockAlertIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /><circle cx="12" cy="19" r=".5" fill="currentColor" /></svg>
}
function ClockIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
}
function UserXIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="m17 10 4 4M21 10l-4 4" /></svg>
}
function LockIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
}
function EuroAlertIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M14.5 9a3.5 3.5 0 1 0 0 6H10M9 11h6M9 13h6" /><path d="M12 3v1M12 20v1" /></svg>
}
function EuroIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M14.5 9a3.5 3.5 0 1 0 0 6H10M9 11h6M9 13h6" /></svg>
}
function FileIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 12h6M9 16h4" /></svg>
}
function RefreshIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 12A9 9 0 1 1 5.6 5.6" /><path d="M3 3v6h6" /></svg>
}
function BellIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
}
function ExternalLinkIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="m10 14 11-11" /></svg>
}

// ─── Helpers formatage ──────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmtMontant(m: number | null | undefined): string {
  if (m == null) return '—'
  return m.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

// ─── Carte alerte ───────────────────────────────────────────────────────────────

function AlerteCard({ alerte }: { alerte: AlerteItem }) {
  const sev  = SEV_CONFIG[alerte.severite]
  const icon = TYPE_ICONS[alerte.type] ?? <BellIcon />

  return (
    <div className={`flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md ${sev.border}`}>
      {/* Indicateur sévérité */}
      <span className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${sev.dot}`} aria-hidden="true" />

      {/* Corps */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-800">{alerte.titre}</span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sev.badge}`}>
            {icon}
            {LABELS_TYPE[alerte.type]}
          </span>
          {alerte.jours_retard != null && alerte.jours_retard > 0 && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
              J+{alerte.jours_retard}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500">{alerte.description}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
          {alerte.client_nom     && <span>Client : <strong className="text-slate-600">{alerte.client_nom}</strong></span>}
          {alerte.conducteur_nom && <span>· Conducteur : <strong className="text-slate-600">{alerte.conducteur_nom}</strong></span>}
          {alerte.vehicule_immat && <span>· Véhicule : <strong className="text-slate-600">{alerte.vehicule_immat}</strong></span>}
          {alerte.date_echeance  && <span>· Échéance : <strong className="text-slate-600">{fmtDate(alerte.date_echeance)}</strong></span>}
          {alerte.date_livraison_prevue && <span>· Livraison prévue : <strong className="text-slate-600">{fmtDate(alerte.date_livraison_prevue)}</strong></span>}
          {alerte.montant != null && <span>· Montant : <strong className="text-slate-600">{fmtMontant(alerte.montant)}</strong></span>}
        </div>
      </div>

      {/* Action rapide */}
      <Link
        to={alerte.entity_url}
        className="ml-auto flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-800 transition-colors"
        title="Ouvrir"
      >
        Voir
        <ExternalLinkIcon />
      </Link>
    </div>
  )
}

// ─── Compteur KPI ───────────────────────────────────────────────────────────────

function KpiPill({
  count, label, color, active, onClick,
}: {
  count: number
  label: string
  color: 'red' | 'amber' | 'blue' | 'slate'
  active: boolean
  onClick: () => void
}) {
  const colorsActive: Record<string, string> = {
    red:   'bg-red-600 text-white border-red-600',
    amber: 'bg-amber-500 text-white border-amber-500',
    blue:  'bg-blue-600 text-white border-blue-600',
    slate: 'bg-slate-700 text-white border-slate-700',
  }
  const colorsIdle: Record<string, string> = {
    red:   'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue:  'bg-blue-50 text-blue-700 border-blue-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${active ? colorsActive[color] : colorsIdle[color]} hover:opacity-90`}
    >
      <span className="text-sm font-bold">{count}</span>
      {label}
    </button>
  )
}

// ─── Page principale ────────────────────────────────────────────────────────────

export default function Alertes() {
  usePageMeta({
    title: 'Alertes',
    description: 'Tableau des alertes proactives transport et facturation.',
    canonical: '/alertes',
  })

  const { alertes, totalCritiques, totalWarnings, totalInfos, total, loading, error, refresh } =
    useAlertesTransport()

  // Filtres
  const [filterSev,  setFilterSev]  = useState<SeveriteAlerte | 'toutes'>('toutes')
  const [filterCat,  setFilterCat]  = useState<CategorieAlerte | 'toutes'>('toutes')

  const filtered = alertes.filter(a => {
    if (filterSev !== 'toutes' && a.severite  !== filterSev)  return false
    if (filterCat !== 'toutes' && a.categorie !== filterCat) return false
    return true
  })

  const nbTransport   = alertes.filter(a => a.categorie === 'transport').length
  const nbFacturation = alertes.filter(a => a.categorie === 'facturation').length

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      {/* ── En-tête ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <BellIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Alertes proactives</h1>
            <p className="text-xs text-slate-500">Transport · Facturation · Anomalies</p>
          </div>
          {total > 0 && (
            <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
              {total}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <span className={loading ? 'animate-spin' : ''}><RefreshIcon /></span>
          {loading ? 'Actualisation…' : 'Actualiser'}
        </button>
      </div>

      {/* ── Pills sévérité ── */}
      <div className="flex flex-wrap gap-2">
        <KpiPill
          count={total} label="Toutes" color="slate"
          active={filterSev === 'toutes' && filterCat === 'toutes'}
          onClick={() => { setFilterSev('toutes'); setFilterCat('toutes') }}
        />
        <KpiPill
          count={totalCritiques} label="Critiques" color="red"
          active={filterSev === 'critique'}
          onClick={() => { setFilterSev('critique'); setFilterCat('toutes') }}
        />
        <KpiPill
          count={totalWarnings} label="Attention" color="amber"
          active={filterSev === 'warning'}
          onClick={() => { setFilterSev('warning'); setFilterCat('toutes') }}
        />
        <KpiPill
          count={totalInfos} label="Info" color="blue"
          active={filterSev === 'info'}
          onClick={() => { setFilterSev('info'); setFilterCat('toutes') }}
        />
      </div>

      {/* ── Onglets catégorie ── */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {(
          [
            { key: 'toutes', label: 'Toutes les alertes', count: total },
            { key: 'transport', label: 'Transport', count: nbTransport },
            { key: 'facturation', label: 'Facturation', count: nbFacturation },
          ] as const
        ).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterCat(tab.key)}
            className={[
              'flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
              filterCat === tab.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filterCat === tab.key ? 'bg-slate-100 text-slate-700' : 'bg-slate-200 text-slate-600'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Contenu ── */}
      {loading && alertes.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Erreur : {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div>
            <p className="font-semibold text-slate-700">Aucune alerte active</p>
            <p className="mt-0.5 text-sm text-slate-400">
              {filterSev === 'toutes' && filterCat === 'toutes'
                ? 'Tout est nominal — aucune anomalie détectée'
                : 'Aucune alerte pour ce filtre'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Sous-sections par catégorie si filtre "toutes" */}
          {filterCat === 'toutes' ? (
            <>
              {(['transport', 'facturation'] as CategorieAlerte[]).map(cat => {
                const items = filtered.filter(a => a.categorie === cat)
                if (items.length === 0) return null
                const cfg = CAT_CONFIG[cat]
                return (
                  <div key={cat} className="space-y-2">
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-slate-400">{cfg.icon}</span>
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {cfg.label}
                        <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{items.length}</span>
                      </h2>
                      <div className="flex-1 border-t border-slate-100" />
                    </div>
                    {items.map(a => <AlerteCard key={a.id} alerte={a} />)}
                  </div>
                )
              })}
            </>
          ) : (
            filtered.map(a => <AlerteCard key={a.id} alerte={a} />)
          )}
        </div>
      )}

      {/* ── Dernière mise à jour ── */}
      {!loading && total > 0 && (
        <p className="text-center text-[11px] text-slate-400">
          Actualisé à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · Prochain rafraîchissement dans 5 min
        </p>
      )}
    </div>
  )
}
