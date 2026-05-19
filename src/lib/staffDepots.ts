import { looseSupabase } from '@/lib/supabaseLoose'

export interface DepotSite {
  id: string
  company_id: number
  nom: string
  type_site: string
  is_primary: boolean
}

export interface StaffDepotAssignment {
  id: string
  company_id: number
  depot_site_id: string
  conducteur_id: string | null
  profil_id: string | null
  assigned_at: string
  ended_at: string | null
  assignment_source: 'auto_primary' | 'manual_transfer' | 'manual_create' | 'sync'
  notes: string | null
  depot?: DepotSite | DepotSite[] | null
}

type TransferTarget = {
  companyId: number
  depotSiteId?: string | null
  conducteurId?: string | null
  profilId?: string | null
  source?: StaffDepotAssignment['assignment_source']
  notes?: string | null
}

function withCompanyFilter<T extends { eq: (column: string, value: number) => T }>(query: T, companyId?: number | null) {
  return typeof companyId === 'number' ? query.eq('company_id', companyId) : query
}

export async function listDepotSites(companyId?: number | null): Promise<DepotSite[]> {
  let query = looseSupabase
    .from('sites_logistiques')
    .select('id, company_id, nom, type_site, is_primary')
    .in('type_site', ['depot', 'entrepot'])
    .order('is_primary', { ascending: false })
    .order('nom', { ascending: true })

  query = withCompanyFilter(query, companyId)

  const { data, error } = await query
  if (error) throw error
  return ((data ?? []) as DepotSite[])
}

export async function getPrimaryDepotSite(companyId: number): Promise<DepotSite | null> {
  const sites = await listDepotSites(companyId)
  return sites.find(site => site.is_primary) ?? sites[0] ?? null
}

export async function setPrimaryDepotSite(companyId: number, siteId: string): Promise<void> {
  const { error: resetError } = await looseSupabase
    .from('sites_logistiques')
    .update({ is_primary: false })
    .eq('company_id', companyId)
    .in('type_site', ['depot', 'entrepot'])

  if (resetError) throw resetError

  const { error: setError } = await looseSupabase
    .from('sites_logistiques')
    .update({ is_primary: true })
    .eq('company_id', companyId)
    .eq('id', siteId)

  if (setError) throw setError
}

export async function listActiveDepotAssignments(
  companyIds: number[] | number,
  filters?: { conducteurIds?: string[]; profilIds?: string[] },
): Promise<StaffDepotAssignment[]> {
  const normalizedCompanyIds = Array.isArray(companyIds) ? companyIds.filter(Number.isFinite) : [companyIds]
  if (normalizedCompanyIds.length === 0) return []

  let query = looseSupabase
    .from('staff_depot_assignments')
    .select('id, company_id, depot_site_id, conducteur_id, profil_id, assigned_at, ended_at, assignment_source, notes, depot:sites_logistiques(id, company_id, nom, type_site, is_primary)')
    .in('company_id', normalizedCompanyIds)
    .is('ended_at', null)
    .order('assigned_at', { ascending: false })

  if (filters?.conducteurIds && filters.conducteurIds.length > 0) {
    query = query.in('conducteur_id', filters.conducteurIds)
  }
  if (filters?.profilIds && filters.profilIds.length > 0) {
    query = query.in('profil_id', filters.profilIds)
  }

  const { data, error } = await query
  if (error) throw error
  return ((data ?? []) as StaffDepotAssignment[])
}

async function getCurrentAssignment(target: TransferTarget): Promise<StaffDepotAssignment | null> {
  let query = looseSupabase
    .from('staff_depot_assignments')
    .select('id, company_id, depot_site_id, conducteur_id, profil_id, assigned_at, ended_at, assignment_source, notes')
    .eq('company_id', target.companyId)
    .is('ended_at', null)

  if (target.conducteurId) {
    query = query.eq('conducteur_id', target.conducteurId)
  } else if (target.profilId) {
    query = query.eq('profil_id', target.profilId)
  } else {
    return null
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return (data as StaffDepotAssignment | null) ?? null
}

async function transferDepot(target: TransferTarget): Promise<boolean> {
  const current = await getCurrentAssignment(target)

  if (!target.depotSiteId) {
    if (!current) return false
    const { error } = await looseSupabase
      .from('staff_depot_assignments')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', current.id)
    if (error) throw error
    return true
  }

  if (current?.depot_site_id === target.depotSiteId) return false

  if (current) {
    const { error: closeError } = await looseSupabase
      .from('staff_depot_assignments')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', current.id)
    if (closeError) throw closeError
  }

  const { error: insertError } = await looseSupabase
    .from('staff_depot_assignments')
    .insert({
      company_id: target.companyId,
      depot_site_id: target.depotSiteId,
      conducteur_id: target.conducteurId ?? null,
      profil_id: target.profilId ?? null,
      assignment_source: target.source ?? 'manual_transfer',
      notes: target.notes ?? null,
    })

  if (insertError) throw insertError
  return true
}

export async function transferConducteurToDepot(target: Omit<TransferTarget, 'profilId'>): Promise<boolean> {
  return transferDepot(target)
}

export async function transferProfilToDepot(target: Omit<TransferTarget, 'conducteurId'>): Promise<boolean> {
  return transferDepot(target)
}

export async function ensureConducteurAssignedToPrimaryDepot(companyId: number, conducteurId: string): Promise<boolean> {
  const current = await getCurrentAssignment({ companyId, conducteurId })
  if (current) return false
  const primary = await getPrimaryDepotSite(companyId)
  if (!primary) return false
  return transferConducteurToDepot({
    companyId,
    conducteurId,
    depotSiteId: primary.id,
    source: 'auto_primary',
  })
}

export async function ensureProfilAssignedToPrimaryDepot(companyId: number, profilId: string): Promise<boolean> {
  const current = await getCurrentAssignment({ companyId, profilId })
  if (current) return false
  const primary = await getPrimaryDepotSite(companyId)
  if (!primary) return false
  return transferProfilToDepot({
    companyId,
    profilId,
    depotSiteId: primary.id,
    source: 'auto_primary',
  })
}