import type { Profil, Role } from './auth'
import { listSessionMockEmployees } from './mock/mockDomain'

export const DEMO_USER_PASSWORD = 'Demo2026!'

export type DemoUserSpec = {
  email: string
  password: string
  role: Role
  nom: string
  prenom: string
  domain: string
}

export type DemoProfil = Profil & {
  email: string
  domain: string
  isDemo: true
}

const DEMO_USER_SPECS: DemoUserSpec[] = listSessionMockEmployees().map(employee => ({
  email: employee.email ?? `${employee.id}@erp-demo.fr`,
  password: DEMO_USER_PASSWORD,
  role: employee.role,
  nom: employee.lastName,
  prenom: employee.firstName,
  domain: employee.domain,
}))

export const DEMO_USERS: DemoUserSpec[] = DEMO_USER_SPECS.map(user => ({
  ...user,
  email: user.email.toLowerCase(),
}))

export const DEMO_PROFILES: DemoProfil[] = listSessionMockEmployees().map(employee => ({
  id: employee.id,
  role: employee.role,
  nom: employee.lastName,
  prenom: employee.firstName,
  email: employee.email ?? `${employee.id}@erp-demo.fr`,
  domain: employee.domain,
  isDemo: true,
}))

export function isDemoProfil(profil: Profil | null | undefined): profil is DemoProfil {
  return Boolean(profil && profil.isDemo)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Operation impossible.'
}

function isExistingUserError(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes('already registered')
    || normalized.includes('already been registered')
    || normalized.includes('user already registered')
    || normalized.includes('already exists')
}

async function createAdminUserRequest(accessToken: string, user: DemoUserSpec) {
  const response = await fetch('/.netlify/functions/admin-users', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
    }),
  })

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'Operation impossible.',
    )
  }
}

export async function seedDemoUsersWithToken(accessToken: string) {
  let created = 0
  let existing = 0

  for (const user of DEMO_USERS) {
    try {
      await createAdminUserRequest(accessToken, user)
      created += 1
    } catch (error) {
      const message = getErrorMessage(error)
      if (isExistingUserError(message)) {
        existing += 1
        continue
      }
      throw error
    }
  }

  return {
    created,
    existing,
    total: DEMO_USERS.length,
    password: DEMO_USER_PASSWORD,
  }
}
