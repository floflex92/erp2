import { describe, expect, it } from 'vitest'
import { normalizeTenantDepotSites } from './depotSites'

describe('normalizeTenantDepotSites', () => {
  it('retient les centres du tenant et trie le centre principal en tete', () => {
    const result = normalizeTenantDepotSites([
      { id: '2', nom: 'Annexe', type_site: 'depot', is_primary: false, company_id: 12, clients: { code_client: 'TENANT_INTERNE_12' }, entreprise_id: 'ent-1' },
      { id: '1', nom: 'Hub principal', type_site: 'depot', is_primary: true, company_id: 12, clients: [{ code_client: 'TENANT_INTERNE_12' }], entreprise_id: 'ent-1' },
      { id: '3', nom: 'Legacy centre', type_site: 'entrepot', is_primary: false, company_id: null, entreprise_id: null },
    ], 12)

    expect(result.map(site => site.id)).toEqual(['1', '2', '3'])
    expect(result[2]).toMatchObject({ company_id: 12, nom: 'Legacy centre' })
  })

  it('exclut les sites clients et les centres rattaches a un autre tenant', () => {
    const result = normalizeTenantDepotSites([
      { id: 'x', nom: 'Client', type_site: 'client', is_primary: false, company_id: 12 },
      { id: 'y', nom: 'Autre tenant', type_site: 'depot', is_primary: false, company_id: 99, clients: { code_client: 'TENANT_INTERNE_99' }, entreprise_id: 'ent-99' },
      { id: 'z', nom: 'Centre ok', type_site: 'depot', is_primary: false, company_id: 12, clients: { code_client: 'TENANT_INTERNE_12' }, entreprise_id: 'ent-12' },
    ], 12)

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('z')
  })
})