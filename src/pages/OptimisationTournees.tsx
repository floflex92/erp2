import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'

// ── Types ─────────────────────────────────────────────────────────────────────

type Stop = {
  id: string
  nom: string
  adresse: string
  ville: string
  type: 'chargement' | 'livraison' | 'passage'
  fenetre_debut?: string | null
  fenetre_fin?: string | null
  duree_service_min: number
  poids_kg?: number | null
  latitude?: number | null
  longitude?: number | null
  priorite: 'haute' | 'normale' | 'basse'
}

type Tournee = {
  id: string
  reference: string
  conducteur_id?: string | null
  vehicule_id?: string | null
  statut: 'brouillon' | 'optimisee' | 'validee' | 'en_cours' | 'terminee'
  date_tournee: string
  stops: Stop[]
  distance_totale_km?: number
  duree_estimee_min?: number
  score_optimisation?: number
  conducteur_nom?: string
  vehicule_immat?: string
}

type Contrainte = {
  id: string
  label: string
  active: boolean
  description: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUT_LABELS: Record<Tournee['statut'], string> = {
  brouillon: 'Brouillon',
  optimisee: 'Optimisée',
  validee: 'Validée',
  en_cours: 'En cours',
  terminee: 'Terminée',
}

const STATUT_COLORS: Record<Tournee['statut'], string> = {
  brouillon: 'bg-surface-2 text-secondary border-line',
  optimisee: 'bg-blue-100 text-blue-700 border-blue-200',
  validee: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  en_cours: 'bg-amber-100 text-amber-700 border-amber-200',
  terminee: 'bg-slate-100 text-slate-600 border-slate-200',
}

const PRIORITE_COLORS: Record<Stop['priorite'], string> = {
  haute: 'text-red-600',
  normale: 'text-foreground',
  basse: 'text-muted',
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDuree(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

// ── Données démo ──────────────────────────────────────────────────────────────

const DEMO_CONTRAINTES: Contrainte[] = [
  { id: 'horaires', label: 'Fenêtres horaires', active: true, description: 'Respecter les créneaux de livraison imposés par les clients' },
  { id: 'capacite', label: 'Capacité véhicule', active: true, description: 'Ne pas dépasser le tonnage et volume du véhicule affecté' },
  { id: 'priorite', label: 'Priorité clients', active: true, description: 'Traiter en premier les arrêts marqués haute priorité' },
  { id: 'zones', label: 'Regroupement zones', active: true, description: 'Regrouper les arrêts géographiquement proches pour réduire les distances' },
  { id: 'duree_service', label: 'Durées de service', active: false, description: 'Intégrer les temps de déchargement et manutention sur site' },
  { id: 'pauses', label: 'Pauses obligatoires', active: false, description: 'Respecter les temps de pause réglementaires du conducteur' },
  { id: 'froid', label: 'Chaîne du froid', active: false, description: 'Prioriser les livraisons température dirigée pour limiter l\'exposition' },
]

const DEMO_TOURNEES: Tournee[] = [
  {
    id: 't1',
    reference: 'TOURN-2026-001',
    statut: 'optimisee',
    date_tournee: '2026-05-05',
    conducteur_nom: 'Martin Dupont',
    vehicule_immat: 'AB-234-CD',
    distance_totale_km: 187,
    duree_estimee_min: 390,
    score_optimisation: 92,
    stops: [
      { id: 's1', nom: 'Dépôt central', adresse: '15 Rue de la Logistique', ville: 'Lyon', type: 'chargement', duree_service_min: 30, priorite: 'haute' },
      { id: 's2', nom: 'Martins & Co', adresse: '28 Avenue des Fleurs', ville: 'Villeurbanne', type: 'livraison', fenetre_debut: '08:00', fenetre_fin: '10:00', duree_service_min: 15, poids_kg: 450, priorite: 'haute' },
      { id: 's3', nom: 'Hypermarché Est', adresse: '3 Rue du Commerce', ville: 'Bron', type: 'livraison', fenetre_debut: '09:30', fenetre_fin: '12:00', duree_service_min: 45, poids_kg: 1200, priorite: 'normale' },
      { id: 's4', nom: 'Resto Le Gourmet', adresse: '12 Place Bellecour', ville: 'Lyon', type: 'livraison', fenetre_debut: '10:00', fenetre_fin: '11:30', duree_service_min: 20, poids_kg: 180, priorite: 'haute' },
      { id: 's5', nom: 'SAS Pharmabox', adresse: '7 Rue Lourmel', ville: 'Saint-Priest', type: 'livraison', duree_service_min: 25, poids_kg: 340, priorite: 'normale' },
      { id: 's6', nom: 'BTP Renault', adresse: '40 ZI Sud', ville: 'Vénissieux', type: 'livraison', duree_service_min: 30, poids_kg: 870, priorite: 'basse' },
    ],
  },
  {
    id: 't2',
    reference: 'TOURN-2026-002',
    statut: 'brouillon',
    date_tournee: '2026-05-05',
    conducteur_nom: 'Sophie Lefevre',
    vehicule_immat: 'EF-567-GH',
    distance_totale_km: 143,
    duree_estimee_min: 310,
    score_optimisation: undefined,
    stops: [
      { id: 's7', nom: 'Dépôt central', adresse: '15 Rue de la Logistique', ville: 'Lyon', type: 'chargement', duree_service_min: 30, priorite: 'haute' },
      { id: 's8', nom: 'Carrefour Nord', adresse: '1 Bd Périphérique', ville: 'Décines', type: 'livraison', fenetre_debut: '07:30', fenetre_fin: '09:00', duree_service_min: 40, poids_kg: 2100, priorite: 'normale' },
      { id: 's9', nom: 'Leclerc Chassieu', adresse: 'Route de Genas', ville: 'Chassieu', type: 'livraison', duree_service_min: 35, poids_kg: 1600, priorite: 'normale' },
      { id: 's10', nom: 'Entrepôt Girard', adresse: '23 Impasse Berthelot', ville: 'Meyzieu', type: 'livraison', duree_service_min: 20, poids_kg: 400, priorite: 'basse' },
    ],
  },
  {
    id: 't3',
    reference: 'TOURN-2026-003',
    statut: 'en_cours',
    date_tournee: '2026-05-03',
    conducteur_nom: 'Paul Renard',
    vehicule_immat: 'IJ-890-KL',
    distance_totale_km: 221,
    duree_estimee_min: 450,
    score_optimisation: 85,
    stops: [
      { id: 's11', nom: 'Dépôt central', adresse: '15 Rue de la Logistique', ville: 'Lyon', type: 'chargement', duree_service_min: 30, priorite: 'haute' },
      { id: 's12', nom: 'Auchan Limonest', adresse: 'ZAC Limonest', ville: 'Limonest', type: 'livraison', duree_service_min: 45, poids_kg: 1800, priorite: 'normale' },
      { id: 's13', nom: 'Métro Cash', adresse: '5 Rue des Boulangers', ville: 'Dardilly', type: 'livraison', duree_service_min: 60, poids_kg: 3200, priorite: 'haute' },
    ],
  },
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

function ScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? '#22c55e' : score >= 75 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-line">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{score}%</span>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function OptimisationTournees() {
  const { role } = useAuth()
  const canEdit = role === 'admin' || role === 'dirigeant' || role === 'exploitant' || role === 'logisticien'

  const [tab, setTab] = useState<'tournees' | 'contraintes' | 'analyse'>('tournees')
  const [tournees] = useState<Tournee[]>(DEMO_TOURNEES)
  const [contraintes, setContraintes] = useState<Contrainte[]>(DEMO_CONTRAINTES)
  const [selected, setSelected] = useState<Tournee | null>(null)
  const [filterDate, setFilterDate] = useState('2026-05-05')
  const [optimizing, setOptimizing] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const filtered = useMemo(() =>
    tournees.filter(t => !filterDate || t.date_tournee === filterDate),
    [tournees, filterDate],
  )

  const stats = useMemo(() => {
    const optimisees = tournees.filter(t => t.statut === 'optimisee' || t.statut === 'validee')
    const distTotale = tournees.reduce((acc, t) => acc + (t.distance_totale_km ?? 0), 0)
    const avgScore = optimisees.length > 0
      ? Math.round(optimisees.reduce((acc, t) => acc + (t.score_optimisation ?? 0), 0) / optimisees.length)
      : 0
    return { total: tournees.length, optimisees: optimisees.length, distTotale, avgScore }
  }, [tournees])

  async function handleOptimize(id: string) {
    setOptimizing(id)
    await new Promise(r => setTimeout(r, 1800))
    setOptimizing(null)
    setNotice('Tournée optimisée — séquence recalculée avec gain estimé de 18 km.')
    setTimeout(() => setNotice(null), 4000)
  }

  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Optimisation des tournées</h1>
          <p className="mt-1 text-sm text-secondary">Algorithme multi-stops — séquençage optimal en tenant compte des contraintes métier</p>
        </div>
        {canEdit && (
          <button
            type="button"
            className="rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            + Nouvelle tournée
          </button>
        )}
      </div>

      {/* Notice */}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {notice}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Tournées planifiées" value={String(stats.total)} sub="du jour" />
        <KpiCard label="Optimisées / Validées" value={String(stats.optimisees)} sub={`sur ${stats.total} tournées`} accent="#2563EB" />
        <KpiCard label="Distance cumulée" value={`${stats.distTotale} km`} sub="pour toutes les tournées" />
        <KpiCard label="Score moyen" value={stats.avgScore ? `${stats.avgScore}%` : '—'} sub="d'optimisation" accent="#22c55e" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1 w-fit">
        {(['tournees', 'contraintes', 'analyse'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === t ? 'bg-surface text-heading shadow-sm' : 'text-secondary hover:text-heading'}`}
          >
            {t === 'tournees' ? 'Tournées' : t === 'contraintes' ? 'Contraintes' : 'Analyse'}
          </button>
        ))}
      </div>

      {/* Filtre date */}
      {tab === 'tournees' && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-secondary">Date :</label>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm text-heading outline-none focus:border-[color:var(--primary)]"
          />
          <span className="text-xs text-muted">{filtered.length} tournée{filtered.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Contenu onglet Tournées */}
      {tab === 'tournees' && (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Liste tournées */}
          <div className="flex flex-col gap-3 lg:col-span-2">
            {filtered.length === 0 && (
              <div className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-muted">
                Aucune tournée pour cette date.
              </div>
            )}
            {filtered.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t)}
                className={`rounded-2xl border p-4 text-left transition ${selected?.id === t.id ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)]' : 'border-line bg-surface hover:border-line-strong'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-heading text-sm">{t.reference}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUT_COLORS[t.statut]}`}>
                    {STATUT_LABELS[t.statut]}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-secondary">
                  <div className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
                    {t.conducteur_nom ?? '—'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7h11v9H3z" /><path d="M14 10h3l3 3v3h-6z" /><circle cx="7.5" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" /></svg>
                    {t.vehicule_immat ?? '—'}
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <span>{t.stops.length} arrêts</span>
                    <span>{t.distance_totale_km} km</span>
                    <span>{fmtDuree(t.duree_estimee_min ?? 0)}</span>
                  </div>
                </div>
                {t.score_optimisation !== undefined && (
                  <div className="mt-2">
                    <ScoreBar score={t.score_optimisation} />
                  </div>
                )}
                {canEdit && t.statut === 'brouillon' && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); void handleOptimize(t.id) }}
                    disabled={optimizing === t.id}
                    className="mt-3 w-full rounded-lg bg-[color:var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {optimizing === t.id ? 'Calcul en cours…' : '⚡ Optimiser cette tournée'}
                  </button>
                )}
              </button>
            ))}
          </div>

          {/* Détail tournée */}
          <div className="lg:col-span-3">
            {!selected ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-line bg-surface-2 p-12 text-center">
                <div>
                  <svg className="mx-auto mb-3 h-10 w-10 text-discreet" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 19c0-2.2 1.8-4 4-4h4a4 4 0 1 0-4-4H8a4 4 0 1 1 0-8h10" />
                    <circle cx="18" cy="3" r="1.4" />
                    <circle cx="6" cy="21" r="1.4" />
                  </svg>
                  <p className="text-sm font-medium text-muted">Sélectionnez une tournée pour voir le détail</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-surface">
                <div className="border-b border-line px-5 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-heading">{selected.reference}</h3>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUT_COLORS[selected.statut]}`}>
                      {STATUT_LABELS[selected.statut]}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-secondary">
                    <span>Date : {fmt(selected.date_tournee)}</span>
                    <span>{selected.distance_totale_km} km</span>
                    <span>{fmtDuree(selected.duree_estimee_min ?? 0)}</span>
                    {selected.score_optimisation !== undefined && <span className="font-semibold text-emerald-600">Score {selected.score_optimisation}%</span>}
                  </div>
                </div>

                {/* Sequence des arrêts */}
                <div className="p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-discreet">Séquence optimisée</p>
                  <div className="space-y-2">
                    {selected.stops.map((stop, idx) => (
                      <div key={stop.id} className="flex items-start gap-3">
                        {/* Numéro */}
                        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${stop.type === 'chargement' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {idx + 1}
                        </div>
                        {/* Contenu */}
                        <div className="flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-semibold ${PRIORITE_COLORS[stop.priorite]}`}>{stop.nom}</span>
                            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">{stop.type}</span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-secondary">
                            <span>{stop.ville}</span>
                            {stop.poids_kg && <span>{stop.poids_kg} kg</span>}
                            {stop.fenetre_debut && <span className="font-medium text-amber-600">{stop.fenetre_debut}–{stop.fenetre_fin}</span>}
                            <span>{stop.duree_service_min} min service</span>
                          </div>
                        </div>
                        {/* Connecteur */}
                        {idx < selected.stops.length - 1 && (
                          <div className="absolute ml-2.5 mt-7 h-4 w-px bg-line" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet Contraintes */}
      {tab === 'contraintes' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contraintes.map(c => (
            <div key={c.id} className={`rounded-2xl border p-4 transition ${c.active ? 'border-blue-200 bg-blue-50' : 'border-line bg-surface'}`}>
              <div className="flex items-center justify-between">
                <span className={`font-semibold text-sm ${c.active ? 'text-blue-800' : 'text-secondary'}`}>{c.label}</span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setContraintes(prev => prev.map(p => p.id === c.id ? { ...p, active: !p.active } : p))}
                    className={`relative h-5 w-9 rounded-full transition-colors ${c.active ? 'bg-blue-600' : 'bg-line-strong'}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${c.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted">{c.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Onglet Analyse */}
      {tab === 'analyse' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="mb-4 font-semibold text-heading">Gains estimés par optimisation</h3>
            <div className="space-y-3">
              {[
                { label: 'Distance économisée', value: '34 km', detail: 'vs séquence manuelle initiale', color: '#22c55e' },
                { label: 'Temps gagné', value: '55 min', detail: 'sur la durée totale de tournée', color: '#2563EB' },
                { label: 'Carburant économisé', value: '~14 L', detail: 'estimation basée sur 0,4 L/km', color: '#f59e0b' },
                { label: 'Fenêtres respectées', value: '100%', detail: 'toutes les contraintes horaires OK', color: '#22c55e' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-heading">{row.label}</p>
                    <p className="text-xs text-muted">{row.detail}</p>
                  </div>
                  <span className="text-lg font-bold" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="mb-4 font-semibold text-heading">Algorithme utilisé</h3>
            <div className="space-y-3 text-sm text-secondary">
              <div className="rounded-xl bg-surface-2 px-4 py-3">
                <p className="font-semibold text-heading">Clarke-Wright (épargne)</p>
                <p className="mt-1 text-xs">Heuristique de regroupement par économies. Combine progressivement les arrêts proches pour minimiser la distance totale.</p>
              </div>
              <div className="rounded-xl bg-surface-2 px-4 py-3">
                <p className="font-semibold text-heading">Ajustement 2-opt</p>
                <p className="mt-1 text-xs">Passe de raffinement local : échange de paires d'arcs pour éliminer les croisements et améliorer le score final.</p>
              </div>
              <div className="rounded-xl bg-surface-2 px-4 py-3">
                <p className="font-semibold text-heading">Fenêtres temporelles</p>
                <p className="mt-1 text-xs">Insertion des contraintes horaires en post-traitement avec pénalité sur les séquences qui violent les créneaux clients.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
