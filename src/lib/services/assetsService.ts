import { looseSupabase } from '@/lib/supabaseLoose'

export interface AssetListItem {
  id: string
  company_id: number
  type: 'vehicle' | 'trailer' | 'equipment'
  registration: string | null
  fleet_number: string | null
  status: string
  legacy_vehicule_id?: string | null
  legacy_remorque_id?: string | null
}

export async function listAssets(companyId?: number): Promise<AssetListItem[]> {
  let assetsQuery = looseSupabase
    .from('assets')
    .select('id, company_id, type, registration, fleet_number, status')
    .order('registration', { ascending: true, nullsFirst: false })

  if (typeof companyId === 'number') {
    assetsQuery = assetsQuery.eq('company_id', companyId)
  }

  const assetsRes = await assetsQuery

  if (!assetsRes.error && Array.isArray(assetsRes.data)) {
    return assetsRes.data as AssetListItem[]
  }

  const [vehiculesRes, remorquesRes] = await Promise.all([
    looseSupabase.from('vehicules').select('id, company_id, immatriculation, numero_parc, statut'),
    looseSupabase.from('remorques').select('id, company_id, immatriculation, statut'),
  ])

  const rows: AssetListItem[] = []

  if (Array.isArray(vehiculesRes.data)) {
    for (const v of vehiculesRes.data as Array<Record<string, unknown>>) {
      const rowCompanyId = Number(v.company_id ?? 1)
      if (typeof companyId === 'number' && rowCompanyId !== companyId) continue
      rows.push({
        id: `legacy-vehicule-${String(v.id)}`,
        company_id: rowCompanyId,
        type: 'vehicle',
        registration: typeof v.immatriculation === 'string' ? v.immatriculation : null,
        fleet_number: typeof v.numero_parc === 'string' ? v.numero_parc : null,
        status: typeof v.statut === 'string' ? v.statut : 'active',
        legacy_vehicule_id: typeof v.id === 'string' ? v.id : null,
      })
    }
  }

  if (Array.isArray(remorquesRes.data)) {
    for (const r of remorquesRes.data as Array<Record<string, unknown>>) {
      const rowCompanyId = Number(r.company_id ?? 1)
      if (typeof companyId === 'number' && rowCompanyId !== companyId) continue
      rows.push({
        id: `legacy-remorque-${String(r.id)}`,
        company_id: rowCompanyId,
        type: 'trailer',
        registration: typeof r.immatriculation === 'string' ? r.immatriculation : null,
        fleet_number: null,
        status: typeof r.statut === 'string' ? r.statut : 'active',
        legacy_remorque_id: typeof r.id === 'string' ? r.id : null,
      })
    }
  }

  return rows
}

export async function countActiveVehicles(companyId?: number): Promise<number> {
  const assetsRes = await looseSupabase
    .from('assets')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'vehicle')
    .in('status', ['active', 'maintenance'])
    .maybeSingle()

  if (!assetsRes.error && typeof assetsRes.count === 'number') {
    return assetsRes.count
  }

  let legacyQuery = looseSupabase
    .from('vehicules')
    .select('id', { count: 'exact', head: true })
    .eq('statut', 'en_service')

  if (typeof companyId === 'number') {
    legacyQuery = legacyQuery.eq('company_id', companyId)
  }

  const legacyRes = await legacyQuery
  return legacyRes.count ?? 0
}
