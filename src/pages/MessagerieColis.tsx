import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'

// ── Types ─────────────────────────────────────────────────────────────────────

type ColisStatut = 'en_attente' | 'pris_en_charge' | 'en_transit' | 'en_livraison' | 'livre' | 'echec' | 'retour'

type Colis = {
  id: string
  code_barre: string
  destinataire: string
  adresse_livraison: string
  ville: string
  code_postal: string
  poids_kg: number
  type: 'colis' | 'palette' | 'envelope' | 'frigo'
  tournee_id?: string
  conducteur_nom?: string
  statut: ColisStatut
  date_prise_en_charge?: string
  date_livraison_prevue: string
  date_livraison_reelle?: string
  tentatives: number
  hub_origine?: string
  hub_destination?: string
  remarques?: string
  temperature_max_c?: number | null
}

type Hub = {
  id: string
  nom: string
  ville: string
  region: string
  capacite_journaliere: number
  charge_actuelle: number
  type: 'central' | 'regional' | 'local'
}

type TabView = 'colis' | 'hubs' | 'stats'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUT_LABELS: Record<ColisStatut, string> = {
  en_attente: 'En attente',
  pris_en_charge: 'Pris en charge',
  en_transit: 'En transit',
  en_livraison: 'En livraison',
  livre: 'Livré',
  echec: 'Échec livraison',
  retour: 'Retour entrepôt',
}

const STATUT_COLORS: Record<ColisStatut, string> = {
  en_attente: 'bg-surface-2 text-secondary border-line',
  pris_en_charge: 'bg-blue-100 text-blue-700 border-blue-200',
  en_transit: 'bg-violet-100 text-violet-700 border-violet-200',
  en_livraison: 'bg-amber-100 text-amber-700 border-amber-200',
  livre: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  echec: 'bg-red-100 text-red-700 border-red-200',
  retour: 'bg-orange-100 text-orange-700 border-orange-200',
}

const TYPE_LABELS: Record<Colis['type'], string> = {
  colis: 'Colis',
  palette: 'Palette',
  envelope: 'Enveloppe',
  frigo: 'Froid',
}

const TYPE_ICONS: Record<Colis['type'], React.ReactNode> = {
  colis: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  palette: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="16" width="20" height="4" rx="1" /><rect x="4" y="8" width="7" height="8" rx="1" /><rect x="13" y="8" width="7" height="8" rx="1" /><rect x="4" y="4" width="7" height="4" rx="1" /></svg>,
  envelope: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16v16H4z" /><polyline points="22 6 12 13 2 6" /></svg>,
  frigo: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v20M2 7h20M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" /></svg>,
}

// ── Données démo ──────────────────────────────────────────────────────────────

const DEMO_COLIS: Colis[] = [
  { id: 'c1', code_barre: 'NXT-2026-00291', destinataire: 'Martin Dupont', adresse_livraison: '14 Rue des Lilas', ville: 'Lyon', code_postal: '69003', poids_kg: 2.4, type: 'colis', statut: 'en_livraison', date_livraison_prevue: '2026-05-05', conducteur_nom: 'Sophie Lefevre', tentatives: 1, hub_origine: 'Hub Lyon Centre', hub_destination: 'Hub Lyon Est' },
  { id: 'c2', code_barre: 'NXT-2026-00292', destinataire: 'SAS Leclerc Décines', adresse_livraison: '1 Bd de la Plaine', ville: 'Décines', code_postal: '69150', poids_kg: 145, type: 'palette', statut: 'en_transit', date_livraison_prevue: '2026-05-05', conducteur_nom: 'Paul Renard', tentatives: 0, hub_origine: 'Hub Lyon Centre', hub_destination: 'Hub Décines' },
  { id: 'c3', code_barre: 'NXT-2026-00293', destinataire: 'Mme Lejeune Anne', adresse_livraison: '3 Impasse du Moulin', ville: 'Bron', code_postal: '69500', poids_kg: 0.8, type: 'envelope', statut: 'livre', date_livraison_prevue: '2026-05-04', date_livraison_reelle: '2026-05-04', tentatives: 1, hub_origine: 'Hub Lyon Centre', hub_destination: 'Hub Bron' },
  { id: 'c4', code_barre: 'NXT-2026-00294', destinataire: 'Restaurant Le Gourmet', adresse_livraison: '22 Quai du Rhône', ville: 'Lyon', code_postal: '69002', poids_kg: 18, type: 'frigo', statut: 'en_livraison', date_livraison_prevue: '2026-05-05', conducteur_nom: 'Martin Blanc', tentatives: 1, temperature_max_c: 4, hub_origine: 'Hub Frigo Lyon', hub_destination: 'Livraison directe' },
  { id: 'c5', code_barre: 'NXT-2026-00295', destinataire: 'M. Fernandez J.', adresse_livraison: '8 Rue Carnot', ville: 'Villeurbanne', code_postal: '69100', poids_kg: 3.2, type: 'colis', statut: 'echec', date_livraison_prevue: '2026-05-04', tentatives: 2, remarques: 'Absent — 2e tentative échouée. Préavis laissé.', hub_origine: 'Hub Lyon Centre', hub_destination: 'Hub Villeurbanne' },
  { id: 'c6', code_barre: 'NXT-2026-00296', destinataire: 'Pharmacie Centrale', adresse_livraison: '5 Place de la République', ville: 'Lyon', code_postal: '69001', poids_kg: 5.6, type: 'frigo', statut: 'pris_en_charge', date_livraison_prevue: '2026-05-05', conducteur_nom: 'Sophie Lefevre', tentatives: 0, temperature_max_c: 8, hub_origine: 'Hub Frigo Lyon', hub_destination: 'Livraison directe' },
  { id: 'c7', code_barre: 'NXT-2026-00297', destinataire: 'Entrepôt Girard & Fils', adresse_livraison: '40 ZI Nord', ville: 'Meyzieu', code_postal: '69330', poids_kg: 560, type: 'palette', statut: 'en_attente', date_livraison_prevue: '2026-05-06', tentatives: 0, hub_origine: 'Hub Lyon Centre', hub_destination: 'Hub Est' },
  { id: 'c8', code_barre: 'NXT-2026-00298', destinataire: 'M. Bernard Lucas', adresse_livraison: '16 Av. des Sports', ville: 'Saint-Priest', code_postal: '69800', poids_kg: 1.1, type: 'colis', statut: 'retour', date_livraison_prevue: '2026-05-03', tentatives: 3, remarques: 'Retour après 3 tentatives infructueuses.', hub_origine: 'Hub Lyon Centre', hub_destination: 'Hub Lyon Centre' },
]

const DEMO_HUBS: Hub[] = [
  { id: 'h1', nom: 'Hub Lyon Centre', ville: 'Lyon', region: 'Auvergne-Rhône-Alpes', capacite_journaliere: 1200, charge_actuelle: 847, type: 'central' },
  { id: 'h2', nom: 'Hub Frigo Lyon', ville: 'Lyon', region: 'Auvergne-Rhône-Alpes', capacite_journaliere: 300, charge_actuelle: 89, type: 'regional' },
  { id: 'h3', nom: 'Hub Lyon Est', ville: 'Bron', region: 'Auvergne-Rhône-Alpes', capacite_journaliere: 500, charge_actuelle: 312, type: 'local' },
  { id: 'h4', nom: 'Hub Villeurbanne', ville: 'Villeurbanne', region: 'Auvergne-Rhône-Alpes', capacite_journaliere: 400, charge_actuelle: 168, type: 'local' },
  { id: 'h5', nom: 'Hub Décines', ville: 'Décines', region: 'Auvergne-Rhône-Alpes', capacite_journaliere: 350, charge_actuelle: 201, type: 'local' },
  { id: 'h6', nom: 'Hub Est', ville: 'Meyzieu', region: 'Auvergne-Rhône-Alpes', capacite_journaliere: 280, charge_actuelle: 47, type: 'local' },
]

// ── Composants ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-discreet">{label}</p>
      <p className="mt-2 text-2xl font-bold text-heading" style={accent ? { color: accent } : undefined}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  )
}

function ChargeBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-line">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{pct}%</span>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function MessagerieColis() {
  const { role } = useAuth()
  const canEdit = role === 'admin' || role === 'dirigeant' || role === 'exploitant' || role === 'logisticien'

  const [tab, setTab] = useState<TabView>('colis')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatut, setFilterStatut] = useState<ColisStatut | 'all'>('all')
  const [filterType, setFilterType] = useState<Colis['type'] | 'all'>('all')
  const [selected, setSelected] = useState<Colis | null>(null)

  const filtered = useMemo(() => {
    return DEMO_COLIS.filter(c => {
      const matchSearch = !searchQuery || c.code_barre.toLowerCase().includes(searchQuery.toLowerCase()) || c.destinataire.toLowerCase().includes(searchQuery.toLowerCase()) || c.ville.toLowerCase().includes(searchQuery.toLowerCase())
      const matchStatut = filterStatut === 'all' || c.statut === filterStatut
      const matchType = filterType === 'all' || c.type === filterType
      return matchSearch && matchStatut && matchType
    })
  }, [searchQuery, filterStatut, filterType])

  const stats = useMemo(() => {
    const livres = DEMO_COLIS.filter(c => c.statut === 'livre').length
    const enCours = DEMO_COLIS.filter(c => c.statut === 'en_livraison' || c.statut === 'en_transit').length
    const echecs = DEMO_COLIS.filter(c => c.statut === 'echec' || c.statut === 'retour').length
    const tauxReussite = Math.round((livres / DEMO_COLIS.length) * 100)
    return { livres, enCours, echecs, tauxReussite }
  }, [])

  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Messagerie & Colis</h1>
          <p className="mt-1 text-sm text-secondary">Gestion colis, palettes, e-commerce, distribution — chaîne du froid et hub & spoke</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button type="button" className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium text-secondary transition hover:border-line-strong hover:text-heading">
              Importer des colis
            </button>
            <button type="button" className="rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
              + Nouveau colis
            </button>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Colis totaux" value={String(DEMO_COLIS.length)} sub="sur la période" />
        <KpiCard label="En cours" value={String(stats.enCours)} sub="transit + livraison" accent="#2563EB" />
        <KpiCard label="Livrés" value={String(stats.livres)} sub="du jour" accent="#22c55e" />
        <KpiCard label="Taux de réussite" value={`${stats.tauxReussite}%`} sub={`${stats.echecs} échec${stats.echecs > 1 ? 's' : ''}`} accent={stats.tauxReussite >= 90 ? '#22c55e' : '#f59e0b'} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1 w-fit">
        {(['colis', 'hubs', 'stats'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === t ? 'bg-surface text-heading shadow-sm' : 'text-secondary hover:text-heading'}`}
          >
            {t === 'colis' ? 'Colis & palettes' : t === 'hubs' ? 'Hubs & dépôts' : 'Statistiques'}
          </button>
        ))}
      </div>

      {/* Onglet Colis */}
      {tab === 'colis' && (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Filtres + Liste */}
          <div className="lg:col-span-3 space-y-3">
            {/* Filtres */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Code-barres, destinataire, ville…"
                  className="w-full rounded-xl border border-line-strong bg-surface py-2 pl-9 pr-3 text-sm text-heading outline-none focus:border-[color:var(--primary)]"
                />
              </div>
              <select
                value={filterStatut}
                onChange={e => setFilterStatut(e.target.value as ColisStatut | 'all')}
                className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-heading outline-none focus:border-[color:var(--primary)]"
              >
                <option value="all">Tous statuts</option>
                {(Object.entries(STATUT_LABELS) as [ColisStatut, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as Colis['type'] | 'all')}
                className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-heading outline-none focus:border-[color:var(--primary)]"
              >
                <option value="all">Tous types</option>
                {(Object.entries(TYPE_LABELS) as [Colis['type'], string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 border-b border-line bg-surface-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-discreet">
                <span>Type</span>
                <span>Destinataire</span>
                <span>Statut</span>
                <span>Kg</span>
              </div>
              {filtered.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted">Aucun colis correspondant.</p>
              )}
              {filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c)}
                  className={`grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 border-b border-line px-4 py-3 text-left last:border-0 transition ${selected?.id === c.id ? 'bg-[color:var(--primary-soft)]' : 'hover:bg-surface-2'}`}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${c.type === 'frigo' ? 'bg-cyan-100 text-cyan-700' : c.type === 'palette' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {TYPE_ICONS[c.type]}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-heading">{c.destinataire}</p>
                    <p className="truncate text-xs text-muted">{c.ville} · {c.code_barre}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUT_COLORS[c.statut]}`}>
                    {STATUT_LABELS[c.statut]}
                  </span>
                  <span className="text-xs text-secondary">{c.poids_kg} kg</span>
                </button>
              ))}
            </div>
          </div>

          {/* Détail colis */}
          <div className="lg:col-span-2">
            {!selected ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-line bg-surface-2 text-center">
                <p className="text-sm text-muted">Sélectionnez un colis pour le détail</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-surface">
                <div className="border-b border-line px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-heading text-sm">{selected.code_barre}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUT_COLORS[selected.statut]}`}>
                      {STATUT_LABELS[selected.statut]}
                    </span>
                  </div>
                </div>
                <div className="p-5 space-y-3 text-sm">
                  <Row label="Destinataire" value={selected.destinataire} />
                  <Row label="Adresse" value={`${selected.adresse_livraison}, ${selected.code_postal} ${selected.ville}`} />
                  <Row label="Type" value={`${TYPE_LABELS[selected.type]} · ${selected.poids_kg} kg`} />
                  <Row label="Livraison prévue" value={fmt(selected.date_livraison_prevue)} />
                  {selected.date_livraison_reelle && <Row label="Livré le" value={fmt(selected.date_livraison_reelle)} accent="#22c55e" />}
                  {selected.conducteur_nom && <Row label="Conducteur" value={selected.conducteur_nom} />}
                  <Row label="Hub origine" value={selected.hub_origine ?? '—'} />
                  <Row label="Hub destination" value={selected.hub_destination ?? '—'} />
                  <Row label="Tentatives" value={String(selected.tentatives)} accent={selected.tentatives >= 2 ? '#ef4444' : undefined} />
                  {selected.temperature_max_c !== null && selected.temperature_max_c !== undefined && (
                    <Row label="Temp. max." value={`≤ ${selected.temperature_max_c}°C`} accent="#0ea5e9" />
                  )}
                  {selected.remarques && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                      <p className="text-xs font-medium text-amber-800">{selected.remarques}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet Hubs */}
      {tab === 'hubs' && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {DEMO_HUBS.map(hub => (
            <div key={hub.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-heading">{hub.nom}</p>
                  <p className="text-xs text-secondary">{hub.ville} · {hub.region}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${hub.type === 'central' ? 'bg-violet-100 text-violet-700 border-violet-200' : hub.type === 'regional' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {hub.type}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary">Charge journalière</span>
                  <span className="font-semibold text-heading">{hub.charge_actuelle} / {hub.capacite_journaliere}</span>
                </div>
                <ChargeBar value={hub.charge_actuelle} max={hub.capacite_journaliere} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Onglet Stats */}
      {tab === 'stats' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="mb-4 font-semibold text-heading">Répartition par statut</h3>
            <div className="space-y-2">
              {(Object.entries(STATUT_LABELS) as [ColisStatut, string][]).map(([statut, label]) => {
                const count = DEMO_COLIS.filter(c => c.statut === statut).length
                const pct = Math.round((count / DEMO_COLIS.length) * 100)
                if (count === 0) return null
                return (
                  <div key={statut} className="flex items-center gap-3">
                    <span className="w-28 text-xs text-secondary">{label}</span>
                    <div className="flex-1 h-2 rounded-full bg-line">
                      <div className="h-full rounded-full bg-[color:var(--primary)]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs font-semibold text-heading">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="mb-4 font-semibold text-heading">Répartition par type</h3>
            <div className="space-y-3">
              {(Object.entries(TYPE_LABELS) as [Colis['type'], string][]).map(([type, label]) => {
                const count = DEMO_COLIS.filter(c => c.type === type).length
                const poids = DEMO_COLIS.filter(c => c.type === type).reduce((acc, c) => acc + c.poids_kg, 0)
                return (
                  <div key={type} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">{TYPE_ICONS[type]}</span>
                      <span className="text-sm font-medium text-heading">{label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-heading">{count} unité{count > 1 ? 's' : ''}</p>
                      <p className="text-xs text-muted">{poids.toLocaleString('fr-FR')} kg</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-secondary shrink-0">{label}</span>
      <span className="text-right text-xs font-medium text-heading" style={accent ? { color: accent } : undefined}>{value}</span>
    </div>
  )
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
