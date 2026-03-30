import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/lib/database.types'

// ── Types DB ─────────────────────────────────────────────────────────────────
type Vehicule = Tables<'vehicules'>
type Remorque = Tables<'remorques'>
type FlotteEntretien = Tables<'flotte_entretiens'>
type FlotteDocument = Tables<'flotte_documents'>
type FlotteAlerte = Tables<'vue_alertes_flotte'>

// ── Types métier (in-memory) ──────────────────────────────────────────────────
type OTPriorite = 'urgente' | 'haute' | 'normale' | 'planifiee'
type OTStatut = 'ouvert' | 'en_cours' | 'en_attente_pieces' | 'termine' | 'facture'

type OT = {
  id: string
  vehicule_id: string | null
  remorque_id: string | null
  type: string
  priorite: OTPriorite
  statut: OTStatut
  mecanicien: string
  description: string
  date_ouverture: string
  date_cloture: string | null
  cout_ht: number
  prestataire: string | null
  garage: string | null
  pieces_utilisees: string
  kilometrage: string
}

type Piece = {
  id: string
  reference: string
  designation: string
  compatibilite: string
  quantite: number
  quantite_min: number
  prix_unitaire: number
  fournisseur: string
  emplacement: string
  last_cmd: string | null
}

type Fournisseur = {
  id: string
  nom: string
  type: 'garage' | 'pieces' | 'pneus' | 'lubrifiant' | 'concessionnaire' | 'autre'
  contact: string
  telephone: string
  email: string
  delai_livraison: string
  conditions: string
  note: number
}

type Tab = 'dashboard' | 'ot' | 'planning' | 'stock' | 'fournisseurs' | 'couts'

// ── Constantes ────────────────────────────────────────────────────────────────
const MAINTENANCE_TYPES = ['vidange', 'revision', 'pneus', 'freinage', 'controle_technique', 'tachygraphe', 'reparation', 'electricite', 'embrayage', 'prestation_exterieure', 'autre'] as const
const MAINTENANCE_LABELS: Record<string, string> = {
  vidange: 'Vidange', revision: 'Révision', pneus: 'Pneumatiques', freinage: 'Freinage',
  controle_technique: 'Contrôle technique', tachygraphe: 'Tachygraphe', reparation: 'Réparation',
  electricite: 'Électricité', embrayage: 'Embrayage', prestation_exterieure: 'Prestation ext.', autre: 'Autre',
}

const OT_PRIORITE_COLORS: Record<OTPriorite, string> = {
  urgente:   'bg-red-100 text-red-700 border-red-200',
  haute:     'bg-orange-100 text-orange-700 border-orange-200',
  normale:   'bg-blue-100 text-blue-700 border-blue-200',
  planifiee: 'bg-slate-100 text-slate-600 border-slate-200',
}
const OT_PRIORITE_LABELS: Record<OTPriorite, string> = {
  urgente: 'Urgente', haute: 'Haute', normale: 'Normale', planifiee: 'Planifiée',
}
const OT_STATUT_COLORS: Record<OTStatut, string> = {
  ouvert:              'bg-yellow-100 text-yellow-700',
  en_cours:            'bg-blue-100 text-blue-700',
  en_attente_pieces:   'bg-orange-100 text-orange-700',
  termine:             'bg-green-100 text-green-700',
  facture:             'bg-slate-100 text-slate-600',
}
const OT_STATUT_LABELS: Record<OTStatut, string> = {
  ouvert: 'Ouvert', en_cours: 'En cours', en_attente_pieces: 'Att. pièces', termine: 'Terminé', facture: 'Facturé',
}

const TYPE_FOURNISSEUR_LABELS: Record<string, string> = {
  garage: 'Garage', pieces: 'Pièces détachées', pneus: 'Pneumatiques',
  lubrifiant: 'Lubrifiants', concessionnaire: 'Concessionnaire', autre: 'Autre',
}

const MECANICIENS_DEMO = ['', 'Pierre Martin', 'Marc Dubois', 'Karim Bensalem', 'Julien Petit', 'Thomas Bernard']

// ── Seed data fournisseurs ────────────────────────────────────────────────────
const SEED_FOURNISSEURS: Fournisseur[] = [
  { id: 'f1', nom: 'AD Poids Lourds', type: 'pieces', contact: 'Sébastien Arnaud', telephone: '04 72 XX XX XX', email: 'contact@adpl.fr', delai_livraison: '24h', conditions: 'Paiement 30 jours', note: 4 },
  { id: 'f2', nom: 'Euromaster Centre', type: 'pneus', contact: 'Didier Lambert', telephone: '04 78 XX XX XX', email: 'atelier@euromaster.fr', delai_livraison: 'J+1 matin', conditions: 'Paiement comptant', note: 5 },
  { id: 'f3', nom: 'Total Lubrifiants', type: 'lubrifiant', contact: 'Christine Morel', telephone: '01 47 XX XX XX', email: 'pro@total.fr', delai_livraison: '48h', conditions: '60 jours fin de mois', note: 4 },
  { id: 'f4', nom: 'Volvo Trucks Lyon', type: 'concessionnaire', contact: 'Nicolas Faure', telephone: '04 37 XX XX XX', email: 'apres-vente@volvo-lyon.fr', delai_livraison: 'Variable', conditions: 'Bon de commande', note: 3 },
  { id: 'f5', nom: 'Scania France – SAV', type: 'concessionnaire', contact: 'Laurent Vidal', telephone: '04 27 XX XX XX', email: 'sav@scania-lyon.fr', delai_livraison: 'Variable', conditions: 'Bon de commande', note: 4 },
  { id: 'f6', nom: 'Garage Girard', type: 'garage', contact: 'Alain Girard', telephone: '04 74 XX XX XX', email: 'garage.girard@gmail.com', delai_livraison: 'Sur RDV', conditions: 'Paiement à réception', note: 5 },
]

// ── Seed data pièces ──────────────────────────────────────────────────────────
const SEED_PIECES: Piece[] = [
  { id: 'p1', reference: 'FH-OM-001', designation: 'Filtre à huile moteur (Volvo FH)', compatibilite: 'Volvo FH', quantite: 6, quantite_min: 3, prix_unitaire: 24.90, fournisseur: 'AD Poids Lourds', emplacement: 'A1-01', last_cmd: '2026-02-15' },
  { id: 'p2', reference: 'FH-FC-001', designation: 'Filtre carburant (Volvo FH)', compatibilite: 'Volvo FH', quantite: 4, quantite_min: 2, prix_unitaire: 31.50, fournisseur: 'AD Poids Lourds', emplacement: 'A1-02', last_cmd: '2026-02-15' },
  { id: 'p3', reference: 'SC-FAH-001', designation: 'Filtre à huile moteur (Scania R)', compatibilite: 'Scania R', quantite: 2, quantite_min: 3, prix_unitaire: 28.70, fournisseur: 'Scania France – SAV', emplacement: 'A1-03', last_cmd: '2026-01-20' },
  { id: 'p4', reference: 'PLQ-AV-UNIV', designation: 'Plaquettes de frein avant (universelles)', compatibilite: 'Multi', quantite: 8, quantite_min: 4, prix_unitaire: 89.00, fournisseur: 'AD Poids Lourds', emplacement: 'B2-01', last_cmd: '2026-01-10' },
  { id: 'p5', reference: 'GARN-AR-001', designation: 'Garnitures de frein arrière', compatibilite: 'Multi', quantite: 1, quantite_min: 2, prix_unitaire: 145.00, fournisseur: 'AD Poids Lourds', emplacement: 'B2-02', last_cmd: '2025-12-05' },
  { id: 'p6', reference: 'HUI-15W40-20L', designation: 'Huile moteur 15W40 (bidon 20L)', compatibilite: 'Multi', quantite: 12, quantite_min: 6, prix_unitaire: 62.00, fournisseur: 'Total Lubrifiants', emplacement: 'C1-01', last_cmd: '2026-02-28' },
  { id: 'p7', reference: 'HUI-BOIT-20L', designation: 'Huile boîte 80W90 (bidon 20L)', compatibilite: 'Multi', quantite: 3, quantite_min: 2, prix_unitaire: 78.00, fournisseur: 'Total Lubrifiants', emplacement: 'C1-02', last_cmd: '2026-01-15' },
  { id: 'p8', reference: 'COUR-ALT-001', designation: 'Courroie alternateur', compatibilite: 'Volvo FH / Renault T', quantite: 2, quantite_min: 1, prix_unitaire: 34.20, fournisseur: 'AD Poids Lourds', emplacement: 'A3-01', last_cmd: '2025-11-20' },
  { id: 'p9', reference: 'AMPH7-001', designation: 'Ampoule phare H7 (paire)', compatibilite: 'Multi', quantite: 10, quantite_min: 4, prix_unitaire: 12.50, fournisseur: 'AD Poids Lourds', emplacement: 'D1-01', last_cmd: '2026-02-01' },
  { id: 'p10', reference: 'PNR-385-65-22', designation: 'Pneu 385/65R22.5 (essieu moteur)', compatibilite: 'Multi PL', quantite: 4, quantite_min: 4, prix_unitaire: 285.00, fournisseur: 'Euromaster Centre', emplacement: 'Parc ext.', last_cmd: '2026-02-10' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300 bg-white'
const fmtEur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'
const daysDiff = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-xs font-medium text-slate-600">{label}</label>{children}</div>
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{children}</span>
}

function KPI({ label, value, sub, color = 'slate' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    slate:  'bg-slate-50 border-slate-200 text-slate-700',
    green:  'bg-green-50 border-green-200 text-green-700',
    red:    'bg-red-50 border-red-200 text-red-700',
    amber:  'bg-amber-50 border-amber-200 text-amber-700',
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color] ?? colors.slate}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
      {sub && <p className="text-xs mt-1 opacity-55">{sub}</p>}
    </div>
  )
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard',   label: 'Vue d\'ensemble' },
    { key: 'ot',          label: 'Ordres de travaux' },
    { key: 'planning',    label: 'Planification' },
    { key: 'stock',       label: 'Pièces & Stock' },
    { key: 'fournisseurs',label: 'Fournisseurs' },
    { key: 'couts',       label: 'Coûts & Analyses' },
  ]
  return (
    <div className="flex gap-1 mb-6 border-b border-slate-200">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${active === t.key ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

function BarChart({ data, height = 120, color = '#1e293b' }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0 h-full">
          <div className="flex-1 w-full flex items-end">
            <div className="w-full rounded-t transition-all" style={{ height: `${(d.value / max) * 100}%`, background: color, minHeight: d.value > 0 ? 4 : 0 }} />
          </div>
          <span className="text-[10px] text-slate-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function maintenanceError(err: unknown) {
  const msg = err instanceof Error ? err.message : ''
  if (msg.includes('flotte_') || msg.includes('vue_alertes')) return 'La migration Supabase flotte est requise pour cette fonctionnalité.'
  if (msg.includes('Bucket')) return 'Bucket Supabase `flotte-documents` introuvable.'
  return msg || 'Erreur inconnue.'
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function Maintenance() {
  const [tab, setTab] = useState<Tab>('dashboard')

  // ── État DB ─────────────────────────────────────────────────────────────────
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [remorques, setRemorques] = useState<Remorque[]>([])
  const [entretiens, setEntretiens] = useState<FlotteEntretien[]>([])
  const [, setDocuments] = useState<FlotteDocument[]>([])
  const [alerts, setAlerts] = useState<FlotteAlerte[]>([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // ── État OT (in-memory) ─────────────────────────────────────────────────────
  const [ots, setOts] = useState<OT[]>([])
  const [showOTForm, setShowOTForm] = useState(false)
  const [filterOTStatut, setFilterOTStatut] = useState<OTStatut | 'tous'>('tous')
  const [filterOTVehicule, setFilterOTVehicule] = useState('')
  const [otForm, setOTForm] = useState({
    vehicule_id: '', remorque_id: '', type: 'reparation', priorite: 'normale' as OTPriorite,
    statut: 'ouvert' as OTStatut, mecanicien: '', description: '', date_ouverture: new Date().toISOString().slice(0, 10),
    cout_ht: '', prestataire: '', garage: '', pieces_utilisees: '', kilometrage: '', next_due_date: '',
  })

  // ── État Pièces ─────────────────────────────────────────────────────────────
  const [pieces, setPieces] = useState<Piece[]>(SEED_PIECES)
  const [showPieceForm, setShowPieceForm] = useState(false)
  const [pieceForm, setPieceForm] = useState({ reference: '', designation: '', compatibilite: '', quantite: '', quantite_min: '', prix_unitaire: '', fournisseur: '', emplacement: '' })
  const [pieceAjust, setPieceAjust] = useState<{ id: string; delta: string } | null>(null)

  // ── État Fournisseurs ───────────────────────────────────────────────────────
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>(SEED_FOURNISSEURS)
  const [showFourForm, setShowFourForm] = useState(false)
  const [fourForm, setFourForm] = useState({ nom: '', type: 'pieces' as Fournisseur['type'], contact: '', telephone: '', email: '', delai_livraison: '', conditions: '', note: '3' })

  // ── État Entretien form (sauvegarde DB depuis OT) ───────────────────────────
  async function load() {
    setLoading(true)
    setDbError(null)
    try {
      const [vRes, rRes] = await Promise.all([
        supabase.from('vehicules').select('*').order('immatriculation'),
        supabase.from('remorques').select('*').order('immatriculation'),
      ])
      if (vRes.error) throw vRes.error
      if (rRes.error) throw rRes.error
      setVehicules(vRes.data ?? [])
      setRemorques(rRes.data ?? [])

      const [eRes, dRes, aRes] = await Promise.all([
        supabase.from('flotte_entretiens').select('*').order('service_date', { ascending: false }),
        supabase.from('flotte_documents').select('*').is('archived_at', null).order('created_at', { ascending: false }),
        supabase.from('vue_alertes_flotte').select('*').order('due_on', { ascending: true }),
      ])
      if (eRes.error) throw eRes.error
      if (dRes.error) throw dRes.error
      setEntretiens(eRes.data ?? [])
      setDocuments(dRes.data ?? [])
      setAlerts(aRes.error ? [] : (aRes.data ?? []))
    } catch (err) {
      setDbError(maintenanceError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  // ── Helpers lookup ──────────────────────────────────────────────────────────
  const vehiculeLabel = (id: string | null) => id ? (vehicules.find(v => v.id === id)?.immatriculation ?? 'Véhicule') : null
  const remorqueLabel = (id: string | null) => id ? (remorques.find(r => r.id === id)?.immatriculation ?? 'Remorque') : null
  const assetLabel = (e: FlotteEntretien) => vehiculeLabel(e.vehicule_id) ?? remorqueLabel(e.remorque_id) ?? 'Parc'

  // ── Computed agregats ───────────────────────────────────────────────────────
  const now = new Date()
  const yearStr = String(now.getFullYear())
  const monthStr = `${yearStr}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const coutMois = useMemo(() => entretiens.filter(e => e.service_date.startsWith(monthStr)).reduce((s, e) => s + Number(e.cout_ht ?? 0), 0), [entretiens, monthStr])
  const coutAnnee = useMemo(() => entretiens.filter(e => e.service_date.startsWith(yearStr)).reduce((s, e) => s + Number(e.cout_ht ?? 0), 0), [entretiens, yearStr])

  // Disponibilité flotte
  const dispoPct = useMemo(() => {
    const total = vehicules.length
    if (!total) return 100
    const indispo = vehicules.filter(v => ['maintenance', 'hs'].includes(v.statut ?? '')).length
    return Math.round(((total - indispo) / total) * 100)
  }, [vehicules])

  // OT ouverts
  const otsActifs = ots.filter(o => o.statut !== 'termine' && o.statut !== 'facture')

  // Prochaines échéances (depuis entretiens.next_due_date)
  const prochaines = useMemo(() => {
    return entretiens
      .filter(e => e.next_due_date)
      .map(e => ({ ...e, jours: daysDiff(e.next_due_date!) }))
      .sort((a, b) => a.jours - b.jours)
      .slice(0, 20)
  }, [entretiens])

  const echeancesUrgentes = prochaines.filter(e => e.jours <= 7).length
  const echeancesMois = prochaines.filter(e => e.jours > 7 && e.jours <= 30).length

  // Monthly cost series (12 mois)
  const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  const monthlyCosts = useMemo(() => {
    const months = Array(12).fill(0)
    entretiens.forEach(e => {
      const d = new Date(e.service_date)
      if (d.getFullYear() === now.getFullYear()) months[d.getMonth()] += Number(e.cout_ht ?? 0)
    })
    return months
  }, [entretiens])

  const costByType = useMemo(() => {
    const map: Record<string, number> = {}
    entretiens.forEach(e => { map[e.maintenance_type] = (map[e.maintenance_type] ?? 0) + Number(e.cout_ht ?? 0) })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [entretiens])

  const costByVehicule = useMemo(() => {
    const map: Record<string, number> = {}
    entretiens.forEach(e => {
      const k = assetLabel(e)
      map[k] = (map[k] ?? 0) + Number(e.cout_ht ?? 0)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [entretiens])

  // Stock alertes
  const stockAlertes = pieces.filter(p => p.quantite <= p.quantite_min)

  // ── Actions OT ──────────────────────────────────────────────────────────────
  function createOT(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const newOT: OT = {
      id: `ot-${Date.now()}`,
      vehicule_id: otForm.vehicule_id || null,
      remorque_id: otForm.remorque_id || null,
      type: otForm.type,
      priorite: otForm.priorite,
      statut: otForm.statut,
      mecanicien: otForm.mecanicien,
      description: otForm.description,
      date_ouverture: otForm.date_ouverture,
      date_cloture: null,
      cout_ht: parseFloat(otForm.cout_ht) || 0,
      prestataire: otForm.prestataire || null,
      garage: otForm.garage || null,
      pieces_utilisees: otForm.pieces_utilisees,
      kilometrage: otForm.kilometrage,
    }
    setOts(prev => [newOT, ...prev])
    setShowOTForm(false)
    setOTForm({ vehicule_id: '', remorque_id: '', type: 'reparation', priorite: 'normale', statut: 'ouvert', mecanicien: '', description: '', date_ouverture: new Date().toISOString().slice(0, 10), cout_ht: '', prestataire: '', garage: '', pieces_utilisees: '', kilometrage: '', next_due_date: '' })
  }

  async function cloturerOT(ot: OT) {
    if (!confirm(`Clôturer et enregistrer l'OT "${ot.description}" en base ?`)) return
    setSaving(true)
    try {
      const payload: TablesInsert<'flotte_entretiens'> = {
        vehicule_id: ot.vehicule_id,
        remorque_id: ot.remorque_id,
        maintenance_type: ot.type,
        service_date: new Date().toISOString().slice(0, 10),
        cout_ht: ot.cout_ht,
        prestataire: ot.prestataire,
        garage: ot.garage,
        notes: [ot.description, ot.pieces_utilisees ? `Pièces: ${ot.pieces_utilisees}` : '', ot.mecanicien ? `Mécanicien: ${ot.mecanicien}` : ''].filter(Boolean).join(' · ') || null,
        next_due_date: otForm.next_due_date || null,
        covered_by_contract: false,
      }
      const { error } = await supabase.from('flotte_entretiens').insert(payload)
      if (error) throw error
      setOts(prev => prev.map(o => o.id === ot.id ? { ...o, statut: 'termine', date_cloture: new Date().toISOString().slice(0, 10) } : o))
      setNotice(`OT clôturé et enregistré — ${ot.description}`)
      await load()
    } catch (err) {
      setDbError(maintenanceError(err))
    } finally {
      setSaving(false)
    }
  }

  const filteredOTs = useMemo(() => {
    return ots.filter(o => {
      const matchStatut = filterOTStatut === 'tous' || o.statut === filterOTStatut
      const matchVeh = !filterOTVehicule || o.vehicule_id === filterOTVehicule || o.remorque_id === filterOTVehicule
      return matchStatut && matchVeh
    })
  }, [ots, filterOTStatut, filterOTVehicule])

  // ── Actions Pièces ─────────────────────────────────────────────────────────
  function addPiece(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setPieces(prev => [...prev, {
      id: `p${Date.now()}`,
      reference: pieceForm.reference,
      designation: pieceForm.designation,
      compatibilite: pieceForm.compatibilite,
      quantite: parseInt(pieceForm.quantite) || 0,
      quantite_min: parseInt(pieceForm.quantite_min) || 1,
      prix_unitaire: parseFloat(pieceForm.prix_unitaire) || 0,
      fournisseur: pieceForm.fournisseur,
      emplacement: pieceForm.emplacement,
      last_cmd: null,
    }])
    setShowPieceForm(false)
    setPieceForm({ reference: '', designation: '', compatibilite: '', quantite: '', quantite_min: '', prix_unitaire: '', fournisseur: '', emplacement: '' })
  }

  function ajusterStock(id: string, delta: number) {
    setPieces(prev => prev.map(p => p.id === id ? { ...p, quantite: Math.max(0, p.quantite + delta) } : p))
    setPieceAjust(null)
  }

  // ── Actions Fournisseurs ───────────────────────────────────────────────────
  function addFournisseur(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setFournisseurs(prev => [...prev, {
      id: `f${Date.now()}`,
      nom: fourForm.nom,
      type: fourForm.type,
      contact: fourForm.contact,
      telephone: fourForm.telephone,
      email: fourForm.email,
      delai_livraison: fourForm.delai_livraison,
      conditions: fourForm.conditions,
      note: parseInt(fourForm.note) || 3,
    }])
    setShowFourForm(false)
    setFourForm({ nom: '', type: 'pieces', contact: '', telephone: '', email: '', delai_livraison: '', conditions: '', note: '3' })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Atelier Mécanique</h2>
          <p className="text-slate-500 text-sm">
            {vehicules.length} véhicules · {otsActifs.length} OT actifs · {alerts.length + echeancesUrgentes} alerte{alerts.length + echeancesUrgentes !== 1 ? 's' : ''}
          </p>
        </div>
        {tab === 'ot' && (
          <button onClick={() => setShowOTForm(true)} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
            + Nouvel OT
          </button>
        )}
        {tab === 'stock' && (
          <button onClick={() => setShowPieceForm(!showPieceForm)} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
            + Ajouter une pièce
          </button>
        )}
        {tab === 'fournisseurs' && (
          <button onClick={() => setShowFourForm(!showFourForm)} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
            + Nouveau fournisseur
          </button>
        )}
      </div>

      <TabBar active={tab} onChange={setTab} />

      {(dbError || notice) && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${dbError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {dbError ?? notice}
          <button className="ml-3 underline text-xs opacity-70" onClick={() => { setDbError(null); setNotice(null) }}>Fermer</button>
        </div>
      )}

      {/* ══ TAB: VUE D'ENSEMBLE ═══════════════════════════════════════════════ */}
      {tab === 'dashboard' && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KPI label="Disponibilité flotte" value={`${dispoPct} %`} color={dispoPct >= 90 ? 'green' : dispoPct >= 70 ? 'amber' : 'red'} sub={`${vehicules.filter(v => !['maintenance','hs'].includes(v.statut??'')).length}/${vehicules.length} véhicules`} />
            <KPI label="OT actifs" value={otsActifs.length} color={otsActifs.length > 5 ? 'orange' : 'blue'} sub={`${ots.filter(o => o.statut === 'en_cours').length} en cours`} />
            <KPI label="Alertes urgentes" value={alerts.length + echeancesUrgentes} color={alerts.length + echeancesUrgentes > 0 ? 'red' : 'green'} sub="≤ 7 jours" />
            <KPI label="Coût mois" value={fmtEur(coutMois)} color="amber" sub={`Annuel: ${fmtEur(coutAnnee)}`} />
            <KPI label="Stock alertes" value={stockAlertes.length} color={stockAlertes.length > 0 ? 'red' : 'green'} sub="Pièces en rupture" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Alertes flotte */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Alertes flotte actives</h3>
              {loading ? <p className="text-xs text-slate-400">Chargement...</p> :
                alerts.length === 0 && echeancesUrgentes === 0 ? <p className="text-xs text-slate-400">Aucune alerte active.</p> :
                <div className="space-y-2">
                  {alerts.slice(0, 6).map((a, i) => (
                    <div key={i} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-red-800">{a.label ?? a.alert_type}</p>
                        <p className="text-xs text-red-600">{a.asset_label} · {fmtDate(a.due_on)}</p>
                      </div>
                      <Badge color="bg-red-100 text-red-700">Alerte</Badge>
                    </div>
                  ))}
                  {prochaines.filter(e => e.jours >= 0 && e.jours <= 7).slice(0, 4).map(e => (
                    <div key={e.id} className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-orange-800">{MAINTENANCE_LABELS[e.maintenance_type] ?? e.maintenance_type}</p>
                        <p className="text-xs text-orange-600">{assetLabel(e)} · dans {e.jours} j.</p>
                      </div>
                      <Badge color="bg-orange-100 text-orange-700">Urgent</Badge>
                    </div>
                  ))}
                </div>
              }
            </div>

            {/* État du parc */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">État du parc véhicules</h3>
              {vehicules.length === 0 ? <p className="text-xs text-slate-400">Aucun véhicule enregistré.</p> :
                <div className="space-y-1.5">
                  {vehicules.slice(0, 8).map(v => {
                    const color = { disponible: 'bg-green-100 text-green-700', en_service: 'bg-blue-100 text-blue-700', maintenance: 'bg-orange-100 text-orange-700', hs: 'bg-red-100 text-red-700', vendu: 'bg-slate-100 text-slate-500' }[v.statut ?? 'disponible'] ?? 'bg-slate-100 text-slate-600'
                    const label = { disponible: 'Disponible', en_service: 'En service', maintenance: 'Maintenance', hs: 'H.S.', vendu: 'Vendu' }[v.statut ?? 'disponible'] ?? v.statut
                    return (
                      <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{v.immatriculation}</span>
                          <span className="text-xs text-slate-500">{v.marque} {v.modele}</span>
                        </div>
                        <Badge color={color}>{label}</Badge>
                      </div>
                    )
                  })}
                  {vehicules.length > 8 && <p className="text-xs text-slate-400 pt-1">+{vehicules.length - 8} autres véhicules</p>}
                </div>
              }
            </div>
          </div>

          {/* Prochaines échéances */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Planification à venir</h3>
            {prochaines.length === 0 ? <p className="text-xs text-slate-400">Aucune échéance planifiée.</p> :
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                {prochaines.slice(0, 9).map(e => {
                  const urgence = e.jours < 0 ? 'bg-red-50 border-red-200' : e.jours <= 7 ? 'bg-orange-50 border-orange-200' : e.jours <= 30 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                  const textUrgence = e.jours < 0 ? 'text-red-700' : e.jours <= 7 ? 'text-orange-700' : 'text-amber-700'
                  return (
                    <div key={e.id} className={`rounded-lg border px-3 py-2.5 ${urgence}`}>
                      <p className="text-sm font-medium text-slate-800">{MAINTENANCE_LABELS[e.maintenance_type] ?? e.maintenance_type}</p>
                      <p className="text-xs text-slate-600">{assetLabel(e)}</p>
                      <p className={`text-xs font-semibold mt-1 ${textUrgence}`}>
                        {e.jours < 0 ? `En retard de ${Math.abs(e.jours)} j.` : e.jours === 0 ? "Aujourd'hui" : `Dans ${e.jours} j. — ${fmtDate(e.next_due_date)}`}
                      </p>
                    </div>
                  )
                })}
              </div>
            }
          </div>

          {/* OT actifs */}
          {otsActifs.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">OT en cours</h3>
              <div className="space-y-2">
                {otsActifs.slice(0, 5).map(o => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <Badge color={OT_PRIORITE_COLORS[o.priorite]}>{OT_PRIORITE_LABELS[o.priorite]}</Badge>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{o.description}</p>
                        <p className="text-xs text-slate-500">{vehiculeLabel(o.vehicule_id) ?? remorqueLabel(o.remorque_id) ?? 'Parc'} {o.mecanicien ? `· ${o.mecanicien}` : ''}</p>
                      </div>
                    </div>
                    <Badge color={OT_STATUT_COLORS[o.statut]}>{OT_STATUT_LABELS[o.statut]}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: ORDRES DE TRAVAUX ═════════════════════════════════════════════ */}
      {tab === 'ot' && (
        <div className="space-y-5">
          {/* Filtres */}
          <div className="flex flex-wrap gap-2 items-center">
            {(['tous', 'ouvert', 'en_cours', 'en_attente_pieces', 'termine', 'facture'] as const).map(s => (
              <button key={s} onClick={() => setFilterOTStatut(s)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${filterOTStatut === s ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {s === 'tous' ? 'Tous' : OT_STATUT_LABELS[s]}
                {s !== 'tous' && <span className="ml-1.5 opacity-70">({ots.filter(o => o.statut === s).length})</span>}
              </button>
            ))}
            <select value={filterOTVehicule} onChange={e => setFilterOTVehicule(e.target.value)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 outline-none bg-white">
              <option value="">Tous les véhicules</option>
              {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation}</option>)}
              {remorques.map(r => <option key={r.id} value={r.id}>{r.immatriculation}</option>)}
            </select>
          </div>

          {filteredOTs.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <p className="text-slate-400 text-sm">Aucun ordre de travaux. Cliquez sur + Nouvel OT pour commencer.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Priorité', 'Véhicule', 'Type', 'Description', 'Mécanicien', 'Date', 'Coût HT', 'Statut', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOTs.map((o, i) => (
                    <tr key={o.id} className={`border-t border-slate-100 ${i % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                      <td className="px-4 py-3"><Badge color={OT_PRIORITE_COLORS[o.priorite]}>{OT_PRIORITE_LABELS[o.priorite]}</Badge></td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{vehiculeLabel(o.vehicule_id) ?? remorqueLabel(o.remorque_id) ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{MAINTENANCE_LABELS[o.type] ?? o.type}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{o.description}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{o.mecanicien || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(o.date_ouverture)}</td>
                      <td className="px-4 py-3 text-slate-700">{o.cout_ht > 0 ? fmtEur(o.cout_ht) : '—'}</td>
                      <td className="px-4 py-3">
                        <select value={o.statut} onChange={e => setOts(prev => prev.map(x => x.id === o.id ? { ...x, statut: e.target.value as OTStatut } : x))}
                          className={`text-xs border rounded-lg px-2 py-1 outline-none ${OT_STATUT_COLORS[o.statut]}`}>
                          {(Object.keys(OT_STATUT_LABELS) as OTStatut[]).map(s => <option key={s} value={s}>{OT_STATUT_LABELS[s]}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {o.statut !== 'termine' && o.statut !== 'facture' && (
                          <button onClick={() => cloturerOT(o)} disabled={saving}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors disabled:opacity-50">
                            Clôturer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: PLANIFICATION ════════════════════════════════════════════════ */}
      {tab === 'planning' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPI label="En retard" value={prochaines.filter(e => e.jours < 0).length} color="red" />
            <KPI label="≤ 7 jours" value={echeancesUrgentes} color="orange" />
            <KPI label="≤ 30 jours" value={echeancesMois} color="amber" />
            <KPI label="> 30 jours" value={prochaines.filter(e => e.jours > 30).length} color="slate" />
          </div>

          {[
            { label: 'En retard', filter: (e: typeof prochaines[0]) => e.jours < 0, color: 'border-red-200 bg-red-50', badge: 'bg-red-100 text-red-700', icon: 'Retard' },
            { label: 'Urgents (≤ 7 jours)', filter: (e: typeof prochaines[0]) => e.jours >= 0 && e.jours <= 7, color: 'border-orange-200 bg-orange-50', badge: 'bg-orange-100 text-orange-700', icon: 'Urgent' },
            { label: 'Ce mois (8–30 jours)', filter: (e: typeof prochaines[0]) => e.jours > 7 && e.jours <= 30, color: 'border-amber-200 bg-amber-50', badge: 'bg-amber-100 text-amber-700', icon: 'Planifié' },
            { label: 'Au-delà de 30 jours', filter: (e: typeof prochaines[0]) => e.jours > 30, color: 'border-slate-200 bg-slate-50', badge: 'bg-slate-100 text-slate-600', icon: 'Futur' },
          ].map(({ label, filter, color, badge }) => {
            const items = prochaines.filter(filter)
            if (items.length === 0) return null
            return (
              <div key={label} className={`rounded-xl border p-5 ${color}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
                  <Badge color={badge}>{items.length} intervention{items.length > 1 ? 's' : ''}</Badge>
                </div>
                <div className="space-y-2">
                  {items.map(e => (
                    <div key={e.id} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2.5 border border-white/50">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">{assetLabel(e)}</span>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{MAINTENANCE_LABELS[e.maintenance_type] ?? e.maintenance_type}</p>
                          {(e.prestataire || e.garage) && <p className="text-xs text-slate-500">{[e.prestataire, e.garage].filter(Boolean).join(' · ')}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-700">{fmtDate(e.next_due_date)}</p>
                        <p className="text-xs text-slate-400">{e.jours < 0 ? `${Math.abs(e.jours)} j. de retard` : e.jours === 0 ? "Aujourd'hui" : `J−${e.jours}`}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {prochaines.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <p className="text-slate-400 text-sm">Aucune planification. Définissez des dates d'échéance lors de la saisie des interventions.</p>
            </div>
          )}

          {/* Récapitulatif annuel par type */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Répartition des interventions {yearStr}</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(
                entretiens.filter(e => e.service_date.startsWith(yearStr))
                  .reduce((acc, e) => { acc[e.maintenance_type] = (acc[e.maintenance_type] ?? 0) + 1; return acc }, {} as Record<string, number>)
              ).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <div key={type} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p className="text-xl font-bold text-slate-800">{count}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{MAINTENANCE_LABELS[type] ?? type}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: PIÈCES & STOCK ═══════════════════════════════════════════════ */}
      {tab === 'stock' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPI label="Références en stock" value={pieces.length} color="slate" />
            <KPI label="Valeur totale" value={fmtEur(pieces.reduce((s, p) => s + p.quantite * p.prix_unitaire, 0))} color="blue" />
            <KPI label="Alertes rupture" value={stockAlertes.length} color={stockAlertes.length > 0 ? 'red' : 'green'} />
            <KPI label="Pièces critiques" value={pieces.filter(p => p.quantite === 0).length} color={pieces.filter(p => p.quantite === 0).length > 0 ? 'red' : 'green'} sub="Quantité = 0" />
          </div>

          {/* Alertes stock */}
          {stockAlertes.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-red-800 mb-2">Alertes stock — Commandes à passer</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {stockAlertes.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-white rounded-lg border border-red-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.designation}</p>
                      <p className="text-xs text-slate-500">{p.reference} · {p.fournisseur}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{p.quantite} restant</p>
                      <p className="text-xs text-slate-400">Min. {p.quantite_min}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulaire ajout */}
          {showPieceForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Nouvelle référence</h3>
              <form onSubmit={addPiece} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="lg:col-span-1"><Field label="Référence *"><input className={inp} value={pieceForm.reference} onChange={e => setPieceForm(f => ({ ...f, reference: e.target.value }))} required /></Field></div>
                <div className="lg:col-span-2"><Field label="Désignation *"><input className={inp} value={pieceForm.designation} onChange={e => setPieceForm(f => ({ ...f, designation: e.target.value }))} required /></Field></div>
                <Field label="Compatibilité"><input className={inp} value={pieceForm.compatibilite} onChange={e => setPieceForm(f => ({ ...f, compatibilite: e.target.value }))} /></Field>
                <Field label="Quantité *"><input className={inp} type="number" min="0" value={pieceForm.quantite} onChange={e => setPieceForm(f => ({ ...f, quantite: e.target.value }))} required /></Field>
                <Field label="Stock min."><input className={inp} type="number" min="0" value={pieceForm.quantite_min} onChange={e => setPieceForm(f => ({ ...f, quantite_min: e.target.value }))} /></Field>
                <Field label="Prix unit. HT"><input className={inp} type="number" step="0.01" value={pieceForm.prix_unitaire} onChange={e => setPieceForm(f => ({ ...f, prix_unitaire: e.target.value }))} /></Field>
                <Field label="Fournisseur">
                  <select className={inp} value={pieceForm.fournisseur} onChange={e => setPieceForm(f => ({ ...f, fournisseur: e.target.value }))}>
                    <option value="">—</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.nom}>{f.nom}</option>)}
                  </select>
                </Field>
                <Field label="Emplacement"><input className={inp} value={pieceForm.emplacement} onChange={e => setPieceForm(f => ({ ...f, emplacement: e.target.value }))} /></Field>
                <div className="lg:col-span-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowPieceForm(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
                  <button type="submit" className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">Enregistrer</button>
                </div>
              </form>
            </div>
          )}

          {/* Table pièces */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Référence', 'Désignation', 'Compat.', 'Stock', 'Min.', 'PU HT', 'Valeur', 'Empl.', 'Fournisseur', ''].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pieces.map((p, i) => {
                  const critique = p.quantite === 0
                  const alerte = p.quantite > 0 && p.quantite <= p.quantite_min
                  return (
                    <tr key={p.id} className={`border-t border-slate-100 ${critique ? 'bg-red-50' : alerte ? 'bg-orange-50' : i % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-600">{p.reference}</td>
                      <td className="px-3 py-2.5 text-slate-800 font-medium">{p.designation}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{p.compatibilite || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`font-bold ${critique ? 'text-red-600' : alerte ? 'text-orange-600' : 'text-slate-800'}`}>{p.quantite}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-400">{p.quantite_min}</td>
                      <td className="px-3 py-2.5 text-slate-600">{p.prix_unitaire > 0 ? fmtEur(p.prix_unitaire) : '—'}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-700">{fmtEur(p.quantite * p.prix_unitaire)}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-400 font-mono">{p.emplacement || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{p.fournisseur || '—'}</td>
                      <td className="px-3 py-2.5 text-right">
                        {pieceAjust?.id === p.id ? (
                          <div className="flex items-center gap-1">
                            <input type="number" autoFocus className="w-14 px-1 py-0.5 border border-slate-200 rounded text-xs text-center" value={pieceAjust.delta} onChange={e => setPieceAjust({ id: p.id, delta: e.target.value })} />
                            <button onClick={() => ajusterStock(p.id, parseInt(pieceAjust.delta) || 0)} className="text-xs text-emerald-600 font-medium">OK</button>
                            <button onClick={() => setPieceAjust(null)} className="text-xs text-slate-400">✕</button>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setPieceAjust({ id: p.id, delta: '1' })} className="text-xs text-slate-400 hover:text-slate-700">+/−</button>
                            <button onClick={() => setPieces(prev => prev.filter(x => x.id !== p.id))} className="text-xs text-slate-300 hover:text-red-500">✕</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ TAB: FOURNISSEURS ══════════════════════════════════════════════════ */}
      {tab === 'fournisseurs' && (
        <div className="space-y-5">
          {/* Formulaire ajout */}
          {showFourForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Nouveau fournisseur</h3>
              <form onSubmit={addFournisseur} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="lg:col-span-2"><Field label="Raison sociale *"><input className={inp} value={fourForm.nom} onChange={e => setFourForm(f => ({ ...f, nom: e.target.value }))} required /></Field></div>
                <Field label="Type">
                  <select className={inp} value={fourForm.type} onChange={e => setFourForm(f => ({ ...f, type: e.target.value as Fournisseur['type'] }))}>
                    {Object.entries(TYPE_FOURNISSEUR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Note (/5)">
                  <select className={inp} value={fourForm.note} onChange={e => setFourForm(f => ({ ...f, note: e.target.value }))}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5-n)}</option>)}
                  </select>
                </Field>
                <Field label="Contact"><input className={inp} value={fourForm.contact} onChange={e => setFourForm(f => ({ ...f, contact: e.target.value }))} /></Field>
                <Field label="Téléphone"><input className={inp} value={fourForm.telephone} onChange={e => setFourForm(f => ({ ...f, telephone: e.target.value }))} /></Field>
                <Field label="Email"><input className={inp} type="email" value={fourForm.email} onChange={e => setFourForm(f => ({ ...f, email: e.target.value }))} /></Field>
                <Field label="Délai livraison"><input className={inp} value={fourForm.delai_livraison} placeholder="Ex: 24h" onChange={e => setFourForm(f => ({ ...f, delai_livraison: e.target.value }))} /></Field>
                <div className="lg:col-span-2"><Field label="Conditions de paiement"><input className={inp} value={fourForm.conditions} onChange={e => setFourForm(f => ({ ...f, conditions: e.target.value }))} /></Field></div>
                <div className="lg:col-span-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowFourForm(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
                  <button type="submit" className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">Enregistrer</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {fournisseurs.map(f => {
              const typeColor: Record<string, string> = { garage: 'bg-blue-50 text-blue-700', pieces: 'bg-slate-50 text-slate-700', pneus: 'bg-amber-50 text-amber-700', lubrifiant: 'bg-emerald-50 text-emerald-700', concessionnaire: 'bg-purple-50 text-purple-700', autre: 'bg-slate-50 text-slate-600' }
              const piecesFourn = pieces.filter(p => p.fournisseur === f.nom)
              return (
                <div key={f.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{f.nom}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[f.type] ?? 'bg-slate-50 text-slate-600'}`}>{TYPE_FOURNISSEUR_LABELS[f.type]}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-amber-500">{'★'.repeat(f.note)}{'☆'.repeat(5 - f.note)}</p>
                      <button onClick={() => setFournisseurs(prev => prev.filter(x => x.id !== f.id))} className="text-xs text-slate-300 hover:text-red-500 mt-1">Supprimer</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    {f.contact && <div><span className="font-medium text-slate-500 block">Contact</span>{f.contact}</div>}
                    {f.telephone && <div><span className="font-medium text-slate-500 block">Tél.</span><a href={`tel:${f.telephone}`} className="hover:text-slate-800">{f.telephone}</a></div>}
                    {f.email && <div><span className="font-medium text-slate-500 block">Email</span><a href={`mailto:${f.email}`} className="hover:text-slate-800">{f.email}</a></div>}
                    {f.delai_livraison && <div><span className="font-medium text-slate-500 block">Délai livraison</span>{f.delai_livraison}</div>}
                    {f.conditions && <div className="col-span-2"><span className="font-medium text-slate-500 block">Conditions</span>{f.conditions}</div>}
                  </div>
                  {piecesFourn.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-1">{piecesFourn.length} référence{piecesFourn.length > 1 ? 's' : ''} en stock</p>
                      <div className="flex flex-wrap gap-1">
                        {piecesFourn.slice(0, 4).map(p => <span key={p.id} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{p.reference}</span>)}
                        {piecesFourn.length > 4 && <span className="text-[11px] text-slate-400">+{piecesFourn.length - 4}</span>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══ TAB: COÛTS & ANALYSES ══════════════════════════════════════════════ */}
      {tab === 'couts' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPI label={`Coût ${new Date().toLocaleString('fr-FR', { month: 'long' })}`} value={fmtEur(coutMois)} color="amber" />
            <KPI label={`Coût annuel ${yearStr}`} value={fmtEur(coutAnnee)} color="slate" />
            <KPI label="Interventions ext." value={entretiens.filter(e => e.prestataire || e.garage).length} color="blue" sub="Sous-traitées" />
            <KPI label="Coût moyen / interv." value={entretiens.length > 0 ? fmtEur(coutAnnee / entretiens.filter(e => e.service_date.startsWith(yearStr)).length || 0) : '—'} color="slate" />
          </div>

          {/* Coût mensuel */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Coût mensuel atelier — {yearStr}</h3>
            <BarChart data={MOIS_FR.map((label, i) => ({ label, value: monthlyCosts[i] }))} height={140} color="#f59e0b" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Par type */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Répartition par type d'intervention</h3>
              {costByType.length === 0 ? <p className="text-xs text-slate-400">Aucune donnée.</p> : (
                <div className="space-y-2.5">
                  {costByType.map(([type, cost]) => {
                    const pct = coutAnnee > 0 ? (cost / coutAnnee) * 100 : 0
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">{MAINTENANCE_LABELS[type] ?? type}</span>
                          <span className="font-medium text-slate-800">{fmtEur(cost)} <span className="text-slate-400 font-normal text-xs">({pct.toFixed(0)}%)</span></span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Par véhicule */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Top véhicules les plus coûteux</h3>
              {costByVehicule.length === 0 ? <p className="text-xs text-slate-400">Aucune donnée.</p> : (
                <div className="space-y-3">
                  {costByVehicule.map(([label, cost], i) => {
                    const max = costByVehicule[0][1]
                    const pct = max > 0 ? (cost / max) * 100 : 0
                    return (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                        <span className="font-mono text-xs font-semibold text-slate-700 w-24">{label}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-700 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-slate-800 w-20 text-right">{fmtEur(cost)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Historique complet */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <p className="text-sm font-semibold text-slate-700">Historique des interventions ({entretiens.length})</p>
            </div>
            {entretiens.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Aucune intervention enregistrée.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Date', 'Véhicule', 'Type', 'Prestataire', 'Coût HT', 'Prochaine éch.'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entretiens.slice(0, 20).map((e, i) => (
                    <tr key={e.id} className={`border-t border-slate-100 ${i % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                      <td className="px-4 py-2.5 text-slate-600">{fmtDate(e.service_date)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-700">{assetLabel(e)}</td>
                      <td className="px-4 py-2.5 text-slate-600">{MAINTENANCE_LABELS[e.maintenance_type] ?? e.maintenance_type}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{[e.prestataire, e.garage].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{fmtEur(Number(e.cout_ht ?? 0))}</td>
                      <td className={`px-4 py-2.5 text-xs ${e.next_due_date && daysDiff(e.next_due_date) <= 7 ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                        {e.next_due_date ? fmtDate(e.next_due_date) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══ MODAL: Nouvel OT ═══════════════════════════════════════════════════ */}
      {showOTForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-base font-semibold">Nouvel ordre de travaux</h3>
              <button onClick={() => setShowOTForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={createOT} className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Véhicule">
                  <select className={inp} value={otForm.vehicule_id} onChange={e => setOTForm(f => ({ ...f, vehicule_id: e.target.value, remorque_id: '' }))}>
                    <option value="">— Sélectionner</option>
                    {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation} — {v.marque} {v.modele}</option>)}
                  </select>
                </Field>
                <Field label="Remorque">
                  <select className={inp} value={otForm.remorque_id} onChange={e => setOTForm(f => ({ ...f, remorque_id: e.target.value, vehicule_id: '' }))}>
                    <option value="">— Sélectionner</option>
                    {remorques.map(r => <option key={r.id} value={r.id}>{r.immatriculation}</option>)}
                  </select>
                </Field>
                <Field label="Type d'intervention *">
                  <select className={inp} value={otForm.type} onChange={e => setOTForm(f => ({ ...f, type: e.target.value }))} required>
                    {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{MAINTENANCE_LABELS[t]}</option>)}
                  </select>
                </Field>
                <Field label="Priorité">
                  <select className={inp} value={otForm.priorite} onChange={e => setOTForm(f => ({ ...f, priorite: e.target.value as OTPriorite }))}>
                    {(Object.keys(OT_PRIORITE_LABELS) as OTPriorite[]).map(p => <option key={p} value={p}>{OT_PRIORITE_LABELS[p]}</option>)}
                  </select>
                </Field>
                <Field label="Statut initial">
                  <select className={inp} value={otForm.statut} onChange={e => setOTForm(f => ({ ...f, statut: e.target.value as OTStatut }))}>
                    {(Object.keys(OT_STATUT_LABELS) as OTStatut[]).map(s => <option key={s} value={s}>{OT_STATUT_LABELS[s]}</option>)}
                  </select>
                </Field>
                <Field label="Mécanicien assigné">
                  <select className={inp} value={otForm.mecanicien} onChange={e => setOTForm(f => ({ ...f, mecanicien: e.target.value }))}>
                    {MECANICIENS_DEMO.map(m => <option key={m} value={m}>{m || '— Non assigné'}</option>)}
                  </select>
                </Field>
                <Field label="Date d'ouverture">
                  <input className={inp} type="date" value={otForm.date_ouverture} onChange={e => setOTForm(f => ({ ...f, date_ouverture: e.target.value }))} />
                </Field>
                <Field label="Kilométrage">
                  <input className={inp} value={otForm.kilometrage} onChange={e => setOTForm(f => ({ ...f, kilometrage: e.target.value }))} placeholder="Ex: 485 000 km" />
                </Field>
                <div className="col-span-2">
                  <Field label="Description du travail *">
                    <textarea className={`${inp} resize-none h-20`} value={otForm.description} onChange={e => setOTForm(f => ({ ...f, description: e.target.value }))} placeholder="Décrivez le problème ou l'intervention à réaliser..." required />
                  </Field>
                </div>
                <Field label="Pièces à utiliser">
                  <input className={inp} value={otForm.pieces_utilisees} onChange={e => setOTForm(f => ({ ...f, pieces_utilisees: e.target.value }))} placeholder="Ex: FH-OM-001 x1, PLQ-AV-UNIV x2..." />
                </Field>
                <Field label="Coût HT estimé (€)">
                  <input className={inp} type="number" step="0.01" value={otForm.cout_ht} onChange={e => setOTForm(f => ({ ...f, cout_ht: e.target.value }))} placeholder="0.00" />
                </Field>
                <Field label="Garage / Sous-traitant">
                  <input className={inp} value={otForm.garage} onChange={e => setOTForm(f => ({ ...f, garage: e.target.value }))} placeholder="Si prestation extérieure" />
                </Field>
                <Field label="Prochaine échéance">
                  <input className={inp} type="date" value={otForm.next_due_date} onChange={e => setOTForm(f => ({ ...f, next_due_date: e.target.value }))} />
                </Field>
              </div>
              <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
                <button type="button" onClick={() => setShowOTForm(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
                <button type="submit" className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">Créer l'OT</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
