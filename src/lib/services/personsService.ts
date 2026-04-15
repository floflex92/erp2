import { looseSupabase } from '@/lib/supabaseLoose'

export interface PersonListItem {
  id: string
  company_id: number
  first_name: string | null
  last_name: string | null
  person_type: string
  matricule: string | null
  email: string | null
  phone: string | null
  status: string
  legacy_conducteur_id?: string | null
  legacy_profil_id?: string | null
}

function normalizeName(firstName: string | null, lastName: string | null) {
  return `${firstName ?? ''} ${lastName ?? ''}`.trim()
}

export async function listPersonsForDirectory(companyId?: number): Promise<PersonListItem[]> {
  let personsQuery = looseSupabase
    .from('persons')
    .select('id, company_id, first_name, last_name, person_type, matricule, email, phone, status')
    .order('last_name', { ascending: true, nullsFirst: false })

  if (typeof companyId === 'number') {
    personsQuery = personsQuery.eq('company_id', companyId)
  }

  const personsRes = await personsQuery

  if (!personsRes.error && Array.isArray(personsRes.data)) {
    return (personsRes.data as PersonListItem[]).map(person => ({
      ...person,
      first_name: person.first_name,
      last_name: person.last_name,
    }))
  }

  const conducteursQuery = looseSupabase
    .from('conducteurs')
    .select('id, company_id, nom, prenom, matricule, email, telephone, statut')
    .order('nom', { ascending: true, nullsFirst: false })

  const profilsQuery = looseSupabase
    .from('profils')
    .select('id, company_id, nom, prenom, matricule, role')
    .order('nom', { ascending: true, nullsFirst: false })

  const [conducteursRes, profilsRes] = await Promise.all([conducteursQuery, profilsQuery])

  const byKey = new Map<string, PersonListItem>()

  if (Array.isArray(conducteursRes.data)) {
    for (const c of conducteursRes.data as Array<Record<string, unknown>>) {
      const cCompanyId = Number(c.company_id ?? 1)
      if (typeof companyId === 'number' && cCompanyId !== companyId) continue

      const firstName = typeof c.prenom === 'string' ? c.prenom : null
      const lastName = typeof c.nom === 'string' ? c.nom : null
      const matricule = typeof c.matricule === 'string' ? c.matricule : null
      const key = `${cCompanyId}:${(matricule ?? normalizeName(firstName, lastName)).toLowerCase()}`

      byKey.set(key, {
        id: `legacy-conducteur-${String(c.id ?? key)}`,
        company_id: cCompanyId,
        first_name: firstName,
        last_name: lastName,
        person_type: 'driver',
        matricule,
        email: typeof c.email === 'string' ? c.email : null,
        phone: typeof c.telephone === 'string' ? c.telephone : null,
        status: typeof c.statut === 'string' ? c.statut : 'active',
        legacy_conducteur_id: typeof c.id === 'string' ? c.id : null,
      })
    }
  }

  if (Array.isArray(profilsRes.data)) {
    for (const p of profilsRes.data as Array<Record<string, unknown>>) {
      const pCompanyId = Number(p.company_id ?? 1)
      if (typeof companyId === 'number' && pCompanyId !== companyId) continue

      const firstName = typeof p.prenom === 'string' ? p.prenom : null
      const lastName = typeof p.nom === 'string' ? p.nom : null
      const matricule = typeof p.matricule === 'string' ? p.matricule : null
      const key = `${pCompanyId}:${(matricule ?? normalizeName(firstName, lastName)).toLowerCase()}`

      if (byKey.has(key)) {
        const existing = byKey.get(key)
        if (existing) {
          existing.legacy_profil_id = typeof p.id === 'string' ? p.id : null
          if (!existing.email && typeof p.role === 'string' && p.role === 'admin') {
            existing.person_type = 'admin'
          }
        }
        continue
      }

      byKey.set(key, {
        id: `legacy-profil-${String(p.id ?? key)}`,
        company_id: pCompanyId,
        first_name: firstName,
        last_name: lastName,
        person_type: typeof p.role === 'string' && p.role === 'conducteur' ? 'driver' : 'employee',
        matricule,
        email: null,
        phone: null,
        status: 'active',
        legacy_profil_id: typeof p.id === 'string' ? p.id : null,
      })
    }
  }

  return [...byKey.values()]
}
