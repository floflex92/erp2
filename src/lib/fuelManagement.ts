/**
 * Gestion du carburant avec cuves multi-dépôts, jauges électroniques/manuelles,
 * et commandes TVA pour comptabilité.
 */
import { looseSupabase } from '@/lib/supabaseLoose'

// Les tables carburant ne sont pas encore dans le schéma Supabase généré → looseSupabase
const supabase = looseSupabase

// ── Types & Interfaces ────────────────────────────────────────────────────────

export interface Cuve {
  id: string
  company_id: number
  depot_id: string | null
  depot_nom: string | null
  numero_cuve: string
  type_carburant: 'gazole' | 'essence' | 'adblue' | 'autre'
  capacite_litres: number
  marque: string | null
  modele: string | null
  numero_serie: string | null
  statut: 'active' | 'maintenance' | 'hors_service'
  jauge_electronique: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface NiveauCuve {
  id: string
  cuve_id: string
  date_releve: string
  heure_releve: string | null
  niveau_litres: number
  jauge_type: 'electronique' | 'manuelle'
  releve_par_id: string | null
  releve_par_nom: string | null
  anomalie_suspectee: boolean
  anomalie_description: string | null
  created_at: string
}

export interface Plein {
  id: string
  company_id: number
  vehicule_id: string
  vehicule_immat: string | null
  conducteur_id: string
  conducteur_identifiant_4d: string
  conducteur_code: string
  conducteur_num_parc: string
  date_plein: string
  heure_plein: string | null
  cuve_id: string | null
  cuve_numero: string | null
  litres_verses: number
  prix_unitaire_ttc: number | null
  cout_total_ttc: number | null
  statut: 'enregistre' | 'valide' | 'facture'
  facture_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CommandeCarburant {
  id: string
  company_id: number
  numero_commande: string
  fournisseur_id: string | null
  fournisseur_nom: string
  type_carburant: 'gazole' | 'essence' | 'adblue' | 'autre'
  quantite_litres: number
  date_commande: string
  date_livraison_prevue: string | null
  date_livraison_reelle: string | null
  cuve_id: string | null
  price_unit_ht: number | null
  montant_ht: number | null
  taux_tva: number | null
  montant_tva: number | null
  montant_ttc: number | null
  statut: 'en_attente' | 'livree' | 'facturee' | 'payee'
  facture_num: string | null
  facture_date: string | null
  compte_comptable: string | null
  centre_analytique: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ConsommationVehicule {
  vehicule_id: string
  vehicule_immat: string | null
  periode_debut: string
  periode_fin: string
  litres_consommes: number
  km_parcourus: number | null
  consommation_l_100km: number | null
  cout_total_carburant: number | null
  nombre_pleins: number
}

export interface AnomalieCarburant {
  id: string
  company_id: number
  date_anomalie: string
  type: 'evaporation_cuve' | 'consommation_anormale' | 'perte_cuve' | 'autre'
  cuve_id: string | null
  vehicule_id: string | null
  litres_manquants: number | null
  description: string
  gravite: 'info' | 'warning' | 'critique'
  statut: 'nouveau' | 'enquete' | 'resolu'
  resolution_notes: string | null
  created_at: string
  updated_at: string
}

export interface StatistiquesCarburant {
  cuve_id: string
  nombre_pleins_mois: number
  litres_verses_mois: number
  cout_mois: number | null
  niveau_moyen_pct: number | null
  anomalies_mois: number
}

// ── Cuves ────────────────────────────────────────────────────────────────────

export async function listCuves(companyId: number): Promise<Cuve[]> {
  const { data, error } = await supabase
    .from('carburant_cuves')
    .select('*')
    .eq('company_id', companyId)
    .order('depot_nom, numero_cuve')
  if (error) throw error
  return (data || []) as Cuve[]
}

export async function getCuve(id: string): Promise<Cuve | null> {
  const { data, error } = await supabase
    .from('carburant_cuves')
    .select('*')
    .eq('id', id)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return (data || null) as Cuve | null
}

export async function createCuve(cuve: Omit<Cuve, 'id' | 'created_at' | 'updated_at'>): Promise<Cuve> {
  const { data, error } = await supabase
    .from('carburant_cuves')
    .insert([cuve])
    .select()
    .single()
  if (error) throw error
  return data as Cuve
}

export async function updateCuve(id: string, updates: Partial<Cuve>): Promise<Cuve> {
  const { data, error } = await supabase
    .from('carburant_cuves')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Cuve
}

export async function deleteCuve(id: string): Promise<void> {
  const { error } = await supabase
    .from('carburant_cuves')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Niveaux de Cuve ─────────────────────────────────────────────────────────

export async function getNiveauxCuve(cuveId: string, daysBack = 30): Promise<NiveauCuve[]> {
  const dateLimit = new Date()
  dateLimit.setDate(dateLimit.getDate() - daysBack)
  const { data, error } = await supabase
    .from('carburant_niveaux_cuve')
    .select('*')
    .eq('cuve_id', cuveId)
    .gte('date_releve', dateLimit.toISOString().slice(0, 10))
    .order('date_releve, heure_releve', { ascending: false })
  if (error) throw error
  return (data || []) as NiveauCuve[]
}

export async function recordNiveauCuve(niveau: Omit<NiveauCuve, 'id' | 'created_at'>): Promise<NiveauCuve> {
  const { data, error } = await supabase
    .from('carburant_niveaux_cuve')
    .insert([niveau])
    .select()
    .single()
  if (error) throw error
  return data as NiveauCuve
}

// ── Pleins ──────────────────────────────────────────────────────────────────

export async function listPleins(
  companyId: number,
  opts?: { vehiculeId?: string; dateDebut?: string; dateFin?: string }
): Promise<Plein[]> {
  let query = supabase
    .from('carburant_pleins')
    .select('*')
    .eq('company_id', companyId)

  if (opts?.vehiculeId) query = query.eq('vehicule_id', opts.vehiculeId)
  if (opts?.dateDebut) query = query.gte('date_plein', opts.dateDebut)
  if (opts?.dateFin) query = query.lte('date_plein', opts.dateFin)

  const { data, error } = await query.order('date_plein', { ascending: false })
  if (error) throw error
  return (data || []) as Plein[]
}

export async function createPlein(plein: Omit<Plein, 'id' | 'created_at' | 'updated_at'>): Promise<Plein> {
  const { data, error } = await supabase
    .from('carburant_pleins')
    .insert([plein])
    .select()
    .single()
  if (error) throw error
  return data as Plein
}

export async function updatePlein(id: string, updates: Partial<Plein>): Promise<Plein> {
  const { data, error } = await supabase
    .from('carburant_pleins')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Plein
}

// ── Commandes Carburant ──────────────────────────────────────────────────────

export async function listCommandes(
  companyId: number,
  opts?: { statut?: string; dateDebut?: string; dateFin?: string }
): Promise<CommandeCarburant[]> {
  let query = supabase
    .from('carburant_commandes')
    .select('*')
    .eq('company_id', companyId)

  if (opts?.statut) query = query.eq('statut', opts.statut)
  if (opts?.dateDebut) query = query.gte('date_commande', opts.dateDebut)
  if (opts?.dateFin) query = query.lte('date_commande', opts.dateFin)

  const { data, error } = await query.order('date_commande', { ascending: false })
  if (error) throw error
  return (data || []) as CommandeCarburant[]
}

export async function createCommande(commande: Omit<CommandeCarburant, 'id' | 'created_at' | 'updated_at'>): Promise<CommandeCarburant> {
  const { data, error } = await supabase
    .from('carburant_commandes')
    .insert([commande])
    .select()
    .single()
  if (error) throw error
  return data as CommandeCarburant
}

export async function updateCommande(id: string, updates: Partial<CommandeCarburant>): Promise<CommandeCarburant> {
  const { data, error } = await supabase
    .from('carburant_commandes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as CommandeCarburant
}

// ── Consommations ────────────────────────────────────────────────────────────

export async function getConsommationVehicule(
  vehiculeId: string,
  dateDebut: string,
  dateFin: string
): Promise<ConsommationVehicule | null> {
  const { data, error } = await supabase
    .rpc('calc_consommation_vehicule', {
      p_vehicule_id: vehiculeId,
      p_date_debut: dateDebut,
      p_date_fin: dateFin,
    })

  if (error) throw error
  return (data?.[0] || null) as ConsommationVehicule | null
}

export async function listConsommationsParVehicule(
  companyId: number,
  dateDebut: string,
  dateFin: string
): Promise<ConsommationVehicule[]> {
  // Récupère tous les pleins dans la période
  const { data: pleins, error: pleinsErr } = await supabase
    .from('carburant_pleins')
    .select('vehicule_id, vehicule_immat, litres_verses, cout_total_ttc')
    .eq('company_id', companyId)
    .gte('date_plein', dateDebut)
    .lte('date_plein', dateFin)

  if (pleinsErr) throw pleinsErr

  // Group par véhicule
  const grouped = new Map<string, any[]>()
  for (const plein of pleins || []) {
    const key = plein.vehicule_id
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(plein)
  }

  const result: ConsommationVehicule[] = []
  for (const [vehiculeId, pleinsVehicule] of grouped) {
    const immat = pleinsVehicule[0]?.vehicule_immat
    const litres = pleinsVehicule.reduce((acc, p) => acc + (p.litres_verses || 0), 0)
    const cout = pleinsVehicule.reduce((acc, p) => acc + (p.cout_total_ttc || 0), 0)

    result.push({
      vehicule_id: vehiculeId,
      vehicule_immat: immat || null,
      periode_debut: dateDebut,
      periode_fin: dateFin,
      litres_consommes: litres,
      km_parcourus: null,
      consommation_l_100km: null,
      cout_total_carburant: cout,
      nombre_pleins: pleinsVehicule.length,
    })
  }

  return result
}

// ── Anomalies ────────────────────────────────────────────────────────────────

export async function listAnomalies(
  companyId: number,
  opts?: { statut?: string; type?: string }
): Promise<AnomalieCarburant[]> {
  let query = supabase
    .from('carburant_anomalies')
    .select('*')
    .eq('company_id', companyId)

  if (opts?.statut) query = query.eq('statut', opts.statut)
  if (opts?.type) query = query.eq('type', opts.type)

  const { data, error } = await query.order('date_anomalie', { ascending: false })
  if (error) throw error
  return (data || []) as AnomalieCarburant[]
}

export async function createAnomalie(anomalie: Omit<AnomalieCarburant, 'id' | 'created_at' | 'updated_at'>): Promise<AnomalieCarburant> {
  const { data, error } = await supabase
    .from('carburant_anomalies')
    .insert([anomalie])
    .select()
    .single()
  if (error) throw error
  return data as AnomalieCarburant
}

export async function updateAnomalie(id: string, updates: Partial<AnomalieCarburant>): Promise<AnomalieCarburant> {
  const { data, error } = await supabase
    .from('carburant_anomalies')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as AnomalieCarburant
}

// ── Statistiques ─────────────────────────────────────────────────────────────

export async function getStatsCuve(
  cuveId: string,
  annee: number,
  mois: number
): Promise<StatistiquesCarburant | null> {
  const dateDebut = `${annee}-${String(mois).padStart(2, '0')}-01`
  const dateFin = new Date(annee, mois, 0).toISOString().slice(0, 10)

  const { data: pleins } = await supabase
    .from('carburant_pleins')
    .select('litres_verses, cout_total_ttc')
    .eq('cuve_id', cuveId)
    .gte('date_plein', dateDebut)
    .lte('date_plein', dateFin)

  const { data: niveaux } = await supabase
    .from('carburant_niveaux_cuve')
    .select('niveau_litres')
    .eq('cuve_id', cuveId)
    .gte('date_releve', dateDebut)
    .lte('date_releve', dateFin)

  const { data: anomalies } = await supabase
    .from('carburant_anomalies')
    .select('*')
    .eq('cuve_id', cuveId)
    .gte('date_anomalie', dateDebut)
    .lte('date_anomalie', dateFin)

  const cuve = await getCuve(cuveId)
  if (!cuve) return null

  const niveauxList = (niveaux || []) as any[]
  const niveauMoyen = niveauxList.length > 0
    ? niveauxList.reduce((acc, n) => acc + n.niveau_litres, 0) / niveauxList.length
    : 0
  const niveauMoyenPct = (niveauMoyen / cuve.capacite_litres) * 100

  return {
    cuve_id: cuveId,
    nombre_pleins_mois: (pleins || []).length,
    litres_verses_mois: (pleins || []).reduce((acc: number, p: any) => acc + (p.litres_verses || 0), 0),
    cout_mois: (pleins || []).reduce((acc: number, p: any) => acc + (p.cout_total_ttc || 0), 0),
    niveau_moyen_pct: Math.round(niveauMoyenPct * 10) / 10,
    anomalies_mois: (anomalies || []).length,
  }
}
