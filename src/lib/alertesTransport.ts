/**
 * alertesTransport.ts
 * Requêtes Supabase pour générer les alertes proactives transport & facturation.
 */

import { supabase } from '@/lib/supabase'
import { looseSupabase } from '@/lib/supabaseLoose'

// ─── Types publics ──────────────────────────────────────────────────────────────

export type SeveriteAlerte = 'critique' | 'warning' | 'info'
export type CategorieAlerte = 'transport' | 'facturation'

export type TypeAlerte =
  | 'retard_livraison'
  | 'retard_ops_majeur'
  | 'retard_ops_mineur'
  | 'ot_sans_ressource'
  | 'ot_bloque'
  | 'facture_en_retard'
  | 'ot_non_facture'
  | 'facture_brouillon_vieille'

export interface AlerteItem {
  /** Identifiant unique de l'alerte (composé : type + entity_id) */
  id: string
  type: TypeAlerte
  categorie: CategorieAlerte
  severite: SeveriteAlerte
  titre: string
  description: string
  /** Référence lisible (numéro OT, numéro facture…) */
  reference: string
  /** ID de l'entité source */
  entity_id: string
  /** URL cible pour action rapide */
  entity_url: string
  client_nom?: string | null
  conducteur_nom?: string | null
  vehicule_immat?: string | null
  /** Prix HT ou montant TTC selon le type */
  montant?: number | null
  date_echeance?: string | null
  date_livraison_prevue?: string | null
  /** Nombre de jours de retard (positif = retard) */
  jours_retard?: number
  /** Date de création de l'entité source */
  created_at?: string | null
}

// ─── Sévérités par type ─────────────────────────────────────────────────────────

export const SEVERITE_PAR_TYPE: Record<TypeAlerte, SeveriteAlerte> = {
  retard_livraison:        'critique',
  retard_ops_majeur:       'critique',
  facture_en_retard:       'critique',
  ot_sans_ressource:       'warning',
  ot_bloque:               'warning',
  retard_ops_mineur:       'warning',
  ot_non_facture:          'warning',
  facture_brouillon_vieille: 'info',
}

export const LABELS_TYPE: Record<TypeAlerte, string> = {
  retard_livraison:         'Retard livraison',
  retard_ops_majeur:        'Retard opérationnel majeur',
  retard_ops_mineur:        'Retard opérationnel mineur',
  ot_sans_ressource:        'OT sans ressource',
  ot_bloque:                'OT bloqué',
  facture_en_retard:        'Facture en retard',
  ot_non_facture:           'OT livré non facturé',
  facture_brouillon_vieille: 'Facture brouillon ancienne',
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function joursRetard(dateStr: string | null | undefined): number {
  if (!dateStr) return 0
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function heuresDepuis(dateStr: string | null | undefined): number {
  if (!dateStr) return 0
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60)
}

function extractNom(raw: unknown): string | null {
  if (!raw) return null
  const obj = (Array.isArray(raw) ? raw[0] : raw) as Record<string, string> | null
  if (!obj) return null
  return obj.nom ?? null
}

function extractCondNom(raw: unknown): string | null {
  if (!raw) return null
  const obj = (Array.isArray(raw) ? raw[0] : raw) as Record<string, string> | null
  if (!obj) return null
  return [obj.prenom, obj.nom].filter(Boolean).join(' ') || null
}

function extractImmat(raw: unknown): string | null {
  if (!raw) return null
  const obj = (Array.isArray(raw) ? raw[0] : raw) as Record<string, string> | null
  return obj?.immatriculation ?? null
}

// ─── 1. OTs avec retard de livraison (date dépassée, OT en cours) ───────────────

export async function fetchRetardsLivraison(): Promise<AlerteItem[]> {
  const ST_EN_COURS = [
    'en_cours_approche_chargement', 'en_chargement', 'en_transit', 'en_livraison',
  ]
  const { data, error } = await supabase
    .from('ordres_transport')
    .select(`
      id, reference, date_livraison_prevue, statut_transport,
      clients(nom),
      conducteurs(nom, prenom),
      vehicules(immatriculation)
    `)
    .in('statut_transport', ST_EN_COURS)
    .lt('date_livraison_prevue', new Date().toISOString())
    .not('date_livraison_prevue', 'is', null)
    .order('date_livraison_prevue', { ascending: true })
    .limit(50)

  if (error || !data) return []

  return (data as Record<string, unknown>[]).map(row => {
    const jr = joursRetard(row.date_livraison_prevue as string | null)
    return {
      id: `retard_livraison::${row.id}`,
      type: 'retard_livraison' as TypeAlerte,
      categorie: 'transport' as CategorieAlerte,
      severite: 'critique' as SeveriteAlerte,
      titre: `OT ${row.reference} — livraison dépassée`,
      description: jr > 0
        ? `Livraison prévue il y a ${jr} jour${jr > 1 ? 's' : ''}`
        : 'Livraison prévue aujourd\'hui dépassée',
      reference: row.reference as string,
      entity_id: row.id as string,
      entity_url: '/transports',
      client_nom: extractNom(row.clients),
      conducteur_nom: extractCondNom(row.conducteurs),
      vehicule_immat: extractImmat(row.vehicules),
      date_livraison_prevue: row.date_livraison_prevue as string | null,
      jours_retard: jr,
    }
  })
}

// ─── 2. OTs avec retard opérationnel (statut_operationnel) ─────────────────────

export async function fetchRetardsOps(): Promise<AlerteItem[]> {
  const { data, error } = await supabase
    .from('ordres_transport')
    .select(`
      id, reference, statut_operationnel, date_livraison_prevue,
      clients(nom),
      conducteurs(nom, prenom),
      vehicules(immatriculation)
    `)
    .in('statut_operationnel', ['retard_mineur', 'retard_majeur'])
    .not('statut_transport', 'in', '("termine","annule")')
    .order('statut_operationnel', { ascending: true })
    .limit(50)

  if (error || !data) return []

  return (data as Record<string, unknown>[]).map(row => {
    const estMajeur = row.statut_operationnel === 'retard_majeur'
    return {
      id: `retard_ops::${row.id}`,
      type: (estMajeur ? 'retard_ops_majeur' : 'retard_ops_mineur') as TypeAlerte,
      categorie: 'transport' as CategorieAlerte,
      severite: (estMajeur ? 'critique' : 'warning') as SeveriteAlerte,
      titre: `OT ${row.reference} — ${estMajeur ? 'retard > 2h' : 'retard < 2h'}`,
      description: `Statut opérationnel : ${estMajeur ? 'Retard majeur (> 2h)' : 'Retard mineur (< 2h)'}`,
      reference: row.reference as string,
      entity_id: row.id as string,
      entity_url: '/ops-center',
      client_nom: extractNom(row.clients),
      conducteur_nom: extractCondNom(row.conducteurs),
      vehicule_immat: extractImmat(row.vehicules),
      date_livraison_prevue: row.date_livraison_prevue as string | null,
    }
  })
}

// ─── 3. OTs planifiés/validés sans conducteur ou sans véhicule ─────────────────

export async function fetchOtsSansRessource(): Promise<AlerteItem[]> {
  const { data, error } = await supabase
    .from('ordres_transport')
    .select(`
      id, reference, statut_transport, date_chargement_prevue,
      conducteur_id, vehicule_id,
      clients(nom)
    `)
    .in('statut_transport', ['valide', 'planifie', 'en_attente_planification'])
    .or('conducteur_id.is.null,vehicule_id.is.null')
    .not('statut', 'eq', 'annule')
    .order('date_chargement_prevue', { ascending: true, nullsFirst: false })
    .limit(50)

  if (error || !data) return []

  return (data as Record<string, unknown>[]).map(row => {
    const manque: string[] = []
    if (!row.conducteur_id) manque.push('conducteur')
    if (!row.vehicule_id) manque.push('véhicule')
    return {
      id: `ot_sans_ressource::${row.id}`,
      type: 'ot_sans_ressource' as TypeAlerte,
      categorie: 'transport' as CategorieAlerte,
      severite: 'warning' as SeveriteAlerte,
      titre: `OT ${row.reference} — ressource manquante`,
      description: `${manque.join(' et ')} non assigné${manque.length > 1 ? 's' : ''}`,
      reference: row.reference as string,
      entity_id: row.id as string,
      entity_url: '/transports',
      client_nom: extractNom(row.clients),
    }
  })
}

// ─── 4. OTs bloqués en attente depuis > 24h ────────────────────────────────────

export async function fetchOtsBlockes(seuilHeures = 24): Promise<AlerteItem[]> {
  const cutoff = new Date(Date.now() - seuilHeures * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('ordres_transport')
    .select(`
      id, reference, statut_transport, updated_at,
      clients(nom)
    `)
    .in('statut_transport', ['en_attente_validation'])
    .lt('updated_at', cutoff)
    .not('statut', 'eq', 'annule')
    .order('updated_at', { ascending: true })
    .limit(50)

  if (error || !data) return []

  return (data as Record<string, unknown>[]).map(row => {
    const h = Math.floor(heuresDepuis(row.updated_at as string))
    return {
      id: `ot_bloque::${row.id}`,
      type: 'ot_bloque' as TypeAlerte,
      categorie: 'transport' as CategorieAlerte,
      severite: 'warning' as SeveriteAlerte,
      titre: `OT ${row.reference} — en attente depuis ${h}h`,
      description: `En attente de validation depuis plus de ${seuilHeures}h`,
      reference: row.reference as string,
      entity_id: row.id as string,
      entity_url: '/transports',
      client_nom: extractNom(row.clients),
      created_at: row.updated_at as string | null,
    }
  })
}

// ─── 5. Factures en retard de paiement ─────────────────────────────────────────

export async function fetchFacturesEnRetard(): Promise<AlerteItem[]> {
  const { data, error } = await supabase
    .from('factures')
    .select(`
      id, numero, date_echeance, statut, montant_ttc,
      clients(nom)
    `)
    .not('statut', 'in', '("payee","annulee")')
    .lt('date_echeance', new Date().toISOString())
    .not('date_echeance', 'is', null)
    .order('date_echeance', { ascending: true })
    .limit(50)

  if (error || !data) return []

  return (data as Record<string, unknown>[]).map(row => {
    const jr = joursRetard(row.date_echeance as string | null)
    return {
      id: `facture_en_retard::${row.id}`,
      type: 'facture_en_retard' as TypeAlerte,
      categorie: 'facturation' as CategorieAlerte,
      severite: 'critique' as SeveriteAlerte,
      titre: `Facture ${row.numero} — impayée (J+${jr})`,
      description: `Échéance dépassée de ${jr} jour${jr > 1 ? 's' : ''}`,
      reference: row.numero as string,
      entity_id: row.id as string,
      entity_url: '/facturation',
      client_nom: extractNom(row.clients),
      montant: row.montant_ttc as number | null,
      date_echeance: row.date_echeance as string | null,
      jours_retard: jr,
    }
  })
}

// ─── 6. OTs livrés non facturés ────────────────────────────────────────────────

export async function fetchOtsNonFactures(): Promise<AlerteItem[]> {
  const { data, error } = await looseSupabase
    .from('ordres_transport')
    .select(`
      id, reference, prix_ht, date_livraison_reelle,
      clients(nom)
    `)
    .eq('statut', 'livre')
    .is('facturation_id', null)
    .not('statut', 'eq', 'annule')
    .order('date_livraison_reelle', { ascending: true, nullsFirst: false })
    .limit(50)

  if (error || !data) return []

  return (data as Record<string, unknown>[]).map(row => {
    const jr = joursRetard(row.date_livraison_reelle as string | null)
    return {
      id: `ot_non_facture::${row.id}`,
      type: 'ot_non_facture' as TypeAlerte,
      categorie: 'facturation' as CategorieAlerte,
      severite: 'warning' as SeveriteAlerte,
      titre: `OT ${row.reference} — livré, non facturé`,
      description: jr > 0 ? `Livré il y a ${jr} jour${jr > 1 ? 's' : ''} — facturation en attente` : 'Livré récemment — facturation en attente',
      reference: row.reference as string,
      entity_id: row.id as string,
      entity_url: '/facturation',
      client_nom: extractNom(row.clients),
      montant: row.prix_ht as number | null,
      jours_retard: jr,
    }
  })
}

// ─── 7. Factures brouillon depuis > 7 jours ────────────────────────────────────

export async function fetchFacturesBrouillonVieilles(seuilJours = 7): Promise<AlerteItem[]> {
  const cutoff = new Date(Date.now() - seuilJours * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('factures')
    .select(`
      id, numero, created_at, montant_ttc,
      clients(nom)
    `)
    .eq('statut', 'brouillon')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(30)

  if (error || !data) return []

  return (data as Record<string, unknown>[]).map(row => {
    const jr = joursRetard(row.created_at as string | null)
    return {
      id: `facture_brouillon::${row.id}`,
      type: 'facture_brouillon_vieille' as TypeAlerte,
      categorie: 'facturation' as CategorieAlerte,
      severite: 'info' as SeveriteAlerte,
      titre: `Facture ${row.numero} — brouillon depuis ${jr}j`,
      description: `Créée il y a ${jr} jour${jr > 1 ? 's' : ''}, toujours en brouillon`,
      reference: row.numero as string,
      entity_id: row.id as string,
      entity_url: '/facturation',
      client_nom: extractNom(row.clients),
      montant: row.montant_ttc as number | null,
      created_at: row.created_at as string | null,
    }
  })
}

// ─── Chargement global ──────────────────────────────────────────────────────────

export interface AlertesResult {
  alertes: AlerteItem[]
  totalCritiques: number
  totalWarnings: number
  totalInfos: number
  total: number
}

export async function fetchToutesAlertes(): Promise<AlertesResult> {
  const [
    retardsLiv,
    retardsOps,
    sanRessource,
    bloques,
    facturesRetard,
    nonFactures,
    brouillonVieux,
  ] = await Promise.allSettled([
    fetchRetardsLivraison(),
    fetchRetardsOps(),
    fetchOtsSansRessource(),
    fetchOtsBlockes(),
    fetchFacturesEnRetard(),
    fetchOtsNonFactures(),
    fetchFacturesBrouillonVieilles(),
  ])

  const alertes: AlerteItem[] = [
    ...(retardsLiv.status  === 'fulfilled' ? retardsLiv.value  : []),
    ...(retardsOps.status  === 'fulfilled' ? retardsOps.value  : []),
    ...(sanRessource.status === 'fulfilled' ? sanRessource.value : []),
    ...(bloques.status     === 'fulfilled' ? bloques.value     : []),
    ...(facturesRetard.status === 'fulfilled' ? facturesRetard.value : []),
    ...(nonFactures.status === 'fulfilled' ? nonFactures.value : []),
    ...(brouillonVieux.status === 'fulfilled' ? brouillonVieux.value : []),
  ]

  // Tri : critiques en premier, puis warnings, puis infos ; à sévérité égale : jours_retard décroissant
  const ORDRE: Record<SeveriteAlerte, number> = { critique: 0, warning: 1, info: 2 }
  alertes.sort((a, b) => {
    const sev = ORDRE[a.severite] - ORDRE[b.severite]
    if (sev !== 0) return sev
    return (b.jours_retard ?? 0) - (a.jours_retard ?? 0)
  })

  const totalCritiques = alertes.filter(a => a.severite === 'critique').length
  const totalWarnings  = alertes.filter(a => a.severite === 'warning').length
  const totalInfos     = alertes.filter(a => a.severite === 'info').length

  return {
    alertes,
    totalCritiques,
    totalWarnings,
    totalInfos,
    total: alertes.length,
  }
}

/**
 * Compte rapide pour le badge sidebar Ops Center.
 * Ne prend en compte que les alertes TRANSPORT opérationnelles critiques :
 * retards en route, retards ops signalés, OTs actifs sans conducteur/véhicule.
 * Les alertes facturation (factures impayées, OTs non facturés) ne sont PAS
 * incluses ici — elles s'affichent dans l'onglet "Alertes auto" uniquement.
 */
export async function countAlertesActives(): Promise<number> {
  const ST_TERMINE_ANNULE = '("termine","annule")'

  const [r1, r2, r3] = await Promise.allSettled([
    // 1. OTs en route avec date de livraison dépassée
    supabase.from('ordres_transport').select('id', { count: 'exact', head: true })
      .in('statut_transport', ['en_cours_approche_chargement', 'en_chargement', 'en_transit', 'en_livraison'])
      .lt('date_livraison_prevue', new Date().toISOString())
      .not('date_livraison_prevue', 'is', null),
    // 2. OTs avec retard opérationnel déclaré
    supabase.from('ordres_transport').select('id', { count: 'exact', head: true })
      .in('statut_operationnel', ['retard_mineur', 'retard_majeur'])
      .not('statut_transport', 'in', ST_TERMINE_ANNULE),
    // 3. OTs actifs (valide/planifié) sans conducteur ou sans véhicule
    supabase.from('ordres_transport').select('id', { count: 'exact', head: true })
      .in('statut_transport', ['valide', 'planifie', 'en_attente_planification'])
      .or('conducteur_id.is.null,vehicule_id.is.null')
      .not('statut_transport', 'in', ST_TERMINE_ANNULE),
  ])

  // Déduplique : un OT peut être dans r1 ET r2, on prend le max par requête
  const counts = [r1, r2, r3].map(r =>
    r.status === 'fulfilled' ? (r.value.count ?? 0) : 0
  )
  return counts.reduce((a, b) => a + b, 0)
}
