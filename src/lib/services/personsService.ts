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

export interface UnifiedConducteurListItem {
  id: string
  company_id: number
  nom: string
  prenom: string
  matricule: string | null
  email: string | null
  telephone: string | null
  statut: string
  legacy_conducteur_id: string | null
}

function normalizeName(firstName: string | null, lastName: string | null) {
  return `${firstName ?? ''} ${lastName ?? ''}`.trim()
}

function buildDirectoryKey(companyId: number, firstName: string | null, lastName: string | null, matricule: string | null, email?: string | null, fallbackId?: string | null) {
  const normalizedName = normalizeName(firstName, lastName).toLowerCase()
  const normalizedEmail = (email ?? '').trim().toLowerCase()
  const anchor = ((matricule ?? normalizedName) || normalizedEmail || fallbackId || '').toLowerCase()
  return `${companyId}:${anchor}`
}

function isActiveDriverStatus(status: string | null | undefined) {
  return normalizeDriverStatus(status) !== 'inactif'
}

function normalizeDriverStatus(status: string | null | undefined): string {
  const normalized = String(status ?? '').trim().toLowerCase()
  if (!normalized) return 'actif'
  if (['actif', 'active', 'enabled', 'enable', 'ok'].includes(normalized)) return 'actif'
  if (['inactif', 'inactive', 'disabled', 'archive', 'archived'].includes(normalized)) return 'inactif'
  if (['conge', 'congé'].includes(normalized)) return 'conge'
  if (['arret_maladie', 'arrêt_maladie', 'arret maladie', 'arrêt maladie'].includes(normalized)) return 'arret_maladie'
  return normalized
}

export async function listPersonsForDirectory(companyId?: number): Promise<PersonListItem[]> {
  const DRIVER_PROFILE_ROLES = new Set([
    'conducteur',
    'conducteur_affreteur',
    'driver',
    'drivers',
    'chauffeur',
    'chauffeurs',
    'trucker',
    'truckers',
  ])

  let personsQuery = looseSupabase
    .from('persons')
    .select('id, company_id, first_name, last_name, person_type, matricule, email, phone, status')
    .order('last_name', { ascending: true, nullsFirst: false })

  let conducteursQuery = looseSupabase
    .from('conducteurs')
    .select('id, company_id, nom, prenom, matricule, email, telephone, statut')
    .order('nom', { ascending: true, nullsFirst: false })

  let profilsQuery = looseSupabase
    .from('profils')
    .select('id, company_id, nom, prenom, matricule, role')
    .order('nom', { ascending: true, nullsFirst: false })

  if (typeof companyId === 'number') {
    personsQuery = personsQuery.eq('company_id', companyId)
    conducteursQuery = conducteursQuery.eq('company_id', companyId)
    profilsQuery = profilsQuery.eq('company_id', companyId)
  }

  const [personsRes, conducteursRes, profilsRes] = await Promise.all([personsQuery, conducteursQuery, profilsQuery])

  const byKey = new Map<string, PersonListItem>()

  if (Array.isArray(personsRes.data)) {
    for (const p of personsRes.data as PersonListItem[]) {
      const pCompanyId = Number(p.company_id ?? 1)
      const key = buildDirectoryKey(pCompanyId, p.first_name, p.last_name, p.matricule, p.email, p.id)
      byKey.set(key, {
        ...p,
        company_id: pCompanyId,
        first_name: p.first_name,
        last_name: p.last_name,
      })
    }
  }

  if (Array.isArray(conducteursRes.data)) {
    for (const c of conducteursRes.data as Array<Record<string, unknown>>) {
      const cCompanyId = Number(c.company_id ?? 1)
      if (typeof companyId === 'number' && cCompanyId !== companyId) continue

      const firstName = typeof c.prenom === 'string' ? c.prenom : null
      const lastName = typeof c.nom === 'string' ? c.nom : null
      const matricule = typeof c.matricule === 'string' ? c.matricule : null
      const email = typeof c.email === 'string' ? c.email : null
      const conducteurId = typeof c.id === 'string' ? c.id : null
      const key = buildDirectoryKey(cCompanyId, firstName, lastName, matricule, email, conducteurId)

      const existing = byKey.get(key)
      if (existing) {
        existing.legacy_conducteur_id = conducteurId
        existing.person_type = existing.person_type === 'admin' ? existing.person_type : 'driver'
        if (!existing.phone && typeof c.telephone === 'string') existing.phone = c.telephone
        if (!existing.email && email) existing.email = email
        continue
      }

      byKey.set(key, {
        id: `legacy-conducteur-${String(c.id ?? key)}`,
        company_id: cCompanyId,
        first_name: firstName,
        last_name: lastName,
        person_type: 'driver',
        matricule,
        email,
        phone: typeof c.telephone === 'string' ? c.telephone : null,
        status: typeof c.statut === 'string' ? c.statut : 'active',
        legacy_conducteur_id: conducteurId,
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
      const profilId = typeof p.id === 'string' ? p.id : null
      const key = buildDirectoryKey(pCompanyId, firstName, lastName, matricule, null, profilId)

      if (byKey.has(key)) {
        const existing = byKey.get(key)
        if (existing) {
          existing.legacy_profil_id = profilId
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
        person_type: typeof p.role === 'string' && DRIVER_PROFILE_ROLES.has(String(p.role).toLowerCase()) ? 'driver' : 'employee',
        matricule,
        email: null,
        phone: null,
        status: 'active',
        legacy_profil_id: profilId,
      })
    }
  }

  return [...byKey.values()].sort((left, right) => {
    const leftName = `${left.last_name ?? ''} ${left.first_name ?? ''}`.trim().toLowerCase()
    const rightName = `${right.last_name ?? ''} ${right.first_name ?? ''}`.trim().toLowerCase()
    return leftName.localeCompare(rightName, 'fr')
  })
}

export async function listUnifiedConducteurs(
  companyId?: number,
  options?: { activeOnly?: boolean; allowUnlinked?: boolean },
): Promise<UnifiedConducteurListItem[]> {
  const directory = await listPersonsForDirectory(companyId)

  return directory
    .filter(person => ['driver', 'conducteur', 'chauffeur'].includes((person.person_type ?? '').toLowerCase()))
    .filter(person => !options?.activeOnly || isActiveDriverStatus(person.status))
    // By default, keep only entries linked to a real `conducteurs.id`.
    .filter(person => Boolean(person.legacy_conducteur_id) || options?.allowUnlinked === true)
    .map(person => ({
      id: person.legacy_conducteur_id ?? person.id,
      company_id: person.company_id,
      nom: person.last_name ?? '-',
      prenom: person.first_name ?? '',
      matricule: person.matricule ?? null,
      email: person.email ?? null,
      telephone: person.phone ?? null,
      statut: normalizeDriverStatus(person.status),
      legacy_conducteur_id: person.legacy_conducteur_id ?? null,
    }))
    .sort((left, right) => `${left.nom} ${left.prenom}`.localeCompare(`${right.nom} ${right.prenom}`, 'fr'))
}
