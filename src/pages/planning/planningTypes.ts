// ─── Planning Types ────────────────────────────────────────────────────────────
// Centralisé ici pour alléger Planning.tsx.
// Importé via : import type { OT, ... } from './planning/planningTypes'

import type { getAffretementContextByOtId } from '@/lib/affretementPortal'

export type OT = {
  id: string; reference: string; client_nom: string
  date_chargement_prevue: string | null; date_livraison_prevue: string | null
  type_transport: string; nature_marchandise: string | null
  statut: string; statut_transport: string | null; conducteur_id: string | null; vehicule_id: string | null
  remorque_id: string | null; prix_ht: number | null; statut_operationnel: string | null
  distance_km: number | null; donneur_ordre_id: string | null
  chargement_site_id: string | null; livraison_site_id: string | null
  mission_id: string | null; groupage_id: string | null; groupage_fige: boolean
  est_affretee: boolean
  // Automatismes
  mode_livraison?: string | null          // 'manuel' | 'conducteur' | 'gps' | 'api'
  retard_valide?: boolean | null
  retard_valide_at?: string | null
  retard_commentaire?: string | null
  affreteur_id?: string | null
  // Données de chargement pour validation remorque
  type_chargement?: string | null
  poids_kg?: number | null
  tonnage?: number | null
  volume_m3?: number | null
  longueur_m?: number | null
  hors_gabarit?: boolean | null
  temperature_dirigee?: boolean | null
  charge_indivisible?: boolean | null
}
export type Conducteur = { id: string; nom: string; prenom: string; statut: string }
export type Vehicule   = { id: string; immatriculation: string; marque: string | null; modele: string | null; statut: string }
export type Remorque   = {
  id: string
  immatriculation: string
  type_remorque: string
  statut: string
  // Capacité pour validation
  trailer_type_code?: string | null
  categorie_remorque?: string | null
  charge_utile_kg?: number | null
  volume_max_m3?: number | null
  longueur_m?: number | null
}
export type ClientRef  = { id: string; nom: string; actif: boolean | null }
export type Affectation = {
  id: string
  conducteur_id: string | null
  vehicule_id: string | null
  remorque_id: string | null
  actif: boolean
}
export type Tab        = 'conducteurs' | 'camions' | 'remorques'
export type ViewMode   = 'semaine' | 'jour' | 'mois'
export type PlanningScope = 'principal' | 'affretement'
export type ColorMode  = 'statut' | 'conducteur' | 'type' | 'client'
export type AssignForm = {
  ot: OT; conducteur_id: string; vehicule_id: string; remorque_id: string
  date_chargement: string; time_chargement: string; date_livraison: string; time_livraison: string
  applyToGroupage: boolean
}
export type EditDraft = {
  reference: string; nature_marchandise: string; prix_ht: string; statut: string
  statut_operationnel: string | null
  conducteur_id: string; vehicule_id: string; remorque_id: string
  date_chargement: string; time_chargement: string; date_livraison: string; time_livraison: string
  donneur_ordre_id: string
  chargement_site_id: string
  livraison_site_id: string
  distance_km: string
}
export type PlanningInlineType = 'course' | 'hlp' | 'maintenance' | 'repos'
export type CustomRow   = { id: string; label: string; subtitle: string }
export type CustomBlock = {
  id: string
  rowId: string
  label: string
  dateStart: string
  dateEnd: string
  color: string
  otId?: string
  kind?: Exclude<PlanningInlineType, 'course'>
}
export type DragState   = { ot: OT | null; kind: 'pool'|'block'|'custom'; durationDays: number; durationMinutes: number; customBlockId?: string }
export type NativeDragPayload = {
  kind: 'pool' | 'block' | 'custom'
  otId?: string
  durationDays: number
  durationMinutes: number
  customBlockId?: string
}
export type BlockMetrics = { leftPct: number; widthPct: number }
export type RowOrderMap = Record<Tab, string[]>
export type ContextMenu = { x: number; y: number; ot: OT } | null
export type AffretementContext = NonNullable<ReturnType<typeof getAffretementContextByOtId>>
export type RowConflict = { first: OT; second: OT; overlapMinutes: number }
export type BottomDockTab = 'missions' | 'non_affectees' | 'conflits' | 'affretement' | 'groupages' | 'non_programmees' | 'annulees' | 'urgences' | 'retour_charge' | 'entrepots' | 'relais'

// ─── Types Relais ──────────────────────────────────────────────────────────────
export type TransportRelaisStatut = 'en_attente' | 'assigne' | 'en_cours_reprise' | 'termine' | 'annule'
export type TypeRelais = 'depot_marchandise' | 'relais_conducteur'

export type TransportRelaisRecord = {
  id: string
  ot_id: string
  type_relais: TypeRelais
  statut: TransportRelaisStatut
  site_id: string | null
  site: { id: string; nom: string; adresse: string; ville: string | null } | null
  lieu_nom: string
  lieu_adresse: string | null
  lieu_lat: number | null
  lieu_lng: number | null
  conducteur_depose_id: string | null
  vehicule_depose_id: string | null
  remorque_depose_id: string | null
  date_depot: string
  conducteur_reprise_id: string | null
  vehicule_reprise_id: string | null
  remorque_reprise_id: string | null
  date_reprise_prevue: string | null
  date_reprise_reelle: string | null
  notes: string | null
  created_at: string
  updated_at: string
  ordres_transport: { id: string; reference: string; client_nom: string; statut: string; statut_operationnel: string | null; vehicule_id: string | null; conducteur_id: string | null } | null
  conducteur_depose: { id: string; nom: string; prenom: string } | null
  vehicule_depose: { id: string; immatriculation: string; modele: string | null } | null
  conducteur_reprise: { id: string; nom: string; prenom: string } | null
  vehicule_reprise: { id: string; immatriculation: string; modele: string | null } | null
  remorque_reprise: { id: string; immatriculation: string } | null
}

export type RelaisModalMode = 'depot' | 'relais_conducteur' | 'assign' | null
export type RelaisModal = {
  mode: RelaisModalMode
  ot: OT | null
  relais: TransportRelaisRecord | null
}

export type RelaisDepotForm = {
  type_relais: TypeRelais
  site_id: string
  lieu_nom: string
  lieu_adresse: string
  date_depot: string
  conducteur_depose_id: string
  vehicule_depose_id: string
  remorque_depose_id: string
  notes: string
}

export type RelaisAssignForm = {
  conducteur_reprise_id: string
  vehicule_reprise_id: string
  remorque_reprise_id: string
  date_reprise_prevue: string
  notes: string
}

export type RetourChargeSuggestion = {
  id: string
  reference: string
  client_nom: string
  date_chargement_prevue: string | null
  date_livraison_prevue: string | null
  nature_marchandise: string | null
  prix_ht: number | null
  distance_km: number | null
  dist_vide_km: number | null
  score_rentabilite: number
  duree_vide_estimee_h: number | null
  retour_depot_ok: boolean
  explication_ia: string | null
  ia_provider: string
}

export type RetourChargeForm = {
  vehicule_id: string
  date_debut: string
  date_fin: string
  retour_depot_avant: string
  rayon_km: number
}
export type SiteUsageType = 'chargement' | 'livraison' | 'mixte'
export type SiteKind = 'chargement' | 'livraison'
export type SiteDraft = {
  entreprise_id: string
  nom: string
  adresse: string
  usage_type: SiteUsageType
  horaires_ouverture: string
  jours_ouverture: string
  notes_livraison: string
  latitude: number | null
  longitude: number | null
  showMap: boolean
}
export type SiteLoadRow = {
  id: string
  nom: string
  adresse: string
  entreprise_id?: string | null
  company_id?: number | null
  usage_type?: string | null
  horaires_ouverture?: string | null
  jours_ouverture?: string | null
  notes_livraison?: string | null
  latitude?: number | null
  longitude?: number | null
  code_postal?: string | null
  contact_nom?: string | null
  contact_tel?: string | null
  est_depot_relais?: boolean | null
  ville?: string | null
  pays?: string | null
  type_site?: string | null
  capacite_m3?: number | null
  notes?: string | null
  created_at?: string | null
  updated_at?: string | null
}
export type GeneratedInlineEvent = {
  id: string
  rowId: string
  label: string
  dateStart: string
  dateEnd: string
  color: string
  kind: Exclude<PlanningInlineType, 'course'>
}
export type PlanningUrgence = {
  id: string
  level: 'critique' | 'haute' | 'moyenne'
  source: 'retard' | 'non_affectee' | 'conflit'
  label: string
  detail: string
  otId?: string
  rowId?: string
  score: number
}
