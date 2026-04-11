import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/lib/database.types'
import { buildStaffDirectory, staffDisplayName } from '@/lib/staffDirectory'

// ── Types DB ─────────────────────────────────────────────────────────────────
type Vehicule = Tables<'vehicules'>
type Remorque = Tables<'remorques'>
type FlotteEntretien = Tables<'flotte_entretiens'>
type FlotteDocument = Tables<'flotte_documents'>
type FlotteAlerte = Tables<'vue_alertes_flotte'>

// Extended type for entretiens with new fields (mecanicien_assign, priority, statut GMAO)
type FlotteEntretienEtendu = FlotteEntretien & {
  mecanicien_assign?: string | null
  priority?: 'urgente' | 'haute' | 'normale' | 'planifiee'
  statut?: 'planifie' | 'en_cours' | 'en_attente_pieces' | 'cloture' | 'annule'
  date_debut_reelle?: string | null
  date_fin_reelle?: string | null
}

// ── Types DB GMAO Phase 2 ─────────────────────────────────────────────────────
type StockPiece = {
  id: string; reference: string; designation: string; categorie: string | null
  compatibilite: string | null; stock_actuel: number; stock_minimum: number
  prix_unitaire_ht: number | null; fournisseur_nom: string | null; emplacement: string | null
  created_at: string; updated_at: string
}

type FournisseurMaint = {
  id: string; nom: string; type_service: string | null; contact_nom: string | null
  telephone: string | null; email: string | null; delai_livraison: string | null
  conditions_paiement: string | null; note_qualite: number | null; notes: string | null
  created_at: string; updated_at: string
}

// ── Types métier (in-memory) ──────────────────────────────────────────────────
type OTPriorite = 'urgente' | 'haute' | 'normale' | 'planifiee'
type OTStatut = 'planifie' | 'en_cours' | 'en_attente_pieces' | 'cloture' | 'annule'

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

type MaintenanceIndexEntry = {
  id: string
  marque: string
  modele: string
  motorisation: string | null
  maintenance_type: string
  periodicite_km: number | null
  periodicite_mois: number | null
  huile_moteur_l: number | null
  huile_boite_l: number | null
  huile_pont_l: number | null
  liquide_frein_l: number | null
  pieces_reference: string | null
  source_constructeur: string | null
  notes: string | null
  derniere_veille_mois: string | null
  created_at: string
  updated_at: string
}

type IndexAlertStatus = 'preventif' | 'depasse' | 'ok' | 'a_initialiser'

type IndexVehiculeAlerte = {
  vehiculeId: string
  immatriculation: string
  modele: string
  motorisation: string
  maintenanceType: string
  status: IndexAlertStatus
  kmRestants: number | null
  joursRestants: number | null
  periodicite_km: number | null
  periodicite_mois: number | null
  prochaineEcheanceDate: string | null
  prochaineEcheanceKm: number | null
  source: string
  lastServiceDate: string | null
}

type AlertSettings = {
  preventifKm: number
  preventifJours: number
  toleranceDepasseKm: number
  toleranceDepasseJours: number
}

type Tab = 'dashboard' | 'ot' | 'planning' | 'programmesmeca' | 'stock' | 'fournisseurs' | 'index' | 'alertes' | 'reglages' | 'couts'

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
  planifie:            'bg-yellow-100 text-yellow-700',
  en_cours:            'bg-blue-100 text-blue-700',
  en_attente_pieces:   'bg-orange-100 text-orange-700',
  cloture:             'bg-green-100 text-green-700',
  annule:              'bg-slate-100 text-slate-600',
}
const OT_STATUT_LABELS: Record<OTStatut, string> = {
  planifie: 'Planifié', en_cours: 'En cours', en_attente_pieces: 'Att. pièces', cloture: 'Clôturé', annule: 'Annulé',
}

const TYPE_FOURNISSEUR_LABELS: Record<string, string> = {
  garage: 'Garage', pieces: 'Pièces détachées', pneus: 'Pneumatiques',
  lubrifiant: 'Lubrifiants', concessionnaire: 'Concessionnaire', autre: 'Autre',
}

// Mapping UI Fournisseur.type ↔ DB fournisseurs_maintenance.type_service
const TYPE_SERVICE_MAP: Record<string, string> = {
  garage: 'garage', pieces: 'piece', pneus: 'pneumatique',
  lubrifiant: 'lubrifiant', concessionnaire: 'concessionnaire', autre: 'autre',
}
const TYPE_SERVICE_REVERSE: Record<string, Fournisseur['type']> = {
  garage: 'garage', piece: 'pieces', pneumatique: 'pneus',
  lubrifiant: 'lubrifiant', concessionnaire: 'concessionnaire', autre: 'autre',
}

const MAINTENANCE_INDEX_STORAGE_KEY = 'nexora_maintenance_index_v2'
const MAINTENANCE_ALERT_SETTINGS_STORAGE_KEY = 'nexora_maintenance_alert_settings_v1'
const MAINTENANCE_INDEX_LAST_SYNC_KEY = 'nexora_maintenance_index_last_sync_v1'

type ConstructeurModele = {
  marque: string
  modele: string
  motorisations: string[]
  huile_moteur_l: number
  huile_boite_l: number
  huile_pont_l: number
  liquide_frein_l: number
}

const CONSTRUCTEUR_SOURCES: Record<string, string> = {
  Scania: 'Scania RMI Portal + Technical Information Shop (TIS) - https://www.scania.com/',
  Volvo: 'Volvo Trucks Service & Technical Information (RMI) - https://www.volvotrucks.com/',
  DAF: 'DAF RMI via Paccar.net (independent operators) - https://www.paccar.net/',
  Iveco: 'IVECO Repair maintenance information / Tech Information - https://www.iveco.com/',
  Renault: 'Renault Trucks Repair and Maintenance Information - https://www.renault-trucks.com/',
  Mercedes: 'Mercedes-Benz Trucks Service Information (RMI) - https://www.mercedes-benz-trucks.com/',
  MAN: 'MAN Service Portal (RMI) - https://www.man.eu/',
}

const MAINTENANCE_MULTI_MARQUES_SOURCES = [
  'TecAlliance / TecRMI Truck - https://www.tecalliance.net/',
  'HaynesPro Truck (OEM-based) - https://www.haynespro.com/',
] as const

const CONSTRUCTEUR_MODELES: ConstructeurModele[] = [
  { marque: 'Scania', modele: 'Scania R', motorisations: ['DC13 460', 'DC13 500'], huile_moteur_l: 35, huile_boite_l: 14, huile_pont_l: 21, liquide_frein_l: 2 },
  { marque: 'Scania', modele: 'Scania S', motorisations: ['DC13 500', 'DC13 560'], huile_moteur_l: 36, huile_boite_l: 14, huile_pont_l: 21, liquide_frein_l: 2 },
  { marque: 'Volvo', modele: 'Volvo FH', motorisations: ['D13K 460', 'D13K 500'], huile_moteur_l: 36, huile_boite_l: 13, huile_pont_l: 22, liquide_frein_l: 2 },
  { marque: 'Volvo', modele: 'Volvo FM', motorisations: ['D11K 430', 'D13K 460'], huile_moteur_l: 34, huile_boite_l: 13, huile_pont_l: 21, liquide_frein_l: 2 },
  { marque: 'DAF', modele: 'DAF XF', motorisations: ['MX-13 480', 'MX-13 530'], huile_moteur_l: 34, huile_boite_l: 14, huile_pont_l: 21, liquide_frein_l: 2 },
  { marque: 'DAF', modele: 'DAF XG', motorisations: ['MX-13 480', 'MX-13 530'], huile_moteur_l: 34, huile_boite_l: 14, huile_pont_l: 21, liquide_frein_l: 2 },
  { marque: 'Iveco', modele: 'Iveco S-Way', motorisations: ['Cursor 11 460', 'Cursor 13 530'], huile_moteur_l: 32, huile_boite_l: 13, huile_pont_l: 20, liquide_frein_l: 2 },
  { marque: 'Renault', modele: 'Renault Trucks T', motorisations: ['DTI 13 480', 'DTI 13 520'], huile_moteur_l: 33, huile_boite_l: 12, huile_pont_l: 20, liquide_frein_l: 2 },
  { marque: 'Mercedes', modele: 'Mercedes Actros', motorisations: ['OM 471 480', 'OM 471 530'], huile_moteur_l: 40, huile_boite_l: 15, huile_pont_l: 23, liquide_frein_l: 2 },
  { marque: 'MAN', modele: 'MAN TGX', motorisations: ['D26 470', 'D26 510'], huile_moteur_l: 35, huile_boite_l: 14, huile_pont_l: 22, liquide_frein_l: 2 },
]

function buildConstructeurIndexPresets() {
  const maintenancePrograms: Array<{
    maintenance_type: string
    periodicite_km: number | null
    periodicite_mois: number | null
    pieces_builder: (modele: ConstructeurModele) => string
  }> = [
    {
      maintenance_type: 'vidange',
      periodicite_km: 60000,
      periodicite_mois: 12,
      pieces_builder: modele => `FIL-HUI-${modele.modele.toUpperCase().replace(/[^A-Z0-9]+/g, '-')} x1 piece; HUI-MOT-${modele.marque.toUpperCase()} ${modele.huile_moteur_l} litre; JOINT-BOUCHON x1 piece`,
    },
    {
      maintenance_type: 'revision',
      periodicite_km: 120000,
      periodicite_mois: 24,
      pieces_builder: modele => `FIL-AIR-${modele.marque.toUpperCase()} x1 piece; FIL-CARB-${modele.marque.toUpperCase()} x1 piece; HUI-BOITE ${modele.huile_boite_l} litre; HUI-PONT ${modele.huile_pont_l} litre`,
    },
    {
      maintenance_type: 'freinage',
      periodicite_km: 90000,
      periodicite_mois: 18,
      pieces_builder: modele => `PLAQUETTES-AV x1 kit; PLAQUETTES-AR x1 kit; LIQ-FREIN DOT4 ${modele.liquide_frein_l} litre`,
    },
    {
      maintenance_type: 'tachygraphe',
      periodicite_km: null,
      periodicite_mois: 24,
      pieces_builder: () => `ETALONNAGE-TACHY x1 prestation; KIT-SCELLE x1 piece`,
    },
    {
      maintenance_type: 'controle_technique',
      periodicite_km: null,
      periodicite_mois: 12,
      pieces_builder: () => `VISITE-TECHNIQUE x1 prestation`,
    },
  ]

  const presets: Omit<MaintenanceIndexEntry, 'id' | 'created_at' | 'updated_at' | 'derniere_veille_mois'>[] = []

  CONSTRUCTEUR_MODELES.forEach(modele => {
    modele.motorisations.forEach(motorisation => {
      maintenancePrograms.forEach(program => {
        presets.push({
          marque: modele.marque,
          modele: modele.modele,
          motorisation,
          maintenance_type: program.maintenance_type,
          periodicite_km: program.periodicite_km,
          periodicite_mois: program.periodicite_mois,
          huile_moteur_l: modele.huile_moteur_l,
          huile_boite_l: modele.huile_boite_l,
          huile_pont_l: modele.huile_pont_l,
          liquide_frein_l: modele.liquide_frein_l,
          pieces_reference: program.pieces_builder(modele),
          source_constructeur: CONSTRUCTEUR_SOURCES[modele.marque] ?? null,
          notes: `Source RMI ${modele.marque} + verification atelier hebdomadaire. Toujours valider selon VIN et plan constructeur.`,
        })
      })
    })
  })

  return presets
}

const CONSTRUCTEUR_INDEX_PRESETS = buildConstructeurIndexPresets()


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
const inp = 'w-full rounded-lg border bg-[color:var(--surface)] px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary-soft)]'
const fmtEur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'
const daysDiff = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
const normalizeText = (value: string | null | undefined) => (value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

function extractMarqueFromModele(modele: string) {
  const cleaned = modele.trim()
  if (!cleaned) return 'Inconnue'
  const firstToken = cleaned.split(' ')[0] ?? 'Inconnue'
  if (/mercedes/i.test(cleaned)) return 'Mercedes'
  if (/renault/i.test(cleaned)) return 'Renault'
  return firstToken
}

function inferVehiculeMotorisation(v: Vehicule) {
  const candidate = [v.notes, v.preferences, v.modele].filter(Boolean).join(' ')
  const normalized = normalizeText(candidate)
  if (!normalized) return 'standard'

  const knownPatterns = [
    'om 471', 'om471', 'om 470', 'om470', 'dc13', 'd13', 'd12', 'cursor 13', 'mx-13', 'mx13', 'xpi', '13l', '11l', '500', '460', '520',
  ]
  const found = knownPatterns.find(pattern => normalized.includes(pattern.replace(/\s+/g, '')) || normalized.includes(pattern))
  if (found) return found.toUpperCase().replace(/\s+/g, ' ')
  return 'standard'
}

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
    { key: 'dashboard',      label: 'Vue d\'ensemble' },
    { key: 'ot',             label: 'Ordres de travaux' },
    { key: 'planning',       label: 'Planification' },
    { key: 'programmesmeca', label: 'Programmes Mécaniciens' },
    { key: 'stock',          label: 'Pièces & Stock' },
    { key: 'fournisseurs',   label: 'Fournisseurs' },
    { key: 'index',          label: 'Index entretien' },
    { key: 'alertes',        label: 'Alertes atelier' },
    { key: 'reglages',       label: 'Réglage alertes' },
    { key: 'couts',          label: 'Coûts & Analyses' },
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

function extractErrorMessage(err: unknown) {
  if (err instanceof Error && err.message) return err.message
  if (err && typeof err === 'object') {
    const candidate = err as { message?: unknown; error_description?: unknown; details?: unknown }
    if (typeof candidate.message === 'string' && candidate.message) return candidate.message
    if (typeof candidate.error_description === 'string' && candidate.error_description) return candidate.error_description
    if (typeof candidate.details === 'string' && candidate.details) return candidate.details
  }
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return ''
  }
}

function isMissingOptionalMaintenanceFeature(err: unknown) {
  const normalized = extractErrorMessage(err).toLowerCase()
  return (
    normalized.includes('flotte_entretiens')
    || normalized.includes('flotte_documents')
    || normalized.includes('vue_alertes_flotte')
    || normalized.includes('vue_couts_flotte_mensuels')
    || normalized.includes('stock_pieces')
    || normalized.includes('fournisseurs_maintenance')
    || normalized.includes('mouvements_stock')
    || normalized.includes('programmes_maintenance_constructeur')
    || normalized.includes('does not exist')
    || normalized.includes('could not find the table')
    || normalized.includes('pgrst205')
    || normalized.includes('42p01')
  )
}

function maintenanceError(err: unknown) {
  const msg = extractErrorMessage(err)
  if (msg.includes('flotte_') || msg.includes('vue_alertes') || msg.includes('stock_pieces') || msg.includes('fournisseurs_maintenance')) {
    return 'Migration Supabase GMAO requise. Exécutez les migrations pour activer cette fonctionnalité.'
  }
  if (msg.includes('Bucket')) return 'Bucket Supabase `flotte-documents` introuvable.'
  return msg || 'Erreur inconnue.'
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function Maintenance() {
  const { role, profil, accountProfil } = useAuth()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [alerteVue, setAlerteVue] = useState<'vehicules' | 'tableau'>('vehicules')

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
  const isMecanicien = role === 'mecanicien'
  const staff = useMemo(() => buildStaffDirectory([profil, accountProfil]), [profil, accountProfil])

  // ── État OT (in-memory) ─────────────────────────────────────────────────────
  const [ots, setOts] = useState<OT[]>([])
  const [showOTForm, setShowOTForm] = useState(false)
  const [filterOTStatut, setFilterOTStatut] = useState<OTStatut | 'tous'>('tous')
  const [filterOTVehicule, setFilterOTVehicule] = useState('')
  const [otForm, setOTForm] = useState({
    vehicule_id: '', remorque_id: '', type: 'reparation', priorite: 'normale' as OTPriorite,
    statut: 'planifie' as OTStatut, mecanicien: '', description: '', date_ouverture: new Date().toISOString().slice(0, 10),
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
  const [indexEntries, setIndexEntries] = useState<MaintenanceIndexEntry[]>([])
  const [indexEditingId, setIndexEditingId] = useState<string | null>(null)
  const [indexLastSyncAt, setIndexLastSyncAt] = useState<string | null>(null)
  const [indexFilterMarque, setIndexFilterMarque] = useState('toutes')
  const [indexFilterModele, setIndexFilterModele] = useState('tous')
  const [indexFilterMotorisation, setIndexFilterMotorisation] = useState('toutes')
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    preventifKm: 5000,
    preventifJours: 30,
    toleranceDepasseKm: 0,
    toleranceDepasseJours: 0,
  })
  const [indexForm, setIndexForm] = useState({
    marque: 'Scania',
    modele: '',
    motorisation: '*',
    maintenance_type: 'vidange',
    periodicite_km: '',
    periodicite_mois: '',
    huile_moteur_l: '',
    huile_boite_l: '',
    huile_pont_l: '',
    liquide_frein_l: '',
    pieces_reference: '',
    source_constructeur: '',
    notes: '',
  })

  function parseNullableNumber(value: string) {
    const normalized = value.trim().replace(',', '.')
    if (!normalized) return null
    const parsed = Number.parseFloat(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }

  function resetIndexForm() {
    setIndexEditingId(null)
    setIndexForm({
      marque: 'Scania',
      modele: '',
      motorisation: '*',
      maintenance_type: 'vidange',
      periodicite_km: '',
      periodicite_mois: '',
      huile_moteur_l: '',
      huile_boite_l: '',
      huile_pont_l: '',
      liquide_frein_l: '',
      pieces_reference: '',
      source_constructeur: '',
      notes: '',
    })
  }

  function startEditIndex(entry: MaintenanceIndexEntry) {
    setIndexEditingId(entry.id)
    setIndexForm({
      marque: entry.marque,
      modele: entry.modele,
      motorisation: entry.motorisation ?? '*',
      maintenance_type: entry.maintenance_type,
      periodicite_km: entry.periodicite_km === null ? '' : String(entry.periodicite_km),
      periodicite_mois: entry.periodicite_mois === null ? '' : String(entry.periodicite_mois),
      huile_moteur_l: entry.huile_moteur_l === null ? '' : String(entry.huile_moteur_l),
      huile_boite_l: entry.huile_boite_l === null ? '' : String(entry.huile_boite_l),
      huile_pont_l: entry.huile_pont_l === null ? '' : String(entry.huile_pont_l),
      liquide_frein_l: entry.liquide_frein_l === null ? '' : String(entry.liquide_frein_l),
      pieces_reference: entry.pieces_reference ?? '',
      source_constructeur: entry.source_constructeur ?? '',
      notes: entry.notes ?? '',
    })
  }

  function saveIndexEntry(e: React.FormEvent) {
    e.preventDefault()
    const modele = indexForm.modele.trim()
    if (!modele) {
      setNotice('Le modele est obligatoire pour enregistrer un index.')
      return
    }

    const nowIso = new Date().toISOString()
    const next: MaintenanceIndexEntry = {
      id: indexEditingId ?? `idx-${Date.now()}`,
      marque: indexForm.marque.trim() || extractMarqueFromModele(modele),
      modele,
      motorisation: indexForm.motorisation.trim() || '*',
      maintenance_type: indexForm.maintenance_type,
      periodicite_km: parseNullableNumber(indexForm.periodicite_km),
      periodicite_mois: parseNullableNumber(indexForm.periodicite_mois),
      huile_moteur_l: parseNullableNumber(indexForm.huile_moteur_l),
      huile_boite_l: parseNullableNumber(indexForm.huile_boite_l),
      huile_pont_l: parseNullableNumber(indexForm.huile_pont_l),
      liquide_frein_l: parseNullableNumber(indexForm.liquide_frein_l),
      pieces_reference: indexForm.pieces_reference.trim() || null,
      source_constructeur: indexForm.source_constructeur.trim() || null,
      notes: indexForm.notes.trim() || null,
      derniere_veille_mois: null,
      created_at: nowIso,
      updated_at: nowIso,
    }

    setIndexEntries(prev => {
      if (indexEditingId) {
        return prev.map(item => item.id === indexEditingId ? { ...next, created_at: item.created_at, derniere_veille_mois: item.derniere_veille_mois } : item)
      }
      return [next, ...prev]
    })

    setNotice(indexEditingId ? 'Index entretien mis a jour.' : 'Index entretien ajoute.')
    resetIndexForm()
  }

  function deleteIndexEntry(id: string) {
    if (!confirm('Supprimer cet index entretien ?')) return
    setIndexEntries(prev => prev.filter(item => item.id !== id))
    if (indexEditingId === id) resetIndexForm()
    setNotice('Index entretien supprime.')
  }

  function markIndexReviewed(id: string, month: string) {
    setIndexEntries(prev => prev.map(item => item.id === id ? { ...item, derniere_veille_mois: month, updated_at: new Date().toISOString() } : item))
    setNotice('Veille mensuelle marquee pour cet index.')
  }

  function loadConstructeurIndexPresets() {
    syncConstructeurIndex(true)
  }

  function syncConstructeurIndex(force = false) {
    const now = new Date()
    const lastSyncRaw = localStorage.getItem(MAINTENANCE_INDEX_LAST_SYNC_KEY)
    const lastSyncDate = lastSyncRaw ? new Date(lastSyncRaw) : null
    const isWeeklyDue = !lastSyncDate || Number.isNaN(lastSyncDate.getTime()) || (now.getTime() - lastSyncDate.getTime()) >= 7 * 24 * 60 * 60 * 1000

    if (!force && !isWeeklyDue) return

    const nowIso = new Date().toISOString()
    let added = 0

    setIndexEntries(prev => {
      const next = [...prev]
      CONSTRUCTEUR_INDEX_PRESETS.forEach(preset => {
        const exists = next.some(item =>
          normalizeText(item.marque) === normalizeText(preset.marque)
          && normalizeText(item.modele) === normalizeText(preset.modele)
          && normalizeText(item.motorisation ?? '*') === normalizeText(preset.motorisation ?? '*')
          && item.maintenance_type === preset.maintenance_type,
        )
        if (exists) return

        next.push({
          id: `idx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created_at: nowIso,
          updated_at: nowIso,
          derniere_veille_mois: null,
          ...preset,
        })
        added += 1
      })
      return next
    })

    localStorage.setItem(MAINTENANCE_INDEX_LAST_SYNC_KEY, nowIso)
    setIndexLastSyncAt(nowIso)

    if (force) {
      setNotice(added > 0
        ? `${added} index constructeur(s) ajoutes. Base mecanicien mise a jour.`
        : 'Base constructeur deja a jour.')
    }
  }

  function applyAlertPresetFromIndex() {
    const kmValues = indexEntries.map(item => item.periodicite_km).filter((value): value is number => typeof value === 'number' && value > 0)
    const monthValues = indexEntries.map(item => item.periodicite_mois).filter((value): value is number => typeof value === 'number' && value > 0)

    if (kmValues.length === 0 && monthValues.length === 0) {
      setNotice('Impossible de pre-regler: aucun index periodique renseigne.')
      return
    }

    const minKm = kmValues.length > 0 ? Math.min(...kmValues) : 30000
    const minMois = monthValues.length > 0 ? Math.min(...monthValues) : 6

    setAlertSettings({
      preventifKm: Math.max(1000, Math.round(minKm * 0.15)),
      preventifJours: Math.max(7, Math.round(minMois * 30 * 0.15)),
      toleranceDepasseKm: 0,
      toleranceDepasseJours: 0,
    })
    setNotice('Reglage preventif ajuste automatiquement selon les index atelier.')
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MAINTENANCE_INDEX_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as MaintenanceIndexEntry[]
      if (Array.isArray(parsed)) {
        setIndexEntries(parsed.map(item => ({
          ...item,
          marque: item.marque ?? extractMarqueFromModele(item.modele),
          motorisation: item.motorisation ?? '*',
          pieces_reference: item.pieces_reference ?? null,
          source_constructeur: item.source_constructeur ?? null,
        })))
      }
    } catch {
      setIndexEntries([])
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(MAINTENANCE_INDEX_STORAGE_KEY, JSON.stringify(indexEntries))
  }, [indexEntries])

  useEffect(() => {
    const raw = localStorage.getItem(MAINTENANCE_INDEX_LAST_SYNC_KEY)
    if (raw) setIndexLastSyncAt(raw)
    syncConstructeurIndex(false)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MAINTENANCE_ALERT_SETTINGS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<AlertSettings>
      setAlertSettings(current => ({
        ...current,
        preventifKm: Number.isFinite(parsed.preventifKm) ? Number(parsed.preventifKm) : current.preventifKm,
        preventifJours: Number.isFinite(parsed.preventifJours) ? Number(parsed.preventifJours) : current.preventifJours,
        toleranceDepasseKm: Number.isFinite(parsed.toleranceDepasseKm) ? Number(parsed.toleranceDepasseKm) : current.toleranceDepasseKm,
        toleranceDepasseJours: Number.isFinite(parsed.toleranceDepasseJours) ? Number(parsed.toleranceDepasseJours) : current.toleranceDepasseJours,
      }))
    } catch {
      // garde les valeurs par defaut
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(MAINTENANCE_ALERT_SETTINGS_STORAGE_KEY, JSON.stringify(alertSettings))
  }, [alertSettings])

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
      if (eRes.error) {
        if (isMissingOptionalMaintenanceFeature(eRes.error)) setEntretiens([])
        else throw eRes.error
      } else {
        setEntretiens(eRes.data ?? [])
      }

      if (dRes.error) {
        if (isMissingOptionalMaintenanceFeature(dRes.error)) setDocuments([])
        else throw dRes.error
      } else {
        setDocuments(dRes.data ?? [])
      }

      if (aRes.error) {
        if (isMissingOptionalMaintenanceFeature(aRes.error)) setAlerts([])
        else throw aRes.error
      } else {
        setAlerts(aRes.data ?? [])
      }

      // ── Charger le stock pièces depuis DB ──────────────────────────────────────────────
      const spRes = await (supabase as any).from('stock_pieces').select('*').order('designation')
      if (spRes.error) {
        if (!isMissingOptionalMaintenanceFeature(spRes.error)) console.warn('stock_pieces:', spRes.error.message)
        // Garde les SEED_PIECES en fallback
      } else if (spRes.data && spRes.data.length > 0) {
        setPieces((spRes.data as StockPiece[]).map(sp => ({
          id: sp.id, reference: sp.reference, designation: sp.designation,
          compatibilite: sp.compatibilite ?? '', quantite: sp.stock_actuel,
          quantite_min: sp.stock_minimum, prix_unitaire: Number(sp.prix_unitaire_ht ?? 0),
          fournisseur: sp.fournisseur_nom ?? '', emplacement: sp.emplacement ?? '', last_cmd: null,
        })))
      }

      // ── Charger les fournisseurs depuis DB ───────────────────────────────────────────
      const fmRes = await (supabase as any).from('fournisseurs_maintenance').select('*').order('nom')
      if (fmRes.error) {
        if (!isMissingOptionalMaintenanceFeature(fmRes.error)) console.warn('fournisseurs_maintenance:', fmRes.error.message)
        // Garde SEED_FOURNISSEURS en fallback
      } else if (fmRes.data && fmRes.data.length > 0) {
        setFournisseurs((fmRes.data as FournisseurMaint[]).map(f => ({
          id: f.id, nom: f.nom,
          type: (TYPE_SERVICE_REVERSE[f.type_service ?? ''] ?? 'autre') as Fournisseur['type'],
          contact: f.contact_nom ?? '', telephone: f.telephone ?? '', email: f.email ?? '',
          delai_livraison: f.delai_livraison ?? '', conditions: f.conditions_paiement ?? '',
          note: f.note_qualite ?? 3,
        })))
      }

      // ── Reconstruire OTs actifs depuis flotte_entretiens ─────────────────────────────
      if (!eRes.error && eRes.data) {
        const activeRaw = eRes.data.filter(e => {
          const ee = e as FlotteEntretienEtendu
          return ee.statut === 'planifie' || ee.statut === 'en_cours' || ee.statut === 'en_attente_pieces'
        })
        setOts(activeRaw.map(e => {
          const ee = e as FlotteEntretienEtendu
          return {
            id: e.id,
            vehicule_id: e.vehicule_id,
            remorque_id: e.remorque_id,
            type: e.maintenance_type,
            priorite: ((ee.priority as OTPriorite | undefined) ?? 'normale') as OTPriorite,
            statut: ((ee.statut ?? 'planifie') as OTStatut),
            mecanicien: ee.mecanicien_assign ?? '',
            description: e.notes ?? '',
            date_ouverture: e.service_date,
            date_cloture: ee.date_fin_reelle ?? null,
            cout_ht: Number(e.cout_ht ?? 0),
            prestataire: e.prestataire,
            garage: e.garage,
            pieces_utilisees: '',
            kilometrage: e.km_compteur?.toString() ?? '',
          }
        }))
      }
    } catch (err) {
      if (!isMissingOptionalMaintenanceFeature(err)) {
        setDbError(maintenanceError(err))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    if (!isMecanicien && showOTForm) {
      setShowOTForm(false)
    }
  }, [isMecanicien, showOTForm])

  const mecanicienOptions = useMemo(() => {
    const names = Array.from(new Set(
      staff
        .filter(member => member.role === 'mecanicien')
        .map(member => staffDisplayName(member))
        .filter(Boolean),
    )).sort((a, b) => a.localeCompare(b, 'fr'))
    return ['' as string, ...names]
  }, [staff])

  // ── Programmes par mécanicien ──────────────────────────────────────────────
  const mecaniciensProgrammes = useMemo(() => {
    const mecaniciens = new Map<string, FlotteEntretienEtendu[]>()
    ;(entretiens as FlotteEntretienEtendu[]).forEach(e => {
      const assignee = e.mecanicien_assign || 'Non assigné'
      if (!mecaniciens.has(assignee)) {
        mecaniciens.set(assignee, [])
      }
      mecaniciens.get(assignee)!.push(e)
    })
    return Array.from(mecaniciens.entries())
      .map(([name, tasks]) => ({
        name,
        tasks: tasks.sort((a, b) => new Date(b.next_due_date || b.service_date).getTime() - new Date(a.next_due_date || a.service_date).getTime()),
        urgent: tasks.filter(t => {
          const days = daysDiff(t.next_due_date || t.service_date)
          return days < 0 || days <= 7
        }).length,
        totalCount: tasks.length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [entretiens])

  // ── Helpers lookup ──────────────────────────────────────────────────────────
  const vehiculeLabel = useCallback((id: string | null) => id ? (vehicules.find(v => v.id === id)?.immatriculation ?? 'Véhicule') : null, [vehicules])
  const remorqueLabel = useCallback((id: string | null) => id ? (remorques.find(r => r.id === id)?.immatriculation ?? 'Remorque') : null, [remorques])
  const assetLabel = (e: FlotteEntretien) => vehiculeLabel(e.vehicule_id) ?? remorqueLabel(e.remorque_id) ?? 'Parc'

  // ── Computed agregats ───────────────────────────────────────────────────────
  const now = new Date()
  const currentYear = now.getFullYear()
  const yearStr = String(now.getFullYear())
  const monthStr = `${yearStr}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const indexCatalogueMarques = useMemo(() => {
    return Array.from(new Set(CONSTRUCTEUR_MODELES.map(item => item.marque))).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [])

  const indexCatalogueModeles = useMemo(() => {
    return Array.from(new Set(
      CONSTRUCTEUR_MODELES
        .filter(item => item.marque === indexForm.marque)
        .map(item => item.modele),
    )).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [indexForm.marque])

  const indexCatalogueMotorisations = useMemo(() => {
    const model = CONSTRUCTEUR_MODELES.find(item => item.marque === indexForm.marque && item.modele === indexForm.modele)
    if (!model) return ['*']
    return ['*', ...model.motorisations]
  }, [indexForm.marque, indexForm.modele])

  const maintenanceByModeleType = useMemo(() => {
    const vehicleToModel = new Map<string, string>()
    vehicules.forEach(v => {
      const model = `${v.marque ?? ''} ${v.modele ?? ''}`.trim() || v.immatriculation
      vehicleToModel.set(v.id, model)
    })

    const countMap: Record<string, number> = {}
    entretiens.forEach(e => {
      if (!e.vehicule_id) return
      const model = vehicleToModel.get(e.vehicule_id)
      if (!model) return
      const key = `${model}__${e.maintenance_type}`
      countMap[key] = (countMap[key] ?? 0) + 1
    })

    return Object.entries(countMap)
      .map(([key, count]) => {
        const [modele, maintenance_type] = key.split('__')
        return { modele, maintenance_type, count }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [entretiens, vehicules])

  const indexVeilleMois = useMemo(() => {
    return indexEntries.filter(entry => entry.derniere_veille_mois !== monthStr)
  }, [indexEntries, monthStr])

  const indexMarques = useMemo(() => {
    return Array.from(new Set(indexEntries.map(entry => entry.marque || extractMarqueFromModele(entry.modele)))).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [indexEntries])

  const indexModelesFiltres = useMemo(() => {
    return Array.from(new Set(
      indexEntries
        .filter(entry => indexFilterMarque === 'toutes' || (entry.marque || extractMarqueFromModele(entry.modele)) === indexFilterMarque)
        .map(entry => entry.modele),
    )).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [indexEntries, indexFilterMarque])

  const indexMotorisationsFiltrees = useMemo(() => {
    return Array.from(new Set(
      indexEntries
        .filter(entry => indexFilterMarque === 'toutes' || extractMarqueFromModele(entry.modele) === indexFilterMarque)
        .filter(entry => indexFilterModele === 'tous' || entry.modele === indexFilterModele)
        .map(entry => entry.motorisation ?? '*'),
    )).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [indexEntries, indexFilterMarque, indexFilterModele])

  const filteredIndexEntries = useMemo(() => {
    return indexEntries.filter(entry => {
      const marque = entry.marque || extractMarqueFromModele(entry.modele)
      const marqueOk = indexFilterMarque === 'toutes' || marque === indexFilterMarque
      const modeleOk = indexFilterModele === 'tous' || entry.modele === indexFilterModele
      const motorisationOk = indexFilterMotorisation === 'toutes' || (entry.motorisation ?? '*') === indexFilterMotorisation
      return marqueOk && modeleOk && motorisationOk
    })
  }, [indexEntries, indexFilterMarque, indexFilterModele, indexFilterMotorisation])

  const constructeurRemontees = useMemo(() => {
    const grouped = new Map<string, { constructeur: string; rules: number; modeles: Set<string>; source: string | null }>()

    indexEntries.forEach(entry => {
      const constructeur = entry.marque || extractMarqueFromModele(entry.modele)
      const existing = grouped.get(constructeur)
      if (!existing) {
        grouped.set(constructeur, {
          constructeur,
          rules: 1,
          modeles: new Set([entry.modele]),
          source: entry.source_constructeur,
        })
        return
      }

      existing.rules += 1
      existing.modeles.add(entry.modele)
      if (!existing.source && entry.source_constructeur) existing.source = entry.source_constructeur
    })

    return Array.from(grouped.values())
      .map(item => ({ ...item, modelesCount: item.modeles.size }))
      .sort((a, b) => a.constructeur.localeCompare(b.constructeur, 'fr'))
  }, [indexEntries])

  const vehiculeDescriptors = useMemo(() => {
    return vehicules.map(v => {
      const modele = `${v.marque ?? ''} ${v.modele ?? ''}`.trim() || v.immatriculation
      return {
        id: v.id,
        immatriculation: v.immatriculation,
        modele,
        motorisation: inferVehiculeMotorisation(v),
        kmActuel: v.km_actuel,
      }
    })
  }, [vehicules])

  const indexAlertesVehicules = useMemo<IndexVehiculeAlerte[]>(() => {
    const today = new Date()
    const byVehicule: Record<string, FlotteEntretien[]> = {}
    entretiens.forEach(item => {
      if (!item.vehicule_id) return
      byVehicule[item.vehicule_id] = byVehicule[item.vehicule_id] ?? []
      byVehicule[item.vehicule_id].push(item)
    })

    const result: IndexVehiculeAlerte[] = []

    vehiculeDescriptors.forEach(v => {
      const reglesCompatibles = indexEntries.filter(entry => {
        const modeleOk = normalizeText(v.modele).includes(normalizeText(entry.modele)) || normalizeText(entry.modele).includes(normalizeText(v.modele))
        if (!modeleOk) return false

        const motorisationRegle = normalizeText(entry.motorisation ?? '*')
        const motorisationVehicule = normalizeText(v.motorisation)
        return motorisationRegle === '*' || !motorisationRegle || motorisationRegle === motorisationVehicule || motorisationVehicule.includes(motorisationRegle)
      })

      reglesCompatibles.forEach(regle => {
        const historique = (byVehicule[v.id] ?? [])
          .filter(item => item.maintenance_type === regle.maintenance_type)
          .sort((a, b) => +new Date(b.service_date) - +new Date(a.service_date))
        const last = historique[0]

        if (!last) {
          result.push({
            vehiculeId: v.id,
            immatriculation: v.immatriculation,
            modele: v.modele,
            motorisation: v.motorisation,
            maintenanceType: regle.maintenance_type,
            status: 'a_initialiser',
            kmRestants: null,
            joursRestants: null,
            periodicite_km: regle.periodicite_km,
            periodicite_mois: regle.periodicite_mois,
            prochaineEcheanceDate: null,
            prochaineEcheanceKm: null,
            source: regle.source_constructeur ?? 'index atelier',
            lastServiceDate: null,
          })
          return
        }

        const lastDate = new Date(last.service_date)
        const nextDate = regle.periodicite_mois ? new Date(lastDate.getTime() + regle.periodicite_mois * 30 * 86400000) : null
        const lastKm = last.km_compteur ?? null
        const nextKm = regle.periodicite_km && lastKm !== null ? lastKm + regle.periodicite_km : null
        const kmRestants = nextKm !== null && v.kmActuel !== null ? nextKm - v.kmActuel : null
        const joursRestants = nextDate ? Math.ceil((nextDate.getTime() - today.getTime()) / 86400000) : null

        const depasse = (kmRestants !== null && kmRestants <= -Math.abs(alertSettings.toleranceDepasseKm))
          || (joursRestants !== null && joursRestants <= -Math.abs(alertSettings.toleranceDepasseJours))
        const preventif = !depasse && (
          (kmRestants !== null && kmRestants <= Math.abs(alertSettings.preventifKm))
          || (joursRestants !== null && joursRestants <= Math.abs(alertSettings.preventifJours))
        )

        result.push({
          vehiculeId: v.id,
          immatriculation: v.immatriculation,
          modele: v.modele,
          motorisation: v.motorisation,
          maintenanceType: regle.maintenance_type,
          status: depasse ? 'depasse' : preventif ? 'preventif' : 'ok',
          kmRestants,
          joursRestants,
          periodicite_km: regle.periodicite_km,
          periodicite_mois: regle.periodicite_mois,
          prochaineEcheanceDate: nextDate ? nextDate.toISOString().slice(0, 10) : null,
          prochaineEcheanceKm: nextKm,
          source: regle.source_constructeur ?? 'index atelier',
          lastServiceDate: last.service_date,
        })
      })
    })

    return result.sort((a, b) => {
      const score = { depasse: 0, preventif: 1, a_initialiser: 2, ok: 3 }
      if (score[a.status] !== score[b.status]) return score[a.status] - score[b.status]
      return a.immatriculation.localeCompare(b.immatriculation, 'fr')
    })
  }, [vehiculeDescriptors, indexEntries, entretiens, alertSettings])

  const countAlertesDepassees = indexAlertesVehicules.filter(item => item.status === 'depasse').length
  const countAlertesPreventives = indexAlertesVehicules.filter(item => item.status === 'preventif').length
  const countAlertesAInitialiser = indexAlertesVehicules.filter(item => item.status === 'a_initialiser').length

  const alertesParVehicule = useMemo(() => {
    const map = new Map<string, { immatriculation: string; modele: string; motorisation: string; kmActuel: number | null; items: IndexVehiculeAlerte[] }>()
    const descMap = new Map(vehiculeDescriptors.map(v => [v.id, v]))
    indexAlertesVehicules.forEach(item => {
      if (!map.has(item.vehiculeId)) {
        const desc = descMap.get(item.vehiculeId)
        map.set(item.vehiculeId, { immatriculation: item.immatriculation, modele: item.modele, motorisation: item.motorisation, kmActuel: desc?.kmActuel ?? null, items: [] })
      }
      map.get(item.vehiculeId)!.items.push(item)
    })
    return Array.from(map.values()).sort((a, b) => {
      const worst = (items: IndexVehiculeAlerte[]) => Math.min(...items.map(i => ({ depasse: 0, preventif: 1, a_initialiser: 2, ok: 3 }[i.status])))
      return worst(a.items) - worst(b.items)
    })
  }, [indexAlertesVehicules, vehiculeDescriptors])

  const coutMois = useMemo(() => entretiens.filter(e => e.service_date.startsWith(monthStr)).reduce((s, e) => s + Number(e.cout_ht ?? 0), 0), [entretiens, monthStr])
  const coutAnnee = useMemo(() => entretiens.filter(e => e.service_date.startsWith(yearStr)).reduce((s, e) => s + Number(e.cout_ht ?? 0), 0), [entretiens, yearStr])

  // Disponibilité flotte
  const dispoPct = useMemo(() => {
    const total = vehicules.length
    if (!total) return 100
    const indispo = vehicules.filter(v => ['maintenance', 'hs'].includes(v.statut ?? '')).length
    return Math.round(((total - indispo) / total) * 100)
  }, [vehicules])

  // OT actifs = planifie | en_cours | en_attente_pieces
  const otsActifs = ots.filter(o => o.statut !== 'cloture' && o.statut !== 'annule')

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
      if (d.getFullYear() === currentYear) months[d.getMonth()] += Number(e.cout_ht ?? 0)
    })
    return months
  }, [currentYear, entretiens])

  const costByType = useMemo(() => {
    const map: Record<string, number> = {}
    entretiens.forEach(e => { map[e.maintenance_type] = (map[e.maintenance_type] ?? 0) + Number(e.cout_ht ?? 0) })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [entretiens])

  const costByVehicule = useMemo(() => {
    const map: Record<string, number> = {}
    entretiens.forEach(e => {
      const k = vehiculeLabel(e.vehicule_id) ?? remorqueLabel(e.remorque_id) ?? 'Parc'
      map[k] = (map[k] ?? 0) + Number(e.cout_ht ?? 0)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [entretiens, remorqueLabel, vehiculeLabel])

  // Stock alertes
  const stockAlertes = pieces.filter(p => p.quantite <= p.quantite_min)

  // ── Actions OT ──────────────────────────────────────────────────────────────
  async function createOT(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isMecanicien) {
      setNotice("Seuls les mécaniciens peuvent créer un ordre de travaux.")
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('flotte_entretiens').insert({
        vehicule_id: otForm.vehicule_id || null,
        remorque_id: otForm.remorque_id || null,
        maintenance_type: otForm.type,
        service_date: otForm.date_ouverture,
        km_compteur: otForm.kilometrage ? (parseInt(otForm.kilometrage.replace(/[^0-9]/g, '')) || null) : null,
        cout_ht: parseFloat(otForm.cout_ht) || 0,
        prestataire: otForm.prestataire || null,
        garage: otForm.garage || null,
        notes: [otForm.description, otForm.pieces_utilisees ? `Pièces: ${otForm.pieces_utilisees}` : ''].filter(Boolean).join(' · ') || null,
        next_due_date: otForm.next_due_date || null,
        covered_by_contract: false,
        mecanicien_assign: otForm.mecanicien || null,
        priority: otForm.priorite,
        statut: 'planifie',
      } as any)
      if (error) throw error
      setShowOTForm(false)
      setOTForm({ vehicule_id: '', remorque_id: '', type: 'reparation', priorite: 'normale', statut: 'planifie' as OTStatut, mecanicien: '', description: '', date_ouverture: new Date().toISOString().slice(0, 10), cout_ht: '', prestataire: '', garage: '', pieces_utilisees: '', kilometrage: '', next_due_date: '' })
      setNotice('OT créé et enregistré.')
      await load()
    } catch (err) {
      setDbError(maintenanceError(err))
    } finally {
      setSaving(false)
    }
  }

  async function demarrerOT(ot: OT) {
    if (!confirm(`Démarrer l'OT "${ot.description}" ? Le véhicule passera en statut Maintenance.`)) return
    setSaving(true)
    try {
      const { error } = await supabase.from('flotte_entretiens').update({
        statut: 'en_cours',
        date_debut_reelle: new Date().toISOString(),
      } as any).eq('id', ot.id)
      if (error) {
        if (isMissingOptionalMaintenanceFeature(error)) {
          setOts(prev => prev.map(o => o.id === ot.id ? { ...o, statut: 'en_cours' as OTStatut } : o))
          setNotice('OT démarré (local — migration DB requise).')
        } else throw error
      } else {
        setNotice(`OT démarré — véhicule en maintenance.`)
        await load()
      }
    } catch (err) {
      setDbError(maintenanceError(err))
    } finally {
      setSaving(false)
    }
  }

  async function cloturerOT(ot: OT) {
    if (!confirm(`Clôturer l'OT "${ot.description}" ?`)) return
    setSaving(true)
    try {
      const { error: updateErr } = await supabase.from('flotte_entretiens').update({
        statut: 'cloture',
        date_fin_reelle: new Date().toISOString(),
        service_date: new Date().toISOString().slice(0, 10),
        cout_ht: ot.cout_ht,
        ...(otForm.next_due_date ? { next_due_date: otForm.next_due_date } : {}),
      } as any).eq('id', ot.id)
      if (updateErr) {
        if (isMissingOptionalMaintenanceFeature(updateErr)) {
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
          const { error: insertErr } = await supabase.from('flotte_entretiens').insert(payload)
          if (insertErr) throw insertErr
        } else throw updateErr
      }
      setOts(prev => prev.filter(o => o.id !== ot.id))
      setNotice(`OT clôturé — ${ot.description}`)
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
  async function addPiece(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        reference: pieceForm.reference,
        designation: pieceForm.designation,
        compatibilite: pieceForm.compatibilite || null,
        stock_actuel: parseInt(pieceForm.quantite) || 0,
        stock_minimum: parseInt(pieceForm.quantite_min) || 1,
        prix_unitaire_ht: parseFloat(pieceForm.prix_unitaire) || null,
        fournisseur_nom: pieceForm.fournisseur || null,
        emplacement: pieceForm.emplacement || null,
      }
      const { data, error } = await (supabase as any).from('stock_pieces').insert(payload).select().single()
      if (error) {
        if (isMissingOptionalMaintenanceFeature(error)) {
          setPieces(prev => [...prev, {
            id: `p${Date.now()}`, reference: pieceForm.reference, designation: pieceForm.designation,
            compatibilite: pieceForm.compatibilite, quantite: parseInt(pieceForm.quantite) || 0,
            quantite_min: parseInt(pieceForm.quantite_min) || 1, prix_unitaire: parseFloat(pieceForm.prix_unitaire) || 0,
            fournisseur: pieceForm.fournisseur, emplacement: pieceForm.emplacement, last_cmd: null,
          }])
        } else throw error
      } else if (data) {
        const sp = data as StockPiece
        setPieces(prev => [...prev, {
          id: sp.id, reference: sp.reference, designation: sp.designation,
          compatibilite: sp.compatibilite ?? '', quantite: sp.stock_actuel,
          quantite_min: sp.stock_minimum, prix_unitaire: Number(sp.prix_unitaire_ht ?? 0),
          fournisseur: sp.fournisseur_nom ?? '', emplacement: sp.emplacement ?? '', last_cmd: null,
        }])
      }
      setShowPieceForm(false)
      setPieceForm({ reference: '', designation: '', compatibilite: '', quantite: '', quantite_min: '', prix_unitaire: '', fournisseur: '', emplacement: '' })
      setNotice('Pièce ajoutée.')
    } catch (err) {
      setDbError(maintenanceError(err))
    } finally {
      setSaving(false)
    }
  }

  async function ajusterStock(id: string, delta: number) {
    const piece = pieces.find(p => p.id === id)
    if (!piece) return
    const newQty = Math.max(0, piece.quantite + delta)
    setPieces(prev => prev.map(p => p.id === id ? { ...p, quantite: newQty } : p))
    setPieceAjust(null)
    try {
      await (supabase as any).from('stock_pieces').update({ stock_actuel: newQty, updated_at: new Date().toISOString() }).eq('id', id)
      await (supabase as any).from('mouvements_stock').insert({
        piece_id: id,
        type_mouvement: delta > 0 ? 'entree' : 'sortie',
        quantite: Math.abs(delta),
        notes: delta > 0 ? 'Ajustement manuel +' : 'Ajustement manuel -',
      })
    } catch { /* ignore — mise à jour locale déjà faite */ }
  }

  async function deletePiece(id: string) {
    setPieces(prev => prev.filter(p => p.id !== id))
    try { await (supabase as any).from('stock_pieces').delete().eq('id', id) } catch { /* ignore */ }
  }

  // ── Actions Fournisseurs ───────────────────────────────────────────────────
  async function addFournisseur(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        nom: fourForm.nom,
        type_service: TYPE_SERVICE_MAP[fourForm.type] ?? 'autre',
        contact_nom: fourForm.contact || null,
        telephone: fourForm.telephone || null,
        email: fourForm.email || null,
        delai_livraison: fourForm.delai_livraison || null,
        conditions_paiement: fourForm.conditions || null,
        note_qualite: parseInt(fourForm.note) || 3,
      }
      const { data, error } = await (supabase as any).from('fournisseurs_maintenance').insert(payload).select().single()
      if (error) {
        if (isMissingOptionalMaintenanceFeature(error)) {
          setFournisseurs(prev => [...prev, {
            id: `f${Date.now()}`, nom: fourForm.nom, type: fourForm.type,
            contact: fourForm.contact, telephone: fourForm.telephone, email: fourForm.email,
            delai_livraison: fourForm.delai_livraison, conditions: fourForm.conditions,
            note: parseInt(fourForm.note) || 3,
          }])
        } else throw error
      } else if (data) {
        const f = data as FournisseurMaint
        setFournisseurs(prev => [...prev, {
          id: f.id, nom: f.nom,
          type: (TYPE_SERVICE_REVERSE[f.type_service ?? ''] ?? 'autre') as Fournisseur['type'],
          contact: f.contact_nom ?? '', telephone: f.telephone ?? '', email: f.email ?? '',
          delai_livraison: f.delai_livraison ?? '', conditions: f.conditions_paiement ?? '',
          note: f.note_qualite ?? 3,
        }])
      }
      setShowFourForm(false)
      setFourForm({ nom: '', type: 'pieces', contact: '', telephone: '', email: '', delai_livraison: '', conditions: '', note: '3' })
      setNotice('Fournisseur ajouté.')
    } catch (err) {
      setDbError(maintenanceError(err))
    } finally {
      setSaving(false)
    }
  }

  async function deleteFournisseur(id: string) {
    setFournisseurs(prev => prev.filter(f => f.id !== id))
    try { await (supabase as any).from('fournisseurs_maintenance').delete().eq('id', id) } catch { /* ignore */ }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Atelier Mécanique</h2>
          <p className="text-slate-500 text-sm">
            {vehicules.length} véhicules · {otsActifs.length} OT actifs · {alerts.length + echeancesUrgentes + countAlertesDepassees + countAlertesPreventives} alerte{alerts.length + echeancesUrgentes + countAlertesDepassees + countAlertesPreventives !== 1 ? 's' : ''}
          </p>
        </div>
        {tab === 'ot' && isMecanicien && (
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
            {(['tous', 'planifie', 'en_cours', 'en_attente_pieces', 'cloture', 'annule'] as const).map(s => (
              <button key={s} onClick={() => setFilterOTStatut(s as OTStatut | 'tous')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${filterOTStatut === s ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {s === 'tous' ? 'Tous' : OT_STATUT_LABELS[s as OTStatut]}
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
              <p className="text-slate-400 text-sm">
                {isMecanicien
                  ? 'Aucun ordre de travaux. Cliquez sur + Nouvel OT pour commencer.'
                  : 'Aucun ordre de travaux.'}
              </p>
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
                        <span className={`text-xs px-2 py-1 rounded-lg font-medium ${OT_STATUT_COLORS[o.statut]}`}>
                          {OT_STATUT_LABELS[o.statut]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          {o.statut === 'planifie' && (
                            <button onClick={() => void demarrerOT(o)} disabled={saving}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50">
                              Démarrer
                            </button>
                          )}
                          {o.statut !== 'cloture' && o.statut !== 'annule' && (
                            <button onClick={() => void cloturerOT(o)} disabled={saving}
                              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors disabled:opacity-50">
                              Clôturer
                            </button>
                          )}
                        </div>
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

      {/* ══ TAB: PROGRAMMES MÉCANICIENS ════════════════════════════════════════ */}
      {tab === 'programmesmeca' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPI label="Mécaniciens actifs" value={mecaniciensProgrammes.filter(m => m.totalCount > 0).length} color="slate" />
            <KPI label="Total interventions" value={entretiens.length} color="blue" />
            <KPI label="À faire d'ici 7j" value={entretiens.filter(e => {
              const days = daysDiff(e.next_due_date || e.service_date)
              return days >= 0 && days <= 7
            }).length} color="orange" />
            <KPI label="En retard" value={entretiens.filter(e => daysDiff(e.next_due_date || e.service_date) < 0).length} color="red" />
          </div>

          {mecaniciensProgrammes.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <p className="text-slate-400 text-sm">Aucun programme. Assignez des mécaniciens aux interventions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mecaniciensProgrammes.map(({ name, tasks, urgent, totalCount }) => {
                const inProgress = tasks.filter(t => {
                  const e = t as FlotteEntretienEtendu
                  return e.priority === 'urgente' || e.priority === 'haute'
                }).length
                return (
                  <div key={name} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-700">
                          {name.split(' ').map(part => part[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800">{name}</h3>
                          <p className="text-xs text-slate-500">{totalCount} intervention{totalCount > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        {urgent > 0 && <Badge color="bg-red-100 text-red-700">{urgent} urgent{urgent > 1 ? 's' : ''}</Badge>}
                        {inProgress > 0 && <Badge color="bg-orange-100 text-orange-700">{inProgress} prioritaire{inProgress > 1 ? 's' : ''}</Badge>}
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {tasks.slice(0, 10).map(task => {
                        const daysToGo = daysDiff(task.next_due_date || task.service_date)
                        const isUrgent = daysToGo < 0 || daysToGo <= 7
                        const isOverdue = daysToGo < 0
                        return (
                          <div key={task.id} className={`px-5 py-3 flex items-center justify-between ${isOverdue ? 'bg-red-50' : isUrgent ? 'bg-orange-50' : 'bg-white'}`}>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                {assetLabel(task)}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  {MAINTENANCE_LABELS[task.maintenance_type] ?? task.maintenance_type}
                                </p>
                                {task.notes && <p className="text-xs text-slate-500 truncate">{task.notes}</p>}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${isOverdue ? 'text-red-700' : isUrgent ? 'text-orange-700' : 'text-slate-700'}`}>
                                {fmtDate(task.next_due_date || task.service_date)}
                              </p>
                              <p className={`text-xs ${isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-slate-400'}`}>
                                {isOverdue ? `${Math.abs(daysToGo)} j. de retard` : daysToGo === 0 ? "Aujourd'hui" : `J−${daysToGo}`}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {tasks.length > 10 && (
                      <div className="bg-slate-50 px-5 py-2 text-center text-xs text-slate-500 border-t border-slate-200">
                        +{tasks.length - 10} intervention{tasks.length - 10 > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
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
                            <button onClick={() => void deletePiece(p.id)} className="text-xs text-slate-300 hover:text-red-500">✕</button>
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
                      <button onClick={() => void deleteFournisseur(f.id)} className="text-xs text-slate-300 hover:text-red-500 mt-1">Supprimer</button>
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

      {/* ══ TAB: INDEX ENTRETIEN ═════════════════════════════════════════════ */}
      {tab === 'index' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <KPI label="Marques" value={new Set(indexEntries.map(e => e.marque)).size} color="slate" />
            <KPI label="Modeles indexes" value={new Set(indexEntries.map(e => e.modele)).size} color="slate" />
            <KPI label="Motorisations" value={new Set(indexEntries.map(e => e.motorisation ?? '*')).size} color="blue" />
            <KPI label="Regles actives" value={indexEntries.length} color="blue" />
            <KPI label="Veille a faire" value={indexVeilleMois.length} color={indexVeilleMois.length > 0 ? 'amber' : 'green'} sub={`Mois ${monthStr}`} />
            <KPI label="Types suivis" value={new Set(indexEntries.map(e => e.maintenance_type)).size} color="slate" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">
              Base constructeur globale (hors parc): Scania, Volvo, DAF, Iveco, Renault, Mercedes, MAN. Sources prioritaires: portails RMI constructeurs + TecRMI/HaynesPro en multi-marques. Synchro auto hebdomadaire: {indexLastSyncAt ? fmtDate(indexLastSyncAt) : 'jamais'}.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Lexique mecanique par modele camion</h3>
              <button type="button" onClick={loadConstructeurIndexPresets} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                Charger presets RMI constructeurs
              </button>
            </div>
            <form onSubmit={saveIndexEntry} className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <Field label="Marque *">
                <select
                  className={inp}
                  value={indexForm.marque}
                  onChange={e => {
                    const newMarque = e.target.value
                    const cat = CONSTRUCTEUR_MODELES.find(item => item.marque === newMarque)
                    setIndexForm(current => ({
                      ...current,
                      marque: newMarque,
                      modele: '',
                      motorisation: '*',
                      source_constructeur: CONSTRUCTEUR_SOURCES[newMarque] ?? current.source_constructeur,
                      huile_moteur_l: cat ? String(cat.huile_moteur_l) : current.huile_moteur_l,
                      huile_boite_l: cat ? String(cat.huile_boite_l) : current.huile_boite_l,
                      huile_pont_l: cat ? String(cat.huile_pont_l) : current.huile_pont_l,
                      liquide_frein_l: cat ? String(cat.liquide_frein_l) : current.liquide_frein_l,
                    }))
                  }}
                  required
                >
                  {indexCatalogueMarques.map(marque => <option key={marque} value={marque}>{marque}</option>)}
                </select>
              </Field>
              <Field label="Modele camion *">
                <select
                  className={inp}
                  value={indexForm.modele}
                  onChange={e => {
                    const newModele = e.target.value
                    const cat = CONSTRUCTEUR_MODELES.find(item => item.marque === indexForm.marque && item.modele === newModele)
                    const preset = CONSTRUCTEUR_INDEX_PRESETS.find(p =>
                      p.marque === indexForm.marque && p.modele === newModele && p.maintenance_type === indexForm.maintenance_type,
                    )
                    setIndexForm(current => ({
                      ...current,
                      modele: newModele,
                      motorisation: cat ? (cat.motorisations[0] ?? '*') : '*',
                      huile_moteur_l: cat ? String(cat.huile_moteur_l) : current.huile_moteur_l,
                      huile_boite_l: cat ? String(cat.huile_boite_l) : current.huile_boite_l,
                      huile_pont_l: cat ? String(cat.huile_pont_l) : current.huile_pont_l,
                      liquide_frein_l: cat ? String(cat.liquide_frein_l) : current.liquide_frein_l,
                      source_constructeur: cat ? (CONSTRUCTEUR_SOURCES[cat.marque] ?? current.source_constructeur) : current.source_constructeur,
                      periodicite_km: preset ? String(preset.periodicite_km ?? '') : current.periodicite_km,
                      periodicite_mois: preset ? String(preset.periodicite_mois ?? '') : current.periodicite_mois,
                      pieces_reference: preset ? (preset.pieces_reference ?? '') : current.pieces_reference,
                      notes: preset ? (preset.notes ?? '') : current.notes,
                    }))
                  }}
                  required
                >
                  <option value="">Selectionner un modele</option>
                  {indexCatalogueModeles.map(modele => <option key={modele} value={modele}>{modele}</option>)}
                </select>
              </Field>
              <Field label="Motorisation">
                <select
                  className={inp}
                  value={indexForm.motorisation}
                  onChange={e => {
                    const newMot = e.target.value
                    const preset = CONSTRUCTEUR_INDEX_PRESETS.find(p =>
                      p.marque === indexForm.marque && p.modele === indexForm.modele &&
                      p.motorisation === newMot && p.maintenance_type === indexForm.maintenance_type,
                    )
                    setIndexForm(current => ({
                      ...current,
                      motorisation: newMot,
                      periodicite_km: preset ? String(preset.periodicite_km ?? '') : current.periodicite_km,
                      periodicite_mois: preset ? String(preset.periodicite_mois ?? '') : current.periodicite_mois,
                      pieces_reference: preset ? (preset.pieces_reference ?? '') : current.pieces_reference,
                      notes: preset ? (preset.notes ?? '') : current.notes,
                    }))
                  }}
                >
                  {indexCatalogueMotorisations.map(motorisation => <option key={motorisation} value={motorisation}>{motorisation}</option>)}
                </select>
              </Field>
              <Field label="Type entretien">
                <select
                  className={inp}
                  value={indexForm.maintenance_type}
                  onChange={e => {
                    const newType = e.target.value
                    const preset = CONSTRUCTEUR_INDEX_PRESETS.find(p =>
                      p.marque === indexForm.marque && p.modele === indexForm.modele &&
                      p.motorisation === indexForm.motorisation && p.maintenance_type === newType,
                    )
                    setIndexForm(current => ({
                      ...current,
                      maintenance_type: newType,
                      periodicite_km: preset ? String(preset.periodicite_km ?? '') : current.periodicite_km,
                      periodicite_mois: preset ? String(preset.periodicite_mois ?? '') : current.periodicite_mois,
                      pieces_reference: preset ? (preset.pieces_reference ?? '') : current.pieces_reference,
                      notes: preset ? (preset.notes ?? '') : current.notes,
                    }))
                  }}
                >
                  {MAINTENANCE_TYPES.map(type => <option key={type} value={type}>{MAINTENANCE_LABELS[type]}</option>)}
                </select>
              </Field>
              <Field label="Periodicite km"><input className={inp} type="number" min={0} value={indexForm.periodicite_km} onChange={e => setIndexForm(current => ({ ...current, periodicite_km: e.target.value }))} placeholder="30000" /></Field>
              <Field label="Periodicite mois"><input className={inp} type="number" min={0} value={indexForm.periodicite_mois} onChange={e => setIndexForm(current => ({ ...current, periodicite_mois: e.target.value }))} placeholder="12" /></Field>
              <Field label="Huile moteur (L)"><input className={inp} type="number" step="0.1" min={0} value={indexForm.huile_moteur_l} onChange={e => setIndexForm(current => ({ ...current, huile_moteur_l: e.target.value }))} /></Field>
              <Field label="Huile boite (L)"><input className={inp} type="number" step="0.1" min={0} value={indexForm.huile_boite_l} onChange={e => setIndexForm(current => ({ ...current, huile_boite_l: e.target.value }))} /></Field>
              <Field label="Huile pont (L)"><input className={inp} type="number" step="0.1" min={0} value={indexForm.huile_pont_l} onChange={e => setIndexForm(current => ({ ...current, huile_pont_l: e.target.value }))} /></Field>
              <Field label="Liquide frein (L)"><input className={inp} type="number" step="0.1" min={0} value={indexForm.liquide_frein_l} onChange={e => setIndexForm(current => ({ ...current, liquide_frein_l: e.target.value }))} /></Field>
              <div className="lg:col-span-2">
                <Field label="Pieces (ref + quantites)"><input className={inp} value={indexForm.pieces_reference} onChange={e => setIndexForm(current => ({ ...current, pieces_reference: e.target.value }))} placeholder="Ex: FIL-HUI x1 piece; HUI-MOT 36 litre" /></Field>
              </div>
              <div className="lg:col-span-2">
                <Field label="Source constructeur (portail/URL)"><input className={inp} value={indexForm.source_constructeur} onChange={e => setIndexForm(current => ({ ...current, source_constructeur: e.target.value }))} placeholder="Portail RMI constructeur ou URL" /></Field>
              </div>
              <div className="lg:col-span-2">
                <Field label="Notes"><input className={inp} value={indexForm.notes} onChange={e => setIndexForm(current => ({ ...current, notes: e.target.value }))} placeholder="Procedure, viscosite, reference..." /></Field>
              </div>
              <div className="lg:col-span-6 flex justify-end gap-2">
                {indexEditingId && <button type="button" onClick={resetIndexForm} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>}
                <button type="submit" className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">{indexEditingId ? 'Mettre a jour' : 'Ajouter index'}</button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Veille mensuelle</h3>
            {indexVeilleMois.length === 0 ? (
              <p className="text-xs text-slate-400">Tous les index ont ete verifies ce mois-ci.</p>
            ) : (
              <div className="space-y-2">
                {indexVeilleMois.map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-amber-900">{item.modele} · {MAINTENANCE_LABELS[item.maintenance_type] ?? item.maintenance_type}</p>
                      <p className="text-xs text-amber-700">Derniere veille: {item.derniere_veille_mois ?? 'jamais'}</p>
                    </div>
                    <button type="button" onClick={() => markIndexReviewed(item.id, monthStr)} className="text-xs font-medium text-amber-700 hover:text-amber-900">Marquer revue</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Filtres index atelier</h3>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <Field label="Marque">
                <select
                  className={inp}
                  value={indexFilterMarque}
                  onChange={e => {
                    setIndexFilterMarque(e.target.value)
                    setIndexFilterModele('tous')
                    setIndexFilterMotorisation('toutes')
                  }}
                >
                  <option value="toutes">Toutes</option>
                  {indexMarques.map(marque => <option key={marque} value={marque}>{marque}</option>)}
                </select>
              </Field>
              <Field label="Modele">
                <select
                  className={inp}
                  value={indexFilterModele}
                  onChange={e => {
                    setIndexFilterModele(e.target.value)
                    setIndexFilterMotorisation('toutes')
                  }}
                >
                  <option value="tous">Tous</option>
                  {indexModelesFiltres.map(modele => <option key={modele} value={modele}>{modele}</option>)}
                </select>
              </Field>
              <Field label="Motorisation">
                <select className={inp} value={indexFilterMotorisation} onChange={e => setIndexFilterMotorisation(e.target.value)}>
                  <option value="toutes">Toutes</option>
                  {indexMotorisationsFiltrees.map(motorisation => <option key={motorisation} value={motorisation}>{motorisation}</option>)}
                </select>
              </Field>
              <div className="flex items-end justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIndexFilterMarque('toutes')
                    setIndexFilterModele('tous')
                    setIndexFilterMotorisation('toutes')
                  }}
                  className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Reinitialiser
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Remontee de chaque constructeur</h3>
            {constructeurRemontees.length === 0 ? (
              <p className="text-xs text-slate-400">Aucune remontee constructeur disponible.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {constructeurRemontees.map(item => (
                  <div key={item.constructeur} className="rounded-lg border border-slate-200 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{item.constructeur}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{item.rules} regles</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{item.modelesCount} modele{item.modelesCount > 1 ? 's' : ''} indexe{item.modelesCount > 1 ? 's' : ''}</p>
                    <p className="text-xs text-slate-400 mt-1 break-all">Source: {item.source ?? 'interne atelier'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Agregateurs multi-marques (point d'entree unique)</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {MAINTENANCE_MULTI_MARQUES_SOURCES.map(source => (
                <div key={source} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 break-all">
                  {source}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b bg-slate-50 border-slate-200">
              <p className="text-sm font-semibold text-slate-700">Index enregistres ({filteredIndexEntries.length})</p>
            </div>
            {filteredIndexEntries.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Aucun index defini.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Marque', 'Modele', 'Motorisation', 'Type', 'Periodicite', 'Volumes (L)', 'Pieces', 'Source', 'Veille', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredIndexEntries.map((item, i) => (
                    <tr key={item.id} className={`border-t border-slate-100 ${i % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                      <td className="px-4 py-2.5 text-slate-700 font-medium">{item.marque}</td>
                      <td className="px-4 py-2.5 text-slate-700 font-medium">{item.modele}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{item.motorisation ?? '*'}</td>
                      <td className="px-4 py-2.5 text-slate-600">{MAINTENANCE_LABELS[item.maintenance_type] ?? item.maintenance_type}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{item.periodicite_km ? `${item.periodicite_km.toLocaleString('fr-FR')} km` : '—'} · {item.periodicite_mois ? `${item.periodicite_mois} mois` : '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">M: {item.huile_moteur_l ?? '—'} · B: {item.huile_boite_l ?? '—'} · P: {item.huile_pont_l ?? '—'} · F: {item.liquide_frein_l ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[280px] truncate" title={item.pieces_reference ?? ''}>{item.pieces_reference ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[320px] truncate" title={item.source_constructeur ?? ''}>{item.source_constructeur ?? 'Interne'}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{item.derniere_veille_mois ?? 'jamais'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => startEditIndex(item)} className="text-xs text-slate-500 hover:text-slate-800">Modifier</button>
                          <button type="button" onClick={() => deleteIndexEntry(item.id)} className="text-xs text-slate-500 hover:text-red-600">Suppr.</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Historique entretien par modele/type (base flotte)</h3>
            {maintenanceByModeleType.length === 0 ? (
              <p className="text-xs text-slate-400">Pas assez de donnees pour proposer des tendances par modele.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {maintenanceByModeleType.map(item => (
                  <div key={`${item.modele}-${item.maintenance_type}`} className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-sm font-medium text-slate-800">{item.modele}</p>
                    <p className="text-xs text-slate-500">{MAINTENANCE_LABELS[item.maintenance_type] ?? item.maintenance_type} · {item.count} intervention{item.count > 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: ALERTES ATELIER ════════════════════════════════════════════ */}
      {tab === 'alertes' && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPI label="Depassees" value={countAlertesDepassees} color={countAlertesDepassees > 0 ? 'red' : 'green'} />
            <KPI label="Preventif" value={countAlertesPreventives} color={countAlertesPreventives > 0 ? 'amber' : 'green'} />
            <KPI label="A initialiser" value={countAlertesAInitialiser} color={countAlertesAInitialiser > 0 ? 'orange' : 'slate'} />
            <KPI label="Vehicules suivis" value={alertesParVehicule.length} color="blue" />
          </div>

          {/* Toggle vue */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAlerteVue('vehicules')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                alerteVue === 'vehicules' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Vue mécanicien (par véhicule)
            </button>
            <button
              type="button"
              onClick={() => setAlerteVue('tableau')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                alerteVue === 'tableau' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Tableau détaillé
            </button>
          </div>

          {/* ── VUE MÉCANICIEN : cartes par véhicule ── */}
          {alerteVue === 'vehicules' && (
            alertesParVehicule.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">Aucune règle index applicable aux véhicules. Configurez l'index atelier.</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {alertesParVehicule.map(veh => {
                  const worstStatus = veh.items.reduce<IndexAlertStatus>((worst, item) => {
                    const score: Record<IndexAlertStatus, number> = { depasse: 0, preventif: 1, a_initialiser: 2, ok: 3 }
                    return score[item.status] < score[worst] ? item.status : worst
                  }, 'ok')
                  const borderColor = { depasse: 'border-red-300', preventif: 'border-amber-300', a_initialiser: 'border-orange-200', ok: 'border-slate-200' }[worstStatus]
                  const headerBg = { depasse: 'bg-red-50', preventif: 'bg-amber-50', a_initialiser: 'bg-orange-50', ok: 'bg-slate-50' }[worstStatus]

                  return (
                    <div key={veh.immatriculation} className={`bg-white rounded-xl border-2 ${borderColor} overflow-hidden`}>
                      {/* Header véhicule */}
                      <div className={`${headerBg} px-4 py-3 flex items-center justify-between gap-2`}>
                        <div>
                          <p className="font-mono text-sm font-bold text-slate-800">{veh.immatriculation}</p>
                          <p className="text-xs text-slate-500">{veh.modele}{veh.motorisation && veh.motorisation !== '*' ? ` · ${veh.motorisation}` : ''}</p>
                        </div>
                        <div className="text-right">
                          {veh.kmActuel !== null && (
                            <p className="text-xs font-semibold text-slate-700">{veh.kmActuel.toLocaleString('fr-FR')} km</p>
                          )}
                          <p className="text-xs text-slate-400">km actuel</p>
                        </div>
                      </div>

                      {/* Liste des entretiens */}
                      <div className="divide-y divide-slate-100">
                        {veh.items.map(item => {
                          const statusBadgeClass = {
                            depasse: 'bg-red-100 text-red-700',
                            preventif: 'bg-amber-100 text-amber-700',
                            a_initialiser: 'bg-orange-100 text-orange-700',
                            ok: 'bg-green-100 text-green-700',
                          }[item.status]
                          const statusLabel = { depasse: 'Dépassé', preventif: 'Préventif', a_initialiser: 'À initialiser', ok: 'OK' }[item.status]

                          // Barre de progression km
                          const pctKm = (() => {
                            if (item.periodicite_km === null || item.periodicite_km === 0) return null
                            if (item.kmRestants === null) return null
                            const consomme = item.periodicite_km - item.kmRestants
                            return Math.min(100, Math.max(0, Math.round((consomme / item.periodicite_km) * 100)))
                          })()
                          const pctJours = (() => {
                            if (item.periodicite_mois === null || item.periodicite_mois === 0) return null
                            if (item.joursRestants === null) return null
                            const totalJours = item.periodicite_mois * 30
                            const consomme = totalJours - item.joursRestants
                            return Math.min(100, Math.max(0, Math.round((consomme / totalJours) * 100)))
                          })()
                          const barColor = { depasse: 'bg-red-500', preventif: 'bg-amber-400', a_initialiser: 'bg-orange-300', ok: 'bg-green-400' }[item.status]

                          return (
                            <div key={item.maintenanceType} className="px-4 py-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-slate-700">{MAINTENANCE_LABELS[item.maintenanceType] ?? item.maintenanceType}</span>
                                <Badge color={statusBadgeClass}>{statusLabel}</Badge>
                              </div>

                              {item.status === 'a_initialiser' ? (
                                <p className="text-xs text-orange-500">Aucun entretien enregistré — initialiser l'historique</p>
                              ) : (
                                <>
                                  {/* Barre km */}
                                  {pctKm !== null && (
                                    <div className="mb-1">
                                      <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                                        <span>KM</span>
                                        <span className={item.kmRestants !== null && item.kmRestants < 0 ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                                          {item.kmRestants !== null
                                            ? item.kmRestants < 0
                                              ? `Dépassé de ${Math.abs(item.kmRestants).toLocaleString('fr-FR')} km`
                                              : `${item.kmRestants.toLocaleString('fr-FR')} km restants`
                                            : '—'}
                                        </span>
                                      </div>
                                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pctKm}%` }} />
                                      </div>
                                    </div>
                                  )}

                                  {/* Barre jours */}
                                  {pctJours !== null && (
                                    <div>
                                      <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                                        <span>Temps</span>
                                        <span className={item.joursRestants !== null && item.joursRestants < 0 ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                                          {item.joursRestants !== null
                                            ? item.joursRestants < 0
                                              ? `Dépassé de ${Math.abs(item.joursRestants)} j`
                                              : `${item.joursRestants} j restants`
                                            : '—'}
                                        </span>
                                      </div>
                                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pctJours}%` }} />
                                      </div>
                                    </div>
                                  )}

                                  {/* Prochaine échéance */}
                                  <p className="text-xs text-slate-400 mt-1.5">
                                    Prochaine éch. :
                                    {item.prochaineEcheanceDate ? ` ${fmtDate(item.prochaineEcheanceDate)}` : ''}
                                    {item.prochaineEcheanceKm ? ` · ${item.prochaineEcheanceKm.toLocaleString('fr-FR')} km` : ''}
                                    {!item.prochaineEcheanceDate && !item.prochaineEcheanceKm ? ' —' : ''}
                                  </p>
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* ── VUE TABLEAU DÉTAILLÉ ── */}
          {alerteVue === 'tableau' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b bg-slate-50 border-slate-200">
                <p className="text-sm font-semibold text-slate-700">Tableau détaillé ({indexAlertesVehicules.length} entrées)</p>
              </div>
              {indexAlertesVehicules.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">Aucune règle index applicable aux véhicules.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Statut', 'Véhicule', 'Modèle / moteur', 'Type', 'Restant km · jours', 'Prochaine échéance', 'Source'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {indexAlertesVehicules.map((item, i) => {
                      const statusStyle = {
                        depasse: 'bg-red-100 text-red-700',
                        preventif: 'bg-amber-100 text-amber-700',
                        a_initialiser: 'bg-orange-100 text-orange-700',
                        ok: 'bg-green-100 text-green-700',
                      }[item.status]
                      const statusLabel = { depasse: 'Dépassé', preventif: 'Préventif', a_initialiser: 'À initialiser', ok: 'OK' }[item.status]
                      return (
                        <tr key={`${item.vehiculeId}-${item.maintenanceType}-${i}`} className={`border-t border-slate-100 ${i % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                          <td className="px-4 py-2.5"><Badge color={statusStyle}>{statusLabel}</Badge></td>
                          <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-700">{item.immatriculation}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">{item.modele} · {item.motorisation}</td>
                          <td className="px-4 py-2.5 text-slate-600">{MAINTENANCE_LABELS[item.maintenanceType] ?? item.maintenanceType}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">
                            {item.kmRestants === null ? '—' : `${item.kmRestants.toLocaleString('fr-FR')} km`} · {item.joursRestants === null ? '—' : `${item.joursRestants} j`}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">
                            {item.prochaineEcheanceDate ? fmtDate(item.prochaineEcheanceDate) : '—'} · {item.prochaineEcheanceKm ? `${item.prochaineEcheanceKm.toLocaleString('fr-FR')} km` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">{item.source.includes('http') ? 'Constructeur' : 'Interne'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: REGLAGE ALERTES ═════════════════════════════════════════════ */}
      {tab === 'reglages' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3 className="text-sm font-semibold text-slate-800">Seuils preventif et depasse</h3>
              <button type="button" onClick={applyAlertPresetFromIndex} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                Pre-regler depuis l'index atelier
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Alerte preventive</p>
                <Field label="Seuil km restants">
                  <input
                    className={inp}
                    type="number"
                    min={0}
                    value={alertSettings.preventifKm}
                    onChange={e => setAlertSettings(current => ({ ...current, preventifKm: Math.max(0, Number.parseInt(e.target.value || '0', 10) || 0) }))}
                  />
                </Field>
                <Field label="Seuil jours restants">
                  <input
                    className={inp}
                    type="number"
                    min={0}
                    value={alertSettings.preventifJours}
                    onChange={e => setAlertSettings(current => ({ ...current, preventifJours: Math.max(0, Number.parseInt(e.target.value || '0', 10) || 0) }))}
                  />
                </Field>
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-red-800 uppercase tracking-wide">Depassement</p>
                <Field label="Tolerance km depasses">
                  <input
                    className={inp}
                    type="number"
                    min={0}
                    value={alertSettings.toleranceDepasseKm}
                    onChange={e => setAlertSettings(current => ({ ...current, toleranceDepasseKm: Math.max(0, Number.parseInt(e.target.value || '0', 10) || 0) }))}
                  />
                </Field>
                <Field label="Tolerance jours depasses">
                  <input
                    className={inp}
                    type="number"
                    min={0}
                    value={alertSettings.toleranceDepasseJours}
                    onChange={e => setAlertSettings(current => ({ ...current, toleranceDepasseJours: Math.max(0, Number.parseInt(e.target.value || '0', 10) || 0) }))}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Apercu des regles actives</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPI label="Preventif km" value={`${alertSettings.preventifKm.toLocaleString('fr-FR')} km`} color="amber" />
              <KPI label="Preventif jours" value={`${alertSettings.preventifJours} j`} color="amber" />
              <KPI label="Tolerance depasse km" value={`${alertSettings.toleranceDepasseKm.toLocaleString('fr-FR')} km`} color="red" />
              <KPI label="Tolerance depasse jours" value={`${alertSettings.toleranceDepasseJours} j`} color="red" />
            </div>
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
                    {mecanicienOptions.map(m => <option key={m || 'none'} value={m}>{m || '— Non assigné'}</option>)}
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
