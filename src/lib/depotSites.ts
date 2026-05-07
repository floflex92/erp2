export interface DepotSiteLite {
  id: string
  company_id: number
  nom: string
  type_site: string
  is_primary: boolean
}

type TenantRelation = { code_client?: unknown } | Array<{ code_client?: unknown }> | null | undefined

type RawDepotSite = Record<string, unknown> & {
  clients?: TenantRelation
  entreprise_id?: unknown
}

export function normalizeTenantDepotSites(rawSites: Array<Record<string, unknown>>, tenantCompanyId: number): DepotSiteLite[] {
  return rawSites
    .filter((site): site is RawDepotSite => {
      const typeSite = String(site.type_site ?? '')
      if (typeSite === 'client') return false

      const relation = site.clients
      const client = Array.isArray(relation)
        ? relation[0]
        : relation

      const codeClient = typeof client?.code_client === 'string' ? client.code_client : ''
      const tenantInternalCode = `TENANT_INTERNE_${tenantCompanyId}`

      return !site.entreprise_id || codeClient === tenantInternalCode
    })
    .map(site => ({
      id: String(site.id),
      company_id: typeof site.company_id === 'number' ? site.company_id : tenantCompanyId,
      nom: String(site.nom ?? 'Centre'),
      type_site: String(site.type_site ?? 'depot'),
      is_primary: Boolean(site.is_primary),
    }))
    .sort((a, b) => {
      const primaryDelta = Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary))
      if (primaryDelta !== 0) return primaryDelta
      return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
    })
}