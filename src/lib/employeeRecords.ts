import type { Role } from './auth'

export interface EmployeeRecord {
  employeeId: string
  matricule: string
  role: Role
  firstName: string
  lastName: string
  professionalEmail: string
  loginEmail: string | null
  provisionalCode: string | null
  contractType: string | null
  address: string | null
  postalCode: string | null
  city: string | null
  phone: string | null
  personalEmail: string | null
  birthDate: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  socialSecurityNumber: string | null
  maritalStatus: string | null
  childrenCount: number | null
  iban: string | null
  mutuellePlan: string | null
  jobTitle: string | null
  conventionCollective: string
  jobCoefficient: string | null
  hourlyRate: number | null
  monthlyBaseHours: number
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'nexora-employee-records-v1'
const EVENT_NAME = 'nexora-employee-records-updated'

const DEFAULT_CONVENTION = 'CCN transports routiers et activites auxiliaires du transport - IDCC 16'

function readState() {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const fallback = { items: [] as EmployeeRecord[] }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    return fallback
  }
  try {
    const parsed = JSON.parse(raw) as { items?: EmployeeRecord[] }
    return { items: Array.isArray(parsed.items) ? parsed.items : [] }
  } catch {
    const fallback = { items: [] as EmployeeRecord[] }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    return fallback
  }
}

function saveState(state: { items: EmployeeRecord[] }) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function normalizeNamePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export function generateProfessionalEmail(firstName: string, lastName: string) {
  const first = normalizeNamePart(firstName || 'prenom')
  const last = normalizeNamePart(lastName || 'nom')
  return `${first}.${last}@nexora-truck.fr`
}

export function generateEmployeeMatricule(employeeId: string) {
  const token = employeeId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() || 'UNKNOWN'
  return `EMP-${token}`
}

function normalizeRecord(record: Omit<EmployeeRecord, 'matricule'> & { matricule?: string | null }) {
  return {
    ...record,
    matricule: record.matricule?.trim() || generateEmployeeMatricule(record.employeeId),
  } satisfies EmployeeRecord
}

export function generateProvisionalCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}

export function listEmployeeRecords() {
  const state = readState()
  const normalizedItems = state.items.map(item => normalizeRecord(item))
  if (normalizedItems.some((item, index) => item.matricule !== state.items[index].matricule)) {
    saveState({ items: normalizedItems })
  }

  return normalizedItems
    .slice()
    .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, 'fr-FR'))
}

export function getEmployeeRecord(employeeId: string) {
  const state = readState()
  const existing = state.items.find(item => item.employeeId === employeeId)
  if (!existing) return null
  const normalized = normalizeRecord(existing)
  if (normalized.matricule !== existing.matricule) {
    saveState({ items: state.items.map(item => item.employeeId === employeeId ? normalized : item) })
  }
  return normalized
}

export function ensureEmployeeRecord(input: {
  employeeId: string
  matricule?: string | null
  role: Role
  firstName: string
  lastName: string
  professionalEmail?: string | null
  loginEmail?: string | null
  provisionalCode?: string | null
  contractType?: string | null
  jobTitle?: string | null
}) {
  const state = readState()
  const existing = state.items.find(item => item.employeeId === input.employeeId)
  const now = new Date().toISOString()
  const next: EmployeeRecord = {
    employeeId: input.employeeId,
    matricule: input.matricule?.trim() || existing?.matricule || generateEmployeeMatricule(input.employeeId),
    role: input.role,
    firstName: input.firstName,
    lastName: input.lastName,
    professionalEmail: input.professionalEmail || existing?.professionalEmail || generateProfessionalEmail(input.firstName, input.lastName),
    loginEmail: input.loginEmail ?? existing?.loginEmail ?? null,
    provisionalCode: input.provisionalCode ?? existing?.provisionalCode ?? null,
    contractType: input.contractType ?? existing?.contractType ?? null,
    address: existing?.address ?? null,
    postalCode: existing?.postalCode ?? null,
    city: existing?.city ?? null,
    phone: existing?.phone ?? null,
    personalEmail: existing?.personalEmail ?? null,
    birthDate: existing?.birthDate ?? null,
    emergencyContactName: existing?.emergencyContactName ?? null,
    emergencyContactPhone: existing?.emergencyContactPhone ?? null,
    socialSecurityNumber: existing?.socialSecurityNumber ?? null,
    maritalStatus: existing?.maritalStatus ?? null,
    childrenCount: existing?.childrenCount ?? null,
    iban: existing?.iban ?? null,
    mutuellePlan: existing?.mutuellePlan ?? 'Mutuelle Horizon Transport - Formule Equilibre',
    jobTitle: input.jobTitle ?? existing?.jobTitle ?? null,
    conventionCollective: existing?.conventionCollective ?? DEFAULT_CONVENTION,
    jobCoefficient: existing?.jobCoefficient ?? null,
    hourlyRate: existing?.hourlyRate ?? null,
    monthlyBaseHours: existing?.monthlyBaseHours ?? 151.67,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  const nextItems = existing
    ? state.items.map(item => item.employeeId === input.employeeId ? next : item)
    : [...state.items, next]

  saveState({ items: nextItems })
  return next
}

export function updateEmployeeRecord(employeeId: string, patch: Partial<EmployeeRecord>) {
  const state = readState()
  const existing = state.items.find(item => item.employeeId === employeeId)
  if (!existing) return null
  const next: EmployeeRecord = { ...existing, ...patch, updatedAt: new Date().toISOString() }
  saveState({ items: state.items.map(item => item.employeeId === employeeId ? next : item) })
  return next
}

export function subscribeEmployeeRecords(listener: () => void) {
  const handle = () => listener()
  window.addEventListener(EVENT_NAME, handle)
  window.addEventListener('storage', handle)
  return () => {
    window.removeEventListener(EVENT_NAME, handle)
    window.removeEventListener('storage', handle)
  }
}
