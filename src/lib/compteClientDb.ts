import { supabase } from '@/lib/supabase'

// ─── Types pour les schémas core / docs / rt / audit ───

export interface CompteErp {
  id: string
  code: string
  nom: string
  statut: 'actif' | 'inactif'
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface Partenaire {
  id: string
  compte_erp_id: string
  code: string | null
  nom: string
  siret: string | null
  email: string | null
  telephone: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface RoleCompte {
  id: string
  compte_erp_id: string
  code: string
  libelle: string
}

export interface UtilisateurCompte {
  id: string
  compte_erp_id: string
  role_compte_id: string
  user_auth_id: string | null
  email: string
  nom: string | null
  prenom: string | null
  actif: boolean
  created_at: string
  archived_at: string | null
}

export interface OrdreTransportCompte {
  id: string
  compte_erp_id: string
  partenaire_id: string
  destinataire_final_id: string | null
  reference: string
  statut_transport: string
  date_chargement_prevue: string | null
  date_livraison_prevue: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface DocumentCompte {
  id: string
  compte_erp_id: string
  ordre_transport_id: string | null
  type_document: string
  nom_fichier: string
  storage_path: string | null
  created_at: string
  archived_at: string | null
}

export interface MessageCompte {
  id: string
  compte_erp_id: string
  ordre_transport_id: string | null
  auteur_user_id: string | null
  contenu: string
  created_at: string
  archived_at: string | null
}

export interface EvenementTransport {
  id: string
  compte_erp_id: string
  ordre_transport_id: string | null
  type_evenement: string
  payload: Record<string, unknown>
  created_at: string
}

export interface NotificationCompte {
  id: string
  compte_erp_id: string
  user_id: string | null
  type_notification: string
  payload: Record<string, unknown>
  lu_at: string | null
  created_at: string
}

export interface JournalAction {
  id: string
  compte_erp_id: string
  acteur_user_id: string | null
  action: string
  table_cible: string
  cible_id: string | null
  payload_before: Record<string, unknown> | null
  payload_after: Record<string, unknown> | null
  created_at: string
}

// ─── Helpers pour schémas custom ───

function core() { return (supabase as any).schema('core') }
function docs() { return (supabase as any).schema('docs') }
function rt() { return (supabase as any).schema('rt') }
function audit() { return (supabase as any).schema('audit') }

// ─── Comptes ERP ───

export async function listComptes() {
  const { data, error } = await core().from('comptes_erp').select('*').is('archived_at', null).order('nom')
  return { data: data as CompteErp[] | null, error }
}

// ─── Partenaires ───

export async function listPartenaires(compteErpId: string) {
  const { data, error } = await core().from('partenaires').select('*').eq('compte_erp_id', compteErpId).is('archived_at', null).order('nom')
  return { data: data as Partenaire[] | null, error }
}

export async function upsertPartenaire(p: Partial<Partenaire> & { compte_erp_id: string; nom: string }) {
  if (p.id) {
    const { data, error } = await core().from('partenaires').update({ nom: p.nom, siret: p.siret, email: p.email, telephone: p.telephone }).eq('id', p.id).select('*').single()
    return { data: data as Partenaire | null, error }
  }
  const { data, error } = await core().from('partenaires').insert(p).select('*').single()
  return { data: data as Partenaire | null, error }
}

export async function archivePartenaire(id: string) {
  const { error } = await core().from('partenaires').update({ archived_at: new Date().toISOString() }).eq('id', id)
  return { error }
}

// ─── Utilisateurs compte ───

export async function listUtilisateurs(compteErpId: string) {
  const { data, error } = await core().from('utilisateurs_compte').select('*').eq('compte_erp_id', compteErpId).is('archived_at', null).order('nom')
  return { data: data as UtilisateurCompte[] | null, error }
}

export async function listRoles(compteErpId: string) {
  const { data, error } = await core().from('roles_compte').select('*').eq('compte_erp_id', compteErpId).order('code')
  return { data: data as RoleCompte[] | null, error }
}

export async function upsertUtilisateur(u: Partial<UtilisateurCompte> & { compte_erp_id: string; role_compte_id: string; email: string }) {
  if (u.id) {
    const { data, error } = await core().from('utilisateurs_compte').update({ nom: u.nom, prenom: u.prenom, role_compte_id: u.role_compte_id, actif: u.actif }).eq('id', u.id).select('*').single()
    return { data: data as UtilisateurCompte | null, error }
  }
  const { data, error } = await core().from('utilisateurs_compte').insert(u).select('*').single()
  return { data: data as UtilisateurCompte | null, error }
}

// ─── Ordres Transport (vue compte) ───

export async function listOrdresTransport(compteErpId: string) {
  const { data, error } = await core().from('ordres_transport').select('*').eq('compte_erp_id', compteErpId).is('archived_at', null).order('created_at', { ascending: false }).limit(100)
  return { data: data as OrdreTransportCompte[] | null, error }
}

export async function createOrdreTransport(ot: { compte_erp_id: string; partenaire_id: string; reference: string; date_chargement_prevue?: string; date_livraison_prevue?: string }) {
  const { data, error } = await core().from('ordres_transport').insert(ot).select('*').single()
  return { data: data as OrdreTransportCompte | null, error }
}

export async function updateStatutOT(id: string, statut: string) {
  const { error } = await core().from('ordres_transport').update({ statut_transport: statut }).eq('id', id)
  return { error }
}

// ─── Documents ───

export async function listDocuments(compteErpId: string, otId?: string) {
  let query = docs().from('documents').select('*').eq('compte_erp_id', compteErpId).is('archived_at', null).order('created_at', { ascending: false })
  if (otId) query = query.eq('ordre_transport_id', otId)
  const { data, error } = await query
  return { data: data as DocumentCompte[] | null, error }
}

export async function createDocument(doc: { compte_erp_id: string; ordre_transport_id?: string; type_document: string; nom_fichier: string; storage_path?: string }) {
  const { data, error } = await docs().from('documents').insert(doc).select('*').single()
  return { data: data as DocumentCompte | null, error }
}

// ─── Messages ───

export async function listMessages(compteErpId: string, otId?: string) {
  let query = core().from('messages').select('*').eq('compte_erp_id', compteErpId).is('archived_at', null).order('created_at', { ascending: false }).limit(100)
  if (otId) query = query.eq('ordre_transport_id', otId)
  const { data, error } = await query
  return { data: data as MessageCompte[] | null, error }
}

export async function sendMessage(msg: { compte_erp_id: string; ordre_transport_id?: string; contenu: string }) {
  const { data, error } = await core().from('messages').insert(msg).select('*').single()
  return { data: data as MessageCompte | null, error }
}

// ─── Événements RT ───

export async function listEvenements(compteErpId: string, limit = 50) {
  const { data, error } = await rt().from('evenements_transport').select('*').eq('compte_erp_id', compteErpId).order('created_at', { ascending: false }).limit(limit)
  return { data: data as EvenementTransport[] | null, error }
}

// ─── Notifications ───

export async function listNotifications(compteErpId: string, limit = 30) {
  const { data, error } = await rt().from('notifications').select('*').eq('compte_erp_id', compteErpId).order('created_at', { ascending: false }).limit(limit)
  return { data: data as NotificationCompte[] | null, error }
}

export async function markNotificationRead(id: string) {
  const { error } = await rt().from('notifications').update({ lu_at: new Date().toISOString() }).eq('id', id)
  return { error }
}

// ─── Audit ───

export async function listJournalActions(compteErpId: string, limit = 50) {
  const { data, error } = await audit().from('journal_actions').select('*').eq('compte_erp_id', compteErpId).order('created_at', { ascending: false }).limit(limit)
  return { data: data as JournalAction[] | null, error }
}
