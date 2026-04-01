import { ROLE_LABELS, type Profil, type Role } from './auth'
import { listMockEmployees } from './mock/mockDomain'

export interface StaffMember {
  id: string
  matricule: string
  role: Role
  nom: string
  prenom: string
  email: string | null
  domain: string
}

function fallbackMatricule(memberId: string) {
  const token = memberId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() || 'UNKNOWN'
  return `EMP-${token}`
}

function normalizeMember(profil: Profil): StaffMember {
  return {
    id: profil.id,
    matricule: profil.matricule?.trim() || fallbackMatricule(profil.id),
    role: profil.role,
    nom: profil.nom ?? ROLE_LABELS[profil.role],
    prenom: profil.prenom ?? '',
    email: profil.email ?? null,
    domain: profil.domain ?? ROLE_LABELS[profil.role],
  }
}

export function buildStaffDirectory(extraProfiles: Array<Profil | null | undefined> = []) {
  const map = new Map<string, StaffMember>()

  listMockEmployees().forEach(employee => {
    map.set(employee.id, {
      id: employee.id,
      matricule: fallbackMatricule(employee.id),
      role: employee.role,
      nom: employee.lastName,
      prenom: employee.firstName,
      email: employee.email,
      domain: employee.domain,
    })
  })

  extraProfiles.filter(Boolean).forEach(profil => {
    const member = normalizeMember(profil as Profil)
    map.set(member.id, member)
  })

  return Array.from(map.values()).sort((left, right) =>
    staffDisplayName(left).localeCompare(staffDisplayName(right), 'fr-FR'),
  )
}

export function staffDisplayName(member: Pick<StaffMember, 'prenom' | 'nom' | 'role'>) {
  const fullName = [member.prenom, member.nom].filter(Boolean).join(' ').trim()
  return fullName || ROLE_LABELS[member.role]
}

export function findStaffMember(staff: StaffMember[], id: string | null | undefined) {
  if (!id) return null
  return staff.find(member => member.id === id) ?? null
}
