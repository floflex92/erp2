import { looseSupabase } from '@/lib/supabaseLoose'

export interface AssetDepotAssignment {
  id: string
  company_id: number
  depot_site_id: string
  vehicule_id: string | null
  remorque_id: string | null
  assigned_at: string
  ended_at: string | null
  assignment_source: 'auto_primary' | 'manual_transfer' | 'manual_create' | 'sync'
  notes: string | null
  depot?: {
    id: string
    company_id: number
    nom: string
    type_site: string
    is_primary: boolean
  } | null
}

type TransferTarget = {
  companyId: number
  depotSiteId?: string | null
  vehiculeId?: string | null
  remorqueId?: string | null
  source?: AssetDepotAssignment['assignment_source']
  notes?: string | null
}

export async function listActiveAssetDepotAssignments(companyId: number): Promise<AssetDepotAssignment[]> {
  const { data, error } = await looseSupabase
    .from('asset_depot_assignments')
    .select('id, company_id, depot_site_id, vehicule_id, remorque_id, assigned_at, ended_at, assignment_source, notes, depot:sites_logistiques(id, company_id, nom, type_site, is_primary)')
    .eq('company_id', companyId)
    .is('ended_at', null)
    .order('assigned_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AssetDepotAssignment[]
}

async function getCurrentAssignment(target: TransferTarget): Promise<AssetDepotAssignment | null> {
  let query = looseSupabase
    .from('asset_depot_assignments')
    .select('id, company_id, depot_site_id, vehicule_id, remorque_id, assigned_at, ended_at, assignment_source, notes')
    .eq('company_id', target.companyId)
    .is('ended_at', null)

  if (target.vehiculeId) {
    query = query.eq('vehicule_id', target.vehiculeId)
  } else if (target.remorqueId) {
    query = query.eq('remorque_id', target.remorqueId)
  } else {
    return null
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return (data as AssetDepotAssignment | null) ?? null
}

async function transferAsset(target: TransferTarget): Promise<boolean> {
  const current = await getCurrentAssignment(target)

  if (!target.depotSiteId) {
    if (!current) return false
    const { error } = await looseSupabase
      .from('asset_depot_assignments')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', current.id)
    if (error) throw error
    return true
  }

  if (current?.depot_site_id === target.depotSiteId) return false

  if (current) {
    const { error: closeError } = await looseSupabase
      .from('asset_depot_assignments')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', current.id)
    if (closeError) throw closeError
  }

  const { error: insertError } = await looseSupabase
    .from('asset_depot_assignments')
    .insert({
      company_id: target.companyId,
      depot_site_id: target.depotSiteId,
      vehicule_id: target.vehiculeId ?? null,
      remorque_id: target.remorqueId ?? null,
      assignment_source: target.source ?? 'manual_transfer',
      notes: target.notes ?? null,
    })

  if (insertError) throw insertError
  return true
}

export async function transferVehiculeToDepot(target: Omit<TransferTarget, 'remorqueId'>): Promise<boolean> {
  return transferAsset(target)
}

export async function transferRemorqueToDepot(target: Omit<TransferTarget, 'vehiculeId'>): Promise<boolean> {
  return transferAsset(target)
}
