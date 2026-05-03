import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'

// ── Types ─────────────────────────────────────────────────────────────────────

type ChampType = 'text' | 'number' | 'checkbox' | 'select' | 'photo' | 'signature' | 'textarea'

type Champ = {
  id: string
  label: string
  type: ChampType
  obligatoire: boolean
  options?: string[]
  valeur?: string | boolean | null
}

type Formulaire = {
  id: string
  nom: string
  categorie: 'inspection_vehicule' | 'controle_qualite' | 'checklist_depart' | 'anomalie' | 'livraison'
  actif: boolean
  champs: Champ[]
  createdAt: string
}

type Reponse = {
  id: string
  formulaire_id: string
  formulaire_nom: string
  conducteur_nom: string
  vehicule_immat?: string
  date_soumission: string
  statut: 'soumis' | 'valide' | 'anomalie' | 'en_revision'
  nb_anomalies: number
  completion_pct: number
}

type TabView = 'formulaires' | 'reponses' | 'editeur'

// ── Constantes ────────────────────────────────────────────────────────────────

const CATEGORIE_LABELS: Record<Formulaire['categorie'], string> = {
  inspection_vehicule: 'Inspection véhicule',
  controle_qualite: 'Contrôle qualité',
  checklist_depart: 'Checklist départ',
  anomalie: 'Remontée anomalie',
  livraison: 'Confirmation livraison',
}

const CATEGORIE_COLORS: Record<Formulaire['categorie'], string> = {
  inspection_vehicule: 'bg-blue-100 text-blue-700 border-blue-200',
  controle_qualite: 'bg-violet-100 text-violet-700 border-violet-200',
  checklist_depart: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  anomalie: 'bg-red-100 text-red-700 border-red-200',
  livraison: 'bg-amber-100 text-amber-700 border-amber-200',
}

const STATUT_LABELS: Record<Reponse['statut'], string> = {
  soumis: 'Soumis',
  valide: 'Validé',
  anomalie: 'Anomalie',
  en_revision: 'En révision',
}

const STATUT_COLORS: Record<Reponse['statut'], string> = {
  soumis: 'bg-surface-2 text-secondary border-line',
  valide: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  anomalie: 'bg-red-100 text-red-700 border-red-200',
  en_revision: 'bg-amber-100 text-amber-700 border-amber-200',
}

const TYPE_LABELS: Record<ChampType, string> = {
  text: 'Texte court',
  number: 'Nombre',
  checkbox: 'Case à cocher',
  select: 'Liste déroulante',
  photo: 'Photo',
  signature: 'Signature',
  textarea: 'Texte long',
}

// ── Données démo ──────────────────────────────────────────────────────────────

const DEMO_FORMULAIRES: Formulaire[] = [
  {
    id: 'f1',
    nom: 'Inspection journalière véhicule',
    categorie: 'inspection_vehicule',
    actif: true,
    createdAt: '2026-04-01',
    champs: [
      { id: 'c1', label: 'Immatriculation véhicule', type: 'text', obligatoire: true },
      { id: 'c2', label: 'Niveau carburant', type: 'select', obligatoire: true, options: ['< 25%', '25-50%', '50-75%', '> 75%'] },
      { id: 'c3', label: 'Pression pneus OK', type: 'checkbox', obligatoire: true },
      { id: 'c4', label: 'Éclairages fonctionnels', type: 'checkbox', obligatoire: true },
      { id: 'c5', label: 'Rétroviseurs intacts', type: 'checkbox', obligatoire: true },
      { id: 'c6', label: 'Kilométrage actuel', type: 'number', obligatoire: true },
      { id: 'c7', label: 'Anomalie observée', type: 'textarea', obligatoire: false },
      { id: 'c8', label: 'Photo anomalie', type: 'photo', obligatoire: false },
      { id: 'c9', label: 'Signature conducteur', type: 'signature', obligatoire: true },
    ],
  },
  {
    id: 'f2',
    nom: 'Checklist départ mission',
    categorie: 'checklist_depart',
    actif: true,
    createdAt: '2026-04-05',
    champs: [
      { id: 'd1', label: 'Référence OT', type: 'text', obligatoire: true },
      { id: 'd2', label: 'Documents CMR présents', type: 'checkbox', obligatoire: true },
      { id: 'd3', label: 'Équipements EPI embarqués', type: 'checkbox', obligatoire: true },
      { id: 'd4', label: 'Chargement conforme au bon de chargement', type: 'checkbox', obligatoire: true },
      { id: 'd5', label: 'Hayon / ridelles vérifiés', type: 'checkbox', obligatoire: true },
      { id: 'd6', label: 'Photo chargement', type: 'photo', obligatoire: false },
      { id: 'd7', label: 'Heure de départ', type: 'text', obligatoire: true },
      { id: 'd8', label: 'Remarques', type: 'textarea', obligatoire: false },
    ],
  },
  {
    id: 'f3',
    nom: 'Contrôle qualité arrivée quai',
    categorie: 'controle_qualite',
    actif: true,
    createdAt: '2026-04-10',
    champs: [
      { id: 'q1', label: 'Numéro de lot', type: 'text', obligatoire: true },
      { id: 'q2', label: 'État emballage', type: 'select', obligatoire: true, options: ['Conforme', 'Légèrement endommagé', 'Endommagé', 'Rejeté'] },
      { id: 'q3', label: 'Quantité reçue', type: 'number', obligatoire: true },
      { id: 'q4', label: 'Température à réception (°C)', type: 'number', obligatoire: false },
      { id: 'q5', label: 'Présence humidité', type: 'checkbox', obligatoire: false },
      { id: 'q6', label: 'Photo état colis', type: 'photo', obligatoire: false },
      { id: 'q7', label: 'Réserves émises', type: 'textarea', obligatoire: false },
    ],
  },
  {
    id: 'f4',
    nom: 'Remontée anomalie terrain',
    categorie: 'anomalie',
    actif: true,
    createdAt: '2026-04-15',
    champs: [
      { id: 'a1', label: 'Type d\'anomalie', type: 'select', obligatoire: true, options: ['Accident', 'Panne', 'Retard client', 'Refus livraison', 'Marchandise endommagée', 'Autre'] },
      { id: 'a2', label: 'Description', type: 'textarea', obligatoire: true },
      { id: 'a3', label: 'Localisation', type: 'text', obligatoire: true },
      { id: 'a4', label: 'Photo situation', type: 'photo', obligatoire: false },
      { id: 'a5', label: 'OT concerné', type: 'text', obligatoire: false },
      { id: 'a6', label: 'Urgence', type: 'select', obligatoire: true, options: ['Critique', 'Élevée', 'Normale', 'Basse'] },
    ],
  },
  {
    id: 'f5',
    nom: 'Confirmation de livraison',
    categorie: 'livraison',
    actif: false,
    createdAt: '2026-04-20',
    champs: [
      { id: 'l1', label: 'Référence OT', type: 'text', obligatoire: true },
      { id: 'l2', label: 'Nom destinataire', type: 'text', obligatoire: true },
      { id: 'l3', label: 'Quantité livrée', type: 'number', obligatoire: true },
      { id: 'l4', label: 'État à livraison', type: 'select', obligatoire: true, options: ['Conforme', 'Avec réserves', 'Refusé'] },
      { id: 'l5', label: 'Signature destinataire', type: 'signature', obligatoire: true },
      { id: 'l6', label: 'Photo preuve', type: 'photo', obligatoire: false },
    ],
  },
]

const DEMO_REPONSES: Reponse[] = [
  { id: 'r1', formulaire_id: 'f1', formulaire_nom: 'Inspection journalière véhicule', conducteur_nom: 'Martin Dupont', vehicule_immat: 'AB-234-CD', date_soumission: '2026-05-05T07:12:00', statut: 'valide', nb_anomalies: 0, completion_pct: 100 },
  { id: 'r2', formulaire_id: 'f2', formulaire_nom: 'Checklist départ mission', conducteur_nom: 'Sophie Lefevre', vehicule_immat: 'EF-567-GH', date_soumission: '2026-05-05T06:58:00', statut: 'valide', nb_anomalies: 0, completion_pct: 100 },
  { id: 'r3', formulaire_id: 'f1', formulaire_nom: 'Inspection journalière véhicule', conducteur_nom: 'Paul Renard', vehicule_immat: 'IJ-890-KL', date_soumission: '2026-05-05T07:34:00', statut: 'anomalie', nb_anomalies: 2, completion_pct: 100 },
  { id: 'r4', formulaire_id: 'f4', formulaire_nom: 'Remontée anomalie terrain', conducteur_nom: 'Paul Renard', vehicule_immat: 'IJ-890-KL', date_soumission: '2026-05-05T09:12:00', statut: 'en_revision', nb_anomalies: 1, completion_pct: 100 },
  { id: 'r5', formulaire_id: 'f3', formulaire_nom: 'Contrôle qualité arrivée quai', conducteur_nom: 'Martin Dupont', date_soumission: '2026-05-04T14:20:00', statut: 'valide', nb_anomalies: 0, completion_pct: 100 },
  { id: 'r6', formulaire_id: 'f2', formulaire_nom: 'Checklist départ mission', conducteur_nom: 'Alice Bernard', vehicule_immat: 'MN-123-OP', date_soumission: '2026-05-05T07:05:00', statut: 'soumis', nb_anomalies: 0, completion_pct: 87 },
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

function ChampTypeIcon({ type }: { type: ChampType }) {
  const cls = 'h-3.5 w-3.5 shrink-0'
  if (type === 'photo') return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="15" rx="2" /><circle cx="12" cy="13" r="4" /><path d="M9 6V4h6v2" /></svg>
  if (type === 'signature') return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 17c3-3 5-7 5-7s1 3 2 4 3-4 3-4 1 4 4 4" /><path d="M4 21h16" /></svg>
  if (type === 'checkbox') return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m9 12 2 2 4-4" /></svg>
  if (type === 'select') return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
  return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 12h6M9 16h4" /></svg>
}

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function FormulairesTerrain() {
  const { role } = useAuth()
  const canEdit = role === 'admin' || role === 'dirigeant' || role === 'exploitant' || role === 'logisticien'

  const [tab, setTab] = useState<TabView>('formulaires')
  const [selectedForm, setSelectedForm] = useState<Formulaire | null>(null)
  const [filterCategorie, setFilterCategorie] = useState<Formulaire['categorie'] | 'all'>('all')

  const filteredForms = useMemo(() => {
    return DEMO_FORMULAIRES.filter(f => filterCategorie === 'all' || f.categorie === filterCategorie)
  }, [filterCategorie])

  const stats = useMemo(() => {
    const anomalies = DEMO_REPONSES.filter(r => r.statut === 'anomalie' || r.statut === 'en_revision').length
    const valides = DEMO_REPONSES.filter(r => r.statut === 'valide').length
    return { totalForms: DEMO_FORMULAIRES.filter(f => f.actif).length, totalReponses: DEMO_REPONSES.length, anomalies, valides }
  }, [])

  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">E-formulaires terrain</h1>
          <p className="mt-1 text-sm text-secondary">Formulaires configurables — inspections, contrôles qualité, checklists départ, anomalies</p>
        </div>
        {canEdit && (
          <button type="button" className="rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
            + Nouveau formulaire
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Formulaires actifs" value={String(stats.totalForms)} sub="configurés" />
        <KpiCard label="Réponses aujourd'hui" value={String(stats.totalReponses)} sub="soumissions terrain" />
        <KpiCard label="Validés" value={String(stats.valides)} sub="sans anomalie" accent="#22c55e" />
        <KpiCard label="Anomalies" value={String(stats.anomalies)} sub="à traiter" accent={stats.anomalies > 0 ? '#ef4444' : undefined} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1 w-fit">
        {(['formulaires', 'reponses', 'editeur'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === t ? 'bg-surface text-heading shadow-sm' : 'text-secondary hover:text-heading'}`}
          >
            {t === 'formulaires' ? 'Formulaires' : t === 'reponses' ? 'Réponses' : 'Éditeur'}
          </button>
        ))}
      </div>

      {/* Onglet Formulaires */}
      {tab === 'formulaires' && (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Filtres + liste */}
          <div className="lg:col-span-2 space-y-3">
            <select
              value={filterCategorie}
              onChange={e => setFilterCategorie(e.target.value as Formulaire['categorie'] | 'all')}
              className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-heading outline-none focus:border-[color:var(--primary)]"
            >
              <option value="all">Toutes catégories</option>
              {(Object.entries(CATEGORIE_LABELS) as [Formulaire['categorie'], string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            <div className="flex flex-col gap-2">
              {filteredForms.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedForm(f)}
                  className={`rounded-2xl border p-4 text-left transition ${selectedForm?.id === f.id ? 'border-[color:var(--primary)] bg-[color:var(--primary-soft)]' : 'border-line bg-surface hover:border-line-strong'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm text-heading leading-snug">{f.nom}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${!f.actif ? 'bg-surface-2 text-muted border-line' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                      {f.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${CATEGORIE_COLORS[f.categorie]}`}>
                      {CATEGORIE_LABELS[f.categorie]}
                    </span>
                    <span className="text-xs text-muted">{f.champs.length} champs</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Aperçu formulaire */}
          <div className="lg:col-span-3">
            {!selectedForm ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-line bg-surface-2">
                <p className="text-sm text-muted">Sélectionnez un formulaire pour voir l'aperçu</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-surface">
                <div className="border-b border-line px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-heading">{selectedForm.nom}</h3>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${CATEGORIE_COLORS[selectedForm.categorie]}`}>
                      {CATEGORIE_LABELS[selectedForm.categorie]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{selectedForm.champs.length} champs · {selectedForm.champs.filter(c => c.obligatoire).length} obligatoires</p>
                </div>
                <div className="p-5 space-y-2">
                  {selectedForm.champs.map((champ, idx) => (
                    <div key={champ.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-line text-[10px] font-bold text-secondary">{idx + 1}</span>
                      <span className="text-secondary"><ChampTypeIcon type={champ.type} /></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-heading leading-snug">{champ.label}</p>
                        <p className="text-xs text-muted">{TYPE_LABELS[champ.type]}{champ.options ? ` · ${champ.options.join(', ')}` : ''}</p>
                      </div>
                      {champ.obligatoire && (
                        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Obligatoire</span>
                      )}
                    </div>
                  ))}
                </div>
                {canEdit && (
                  <div className="border-t border-line px-5 py-3 flex gap-2">
                    <button type="button" className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-xs font-medium text-secondary transition hover:text-heading">
                      Modifier
                    </button>
                    <button type="button" className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-xs font-medium text-secondary transition hover:text-heading">
                      Dupliquer
                    </button>
                    <button type="button" className="ml-auto rounded-lg bg-[color:var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90">
                      Envoyer sur terrain
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet Réponses */}
      {tab === 'reponses' && (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 border-b border-line bg-surface-2 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-discreet">
            <span>Formulaire & Conducteur</span>
            <span>Date</span>
            <span>Complétion</span>
            <span>Anomalies</span>
            <span>Statut</span>
          </div>
          {DEMO_REPONSES.map(r => (
            <div key={r.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-4 border-b border-line px-5 py-3 last:border-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-heading">{r.formulaire_nom}</p>
                <p className="truncate text-xs text-secondary">{r.conducteur_nom}{r.vehicule_immat ? ` · ${r.vehicule_immat}` : ''}</p>
              </div>
              <span className="text-xs text-secondary">{fmtDT(r.date_soumission)}</span>
              <span className={`text-xs font-semibold ${r.completion_pct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{r.completion_pct}%</span>
              <span className={`text-xs font-semibold ${r.nb_anomalies > 0 ? 'text-red-600' : 'text-muted'}`}>{r.nb_anomalies}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUT_COLORS[r.statut]}`}>
                {STATUT_LABELS[r.statut]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Onglet Éditeur */}
      {tab === 'editeur' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="mb-4 font-semibold text-heading">Types de champs disponibles</h3>
            <div className="space-y-2">
              {(Object.entries(TYPE_LABELS) as [ChampType, string][]).map(([type, label]) => (
                <div key={type} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                  <span className="text-blue-600"><ChampTypeIcon type={type} /></span>
                  <span className="text-sm text-heading">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 rounded-2xl border border-line bg-surface p-5">
            <h3 className="mb-2 font-semibold text-heading">Éditeur de formulaire</h3>
            <p className="mb-6 text-sm text-muted">Drag & drop des champs pour composer vos formulaires sur mesure.</p>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface-2 py-16">
              <svg className="mb-3 h-10 w-10 text-discreet" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5M12 11v6M9 14h6" />
              </svg>
              <p className="text-sm font-medium text-secondary">Glissez des champs ici pour construire votre formulaire</p>
              <p className="mt-1 text-xs text-muted">ou sélectionnez un formulaire existant pour le modifier</p>
              {canEdit && (
                <button type="button" className="mt-4 rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                  Créer un nouveau formulaire
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
