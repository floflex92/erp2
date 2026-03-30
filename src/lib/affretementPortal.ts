import type { Role } from './auth'

export type OnboardingReviewState = 'en_attente' | 'valide' | 'refuse'
export type AffreteurOnboardingStatus = 'en_verification_commerciale' | 'en_verification_comptable' | 'validee' | 'refusee'
export type AffretementContractStatus = 'propose' | 'accepte' | 'refuse' | 'en_cours' | 'termine' | 'annule'
export type AffretementOperationalStatusKey =
  | 'hlp_vers_chargement'
  | 'en_cours_chargement'
  | 'charge'
  | 'en_route_livraison'
  | 'livre'

export type AffretementPortalHistoryEntry = {
  at: string
  actorRole: Role | 'system' | 'affreteur'
  actorName: string
  message: string
}

export type AffretementOperationalUpdate = {
  key: AffretementOperationalStatusKey
  at: string
  note: string | null
  gpsLat: number | null
  gpsLng: number | null
}

export interface AffreteurOnboardingRecord {
  id: string
  ownerProfileId: string
  submittedAt: string
  updatedAt: string
  companyName: string
  siret: string
  vatNumber: string | null
  contactEmail: string
  contactPhone: string | null
  billingAddress: string
  operationAddress: string | null
  notes: string | null
  commercialReview: OnboardingReviewState
  comptableReview: OnboardingReviewState
  status: AffreteurOnboardingStatus
  rejectionReason: string | null
  history: AffretementPortalHistoryEntry[]
}

export interface AffreteurEmployeeAccount {
  id: string
  onboardingId: string
  fullName: string
  email: string
  role: 'gestionnaire' | 'conducteur_affreteur'
  permissions: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface AffreteurDriver {
  id: string
  onboardingId: string
  fullName: string
  email: string
  phone: string | null
  licenseNumber: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface AffreteurVehicle {
  id: string
  onboardingId: string
  plate: string
  brand: string | null
  model: string | null
  capacityKg: number | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface AffreteurEquipment {
  id: string
  onboardingId: string
  label: string
  kind: string
  serialNumber: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface AffretementContract {
  id: string
  otId: string
  onboardingId: string
  status: AffretementContractStatus
  proposedAt: string
  decidedAt: string | null
  updatedAt: string
  proposedByRole: Role
  proposedByName: string
  exploitationNote: string | null
  affreteurNote: string | null
  assignedDriverId: string | null
  assignedVehicleId: string | null
  assignedEquipmentIds: string[]
  operationalUpdates: AffretementOperationalUpdate[]
  history: AffretementPortalHistoryEntry[]
}

type AffretementPortalState = {
  onboardings: AffreteurOnboardingRecord[]
  employees: AffreteurEmployeeAccount[]
  drivers: AffreteurDriver[]
  vehicles: AffreteurVehicle[]
  equipments: AffreteurEquipment[]
  contracts: AffretementContract[]
}

const STORAGE_KEY = 'nexora-affretement-portal-v1'
const EVENT_NAME = 'nexora-affretement-portal-updated'
export const AFFRETEMENT_REQUIRED_OPERATIONAL_FLOW: AffretementOperationalStatusKey[] = [
  'hlp_vers_chargement',
  'en_cours_chargement',
  'charge',
  'en_route_livraison',
  'livre',
]
export const AFFRETEMENT_OPERATIONAL_STATUS_LABELS: Record<AffretementOperationalStatusKey, string> = {
  hlp_vers_chargement: 'HLP vers chargement',
  en_cours_chargement: 'En cours de chargement',
  charge: 'Charge',
  en_route_livraison: 'En route vers livraison',
  livre: 'Livre',
}

function nowIso() {
  return new Date().toISOString()
}

function nextId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100_000)}`
}

function defaultState(): AffretementPortalState {
  return {
    onboardings: [],
    employees: [],
    drivers: [],
    vehicles: [],
    equipments: [],
    contracts: [],
  }
}

function readState(): AffretementPortalState {
  if (typeof window === 'undefined') return defaultState()

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const seed = defaultState()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
    return seed
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AffretementPortalState>
    return {
      onboardings: Array.isArray(parsed.onboardings) ? (parsed.onboardings as AffreteurOnboardingRecord[]) : [],
      employees: Array.isArray(parsed.employees) ? (parsed.employees as AffreteurEmployeeAccount[]) : [],
      drivers: Array.isArray(parsed.drivers) ? (parsed.drivers as AffreteurDriver[]) : [],
      vehicles: Array.isArray(parsed.vehicles) ? (parsed.vehicles as AffreteurVehicle[]) : [],
      equipments: Array.isArray(parsed.equipments) ? (parsed.equipments as AffreteurEquipment[]) : [],
      contracts: Array.isArray(parsed.contracts)
        ? (parsed.contracts as AffretementContract[]).map(contract => ({
            ...contract,
            operationalUpdates: normalizeOperationalUpdates((contract as unknown as { operationalUpdates?: unknown }).operationalUpdates),
          }))
        : [],
    }
  } catch {
    const seed = defaultState()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
    return seed
  }
}

function writeState(state: AffretementPortalState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function pushHistory(
  current: AffretementPortalHistoryEntry[],
  entry: Omit<AffretementPortalHistoryEntry, 'at'>,
) {
  return [...current, { ...entry, at: nowIso() }]
}

function canCommercialReview(role: Role) {
  return role === 'commercial' || role === 'admin' || role === 'dirigeant' || role === 'exploitant'
}

function canComptableReview(role: Role) {
  return role === 'comptable' || role === 'admin' || role === 'dirigeant' || role === 'exploitant'
}

function canExploitReview(role: Role) {
  return role === 'exploitant' || role === 'admin' || role === 'dirigeant'
}

function mapOnboardingStatus(record: AffreteurOnboardingRecord): AffreteurOnboardingStatus {
  if (record.commercialReview === 'refuse' || record.comptableReview === 'refuse') return 'refusee'
  if (record.commercialReview === 'valide' && record.comptableReview === 'valide') return 'validee'
  if (record.commercialReview === 'valide') return 'en_verification_comptable'
  return 'en_verification_commerciale'
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function normalizeOperationalUpdates(value: unknown): AffretementOperationalUpdate[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const raw = entry as Partial<AffretementOperationalUpdate>
      if (!raw.key || typeof raw.key !== 'string') return null
      if (!AFFRETEMENT_REQUIRED_OPERATIONAL_FLOW.includes(raw.key as AffretementOperationalStatusKey)) return null
      return {
        key: raw.key as AffretementOperationalStatusKey,
        at: typeof raw.at === 'string' && raw.at ? raw.at : nowIso(),
        note: typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : null,
        gpsLat: typeof raw.gpsLat === 'number' && Number.isFinite(raw.gpsLat) ? raw.gpsLat : null,
        gpsLng: typeof raw.gpsLng === 'number' && Number.isFinite(raw.gpsLng) ? raw.gpsLng : null,
      } satisfies AffretementOperationalUpdate
    })
    .filter((item): item is AffretementOperationalUpdate => item !== null)
}

export function subscribeAffretementPortalUpdates(listener: () => void) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => listener()
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}

export function listAffreteurOnboardings() {
  return readState().onboardings.slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

export function findAffreteurOnboardingForProfile(profileId: string) {
  return listAffreteurOnboardings().find(item => item.ownerProfileId === profileId) ?? null
}

export function findAffreteurOnboardingForScope(input: {
  profileId?: string | null
  email?: string | null
}) {
  const state = readState()
  const profileId = input.profileId ?? null
  const normalizedEmail = input.email ? normalizeEmail(input.email) : null

  if (profileId) {
    const byOwner = state.onboardings.find(item => item.ownerProfileId === profileId) ?? null
    if (byOwner) return byOwner
  }

  if (normalizedEmail) {
    const byEmployee = state.employees.find(
      item => item.active && normalizeEmail(item.email) === normalizedEmail,
    ) ?? null
    if (byEmployee) {
      return state.onboardings.find(item => item.id === byEmployee.onboardingId) ?? null
    }

    const byContact = state.onboardings.find(
      item => normalizeEmail(item.contactEmail) === normalizedEmail,
    ) ?? null
    if (byContact) return byContact
  }

  return null
}

export function submitAffreteurOnboarding(input: {
  ownerProfileId: string
  companyName: string
  siret: string
  vatNumber?: string | null
  contactEmail: string
  contactPhone?: string | null
  billingAddress: string
  operationAddress?: string | null
  notes?: string | null
}) {
  const state = readState()
  const current = state.onboardings.find(item => item.ownerProfileId === input.ownerProfileId) ?? null
  const submittedAt = current?.submittedAt ?? nowIso()

  const next: AffreteurOnboardingRecord = {
    id: current?.id ?? nextId('aff-onb'),
    ownerProfileId: input.ownerProfileId,
    submittedAt,
    updatedAt: nowIso(),
    companyName: input.companyName.trim(),
    siret: input.siret.trim(),
    vatNumber: input.vatNumber?.trim() || null,
    contactEmail: normalizeEmail(input.contactEmail),
    contactPhone: input.contactPhone?.trim() || null,
    billingAddress: input.billingAddress.trim(),
    operationAddress: input.operationAddress?.trim() || null,
    notes: input.notes?.trim() || null,
    commercialReview: current?.commercialReview ?? 'en_attente',
    comptableReview: current?.comptableReview ?? 'en_attente',
    status: current?.status ?? 'en_verification_commerciale',
    rejectionReason: current?.rejectionReason ?? null,
    history: pushHistory(current?.history ?? [], {
      actorRole: 'affreteur',
      actorName: 'Affreteur',
      message: current ? 'Mise a jour dossier affreteur.' : 'Inscription affreteur envoyee.',
    }),
  }

  next.status = mapOnboardingStatus(next)

  state.onboardings = [next, ...state.onboardings.filter(item => item.id !== next.id)]
  writeState(state)
  return next
}

export function reviewAffreteurOnboarding(input: {
  onboardingId: string
  reviewerRole: Role
  reviewerName: string
  decision: 'approve' | 'reject'
  note?: string
}) {
  const state = readState()
  const target = state.onboardings.find(item => item.id === input.onboardingId)
  if (!target) return null

  const note = input.note?.trim() || null
  const allowCommercial = canCommercialReview(input.reviewerRole)
  const allowComptable = canComptableReview(input.reviewerRole)
  if (!allowCommercial && !allowComptable) return null

  const isApprove = input.decision === 'approve'

  if (allowCommercial && target.commercialReview === 'en_attente') {
    target.commercialReview = isApprove ? 'valide' : 'refuse'
  }

  if (allowComptable && target.comptableReview === 'en_attente' && (target.commercialReview === 'valide' || allowCommercial)) {
    target.comptableReview = isApprove ? 'valide' : 'refuse'
  }

  if (!isApprove) {
    target.rejectionReason = note ?? 'Refus dossier affreteur.'
  }

  target.status = mapOnboardingStatus(target)
  target.updatedAt = nowIso()
  target.history = pushHistory(target.history, {
    actorRole: input.reviewerRole,
    actorName: input.reviewerName,
    message: isApprove
      ? `Validation ${input.reviewerRole}${note ? ` - ${note}` : ''}`
      : `Refus ${input.reviewerRole}${note ? ` - ${note}` : ''}`,
  })

  writeState(state)
  return target
}

export function listAffreteurEmployees(onboardingId: string) {
  return readState().employees
    .filter(item => item.onboardingId === onboardingId)
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
}

export function upsertAffreteurEmployee(input: {
  onboardingId: string
  id?: string | null
  fullName: string
  email: string
  role: 'gestionnaire' | 'conducteur_affreteur'
  permissions: string[]
}) {
  const state = readState()
  const existing = input.id ? state.employees.find(item => item.id === input.id) ?? null : null
  const next: AffreteurEmployeeAccount = {
    id: existing?.id ?? nextId('aff-emp'),
    onboardingId: input.onboardingId,
    fullName: input.fullName.trim(),
    email: normalizeEmail(input.email),
    role: input.role,
    permissions: Array.from(new Set(input.permissions)),
    active: existing?.active ?? true,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  }

  state.employees = [next, ...state.employees.filter(item => item.id !== next.id)]
  writeState(state)
  return next
}

export function setAffreteurEmployeeActive(employeeId: string, active: boolean) {
  const state = readState()
  const target = state.employees.find(item => item.id === employeeId)
  if (!target) return null
  target.active = active
  target.updatedAt = nowIso()
  writeState(state)
  return target
}

export function listAffreteurDrivers(onboardingId: string) {
  return readState().drivers
    .filter(item => item.onboardingId === onboardingId)
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
}

export function upsertAffreteurDriver(input: {
  onboardingId: string
  id?: string | null
  fullName: string
  email: string
  phone?: string | null
  licenseNumber?: string | null
}) {
  const state = readState()
  const existing = input.id ? state.drivers.find(item => item.id === input.id) ?? null : null
  const next: AffreteurDriver = {
    id: existing?.id ?? nextId('aff-driver'),
    onboardingId: input.onboardingId,
    fullName: input.fullName.trim(),
    email: normalizeEmail(input.email),
    phone: input.phone?.trim() || null,
    licenseNumber: input.licenseNumber?.trim() || null,
    active: existing?.active ?? true,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  }

  state.drivers = [next, ...state.drivers.filter(item => item.id !== next.id)]
  writeState(state)
  return next
}

export function setAffreteurDriverActive(driverId: string, active: boolean) {
  const state = readState()
  const target = state.drivers.find(item => item.id === driverId)
  if (!target) return null
  target.active = active
  target.updatedAt = nowIso()
  writeState(state)
  return target
}

export function listAffreteurVehicles(onboardingId: string) {
  return readState().vehicles
    .filter(item => item.onboardingId === onboardingId)
    .sort((a, b) => a.plate.localeCompare(b.plate))
}

export function upsertAffreteurVehicle(input: {
  onboardingId: string
  id?: string | null
  plate: string
  brand?: string | null
  model?: string | null
  capacityKg?: number | null
}) {
  const state = readState()
  const existing = input.id ? state.vehicles.find(item => item.id === input.id) ?? null : null
  const next: AffreteurVehicle = {
    id: existing?.id ?? nextId('aff-veh'),
    onboardingId: input.onboardingId,
    plate: input.plate.trim().toUpperCase(),
    brand: input.brand?.trim() || null,
    model: input.model?.trim() || null,
    capacityKg: input.capacityKg ?? null,
    active: existing?.active ?? true,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  }

  state.vehicles = [next, ...state.vehicles.filter(item => item.id !== next.id)]
  writeState(state)
  return next
}

export function setAffreteurVehicleActive(vehicleId: string, active: boolean) {
  const state = readState()
  const target = state.vehicles.find(item => item.id === vehicleId)
  if (!target) return null
  target.active = active
  target.updatedAt = nowIso()
  writeState(state)
  return target
}

export function listAffreteurEquipments(onboardingId: string) {
  return readState().equipments
    .filter(item => item.onboardingId === onboardingId)
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function upsertAffreteurEquipment(input: {
  onboardingId: string
  id?: string | null
  label: string
  kind: string
  serialNumber?: string | null
}) {
  const state = readState()
  const existing = input.id ? state.equipments.find(item => item.id === input.id) ?? null : null
  const next: AffreteurEquipment = {
    id: existing?.id ?? nextId('aff-eq'),
    onboardingId: input.onboardingId,
    label: input.label.trim(),
    kind: input.kind.trim(),
    serialNumber: input.serialNumber?.trim() || null,
    active: existing?.active ?? true,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  }

  state.equipments = [next, ...state.equipments.filter(item => item.id !== next.id)]
  writeState(state)
  return next
}

export function setAffreteurEquipmentActive(equipmentId: string, active: boolean) {
  const state = readState()
  const target = state.equipments.find(item => item.id === equipmentId)
  if (!target) return null
  target.active = active
  target.updatedAt = nowIso()
  writeState(state)
  return target
}

export function listAffretementContracts() {
  return readState().contracts.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function listAffretementContractsByOnboarding(onboardingId: string) {
  return listAffretementContracts().filter(item => item.onboardingId === onboardingId)
}

export function getAffretementContractByOtId(otId: string) {
  return listAffretementContracts().find(item => item.otId === otId) ?? null
}

function getContractOperationalChecklist(contract: AffretementContract) {
  const doneKeys = new Set(contract.operationalUpdates.map(update => update.key))
  const missingKeys = AFFRETEMENT_REQUIRED_OPERATIONAL_FLOW.filter(key => !doneKeys.has(key))
  const hasDeliveryGpsProof = contract.operationalUpdates.some(
    update => update.key === 'livre' && update.gpsLat !== null && update.gpsLng !== null,
  )
  return {
    doneKeys: Array.from(doneKeys),
    missingKeys,
    hasDeliveryGpsProof,
    readyForCompletion: missingKeys.length === 0 && hasDeliveryGpsProof,
  }
}

export function evaluateAffretementCompletionReadiness(contract: AffretementContract) {
  return getContractOperationalChecklist(contract)
}

export function isAffretementBillingReadyByOtId(otId: string) {
  const contract = getAffretementContractByOtId(otId)
  if (!contract) return true
  return getContractOperationalChecklist(contract).readyForCompletion
}

export function upsertAffretementContractByExploitation(input: {
  otId: string
  onboardingId: string
  reviewerRole: Role
  reviewerName: string
  decision: 'propose' | 'accept' | 'reject' | 'set_in_progress' | 'set_done' | 'cancel'
  note?: string
  driverId?: string | null
  vehicleId?: string | null
  equipmentIds?: string[]
}) {
  if (!canExploitReview(input.reviewerRole)) return null

  const state = readState()
  const existing = state.contracts.find(item => item.otId === input.otId) ?? null
  const note = input.note?.trim() || null

  const next: AffretementContract = {
    id: existing?.id ?? nextId('aff-contract'),
    otId: input.otId,
    onboardingId: input.onboardingId,
    status: existing?.status ?? 'propose',
    proposedAt: existing?.proposedAt ?? nowIso(),
    decidedAt: existing?.decidedAt ?? null,
    updatedAt: nowIso(),
    proposedByRole: existing?.proposedByRole ?? input.reviewerRole,
    proposedByName: existing?.proposedByName ?? input.reviewerName,
    exploitationNote: note ?? existing?.exploitationNote ?? null,
    affreteurNote: existing?.affreteurNote ?? null,
    assignedDriverId: input.driverId === undefined ? (existing?.assignedDriverId ?? null) : input.driverId,
    assignedVehicleId: input.vehicleId === undefined ? (existing?.assignedVehicleId ?? null) : input.vehicleId,
    assignedEquipmentIds: input.equipmentIds === undefined
      ? (existing?.assignedEquipmentIds ?? [])
      : Array.from(new Set(input.equipmentIds)),
    operationalUpdates: normalizeOperationalUpdates(existing?.operationalUpdates ?? []),
    history: existing?.history ?? [],
  }

  if (input.decision === 'propose') {
    next.status = 'propose'
    next.proposedAt = existing?.proposedAt ?? nowIso()
  }
  if (input.decision === 'accept') {
    next.status = 'accepte'
    next.decidedAt = nowIso()
  }
  if (input.decision === 'reject') {
    next.status = 'refuse'
    next.decidedAt = nowIso()
  }
  if (input.decision === 'set_in_progress') next.status = 'en_cours'
  if (input.decision === 'set_done') {
    const checklist = getContractOperationalChecklist(next)
    next.status = checklist.readyForCompletion ? 'termine' : 'en_cours'
  }
  if (input.decision === 'cancel') next.status = 'annule'

  next.history = pushHistory(next.history, {
    actorRole: input.reviewerRole,
    actorName: input.reviewerName,
    message: input.decision === 'set_done' && next.status !== 'termine'
      ? `Decision exploitation ${input.decision} refusee: statuts operatoires incomplets${note ? ` - ${note}` : ''}`
      : `Decision exploitation ${input.decision}${note ? ` - ${note}` : ''}`,
  })

  state.contracts = [next, ...state.contracts.filter(item => item.id !== next.id)]
  writeState(state)
  return next
}

export function updateAffretementContractByAffreteur(input: {
  contractId: string
  onboardingId: string
  actorName: string
  decision: 'accept' | 'reject' | 'set_in_progress' | 'set_done'
  note?: string
  driverId?: string | null
  vehicleId?: string | null
  equipmentIds?: string[]
}) {
  const state = readState()
  const target = state.contracts.find(item => item.id === input.contractId)
  if (!target) return null
  if (target.onboardingId !== input.onboardingId) return null
  target.operationalUpdates = normalizeOperationalUpdates(target.operationalUpdates)

  const note = input.note?.trim() || null
  if (input.decision === 'accept') target.status = 'accepte'
  if (input.decision === 'reject') target.status = 'refuse'
  if (input.decision === 'set_in_progress') target.status = 'en_cours'
  if (input.decision === 'set_done') {
    const checklist = getContractOperationalChecklist(target)
    target.status = checklist.readyForCompletion ? 'termine' : 'en_cours'
  }

  if (input.decision === 'accept' || input.decision === 'reject') {
    target.decidedAt = nowIso()
  }

  if (input.driverId !== undefined) target.assignedDriverId = input.driverId
  if (input.vehicleId !== undefined) target.assignedVehicleId = input.vehicleId
  if (input.equipmentIds !== undefined) target.assignedEquipmentIds = Array.from(new Set(input.equipmentIds))
  if (note) target.affreteurNote = note

  target.updatedAt = nowIso()
  target.history = pushHistory(target.history, {
    actorRole: 'affreteur',
    actorName: input.actorName,
    message: input.decision === 'set_done' && target.status !== 'termine'
      ? `Decision affreteur ${input.decision} refusee: statuts operatoires incomplets${note ? ` - ${note}` : ''}`
      : `Decision affreteur ${input.decision}${note ? ` - ${note}` : ''}`,
  })

  writeState(state)
  return target
}

export function upsertAffretementOperationalUpdate(input: {
  contractId: string
  onboardingId: string
  actorName: string
  key: AffretementOperationalStatusKey
  note?: string
  gpsLat?: number | null
  gpsLng?: number | null
}) {
  const state = readState()
  const target = state.contracts.find(item => item.id === input.contractId)
  if (!target) return null
  if (target.onboardingId !== input.onboardingId) return null

  const nextUpdate: AffretementOperationalUpdate = {
    key: input.key,
    at: nowIso(),
    note: input.note?.trim() || null,
    gpsLat: typeof input.gpsLat === 'number' && Number.isFinite(input.gpsLat) ? input.gpsLat : null,
    gpsLng: typeof input.gpsLng === 'number' && Number.isFinite(input.gpsLng) ? input.gpsLng : null,
  }

  target.operationalUpdates = [
    nextUpdate,
    ...normalizeOperationalUpdates(target.operationalUpdates).filter(update => update.key !== input.key),
  ]
  target.updatedAt = nowIso()
  target.status = target.status === 'accepte' ? 'en_cours' : target.status
  target.history = pushHistory(target.history, {
    actorRole: 'affreteur',
    actorName: input.actorName,
    message: `Statut operationnel ${input.key} renseigne${nextUpdate.note ? ` - ${nextUpdate.note}` : ''}`,
  })

  writeState(state)
  return target
}

export function listAffretementContractsForDriverEmail(email: string) {
  const state = readState()
  const normalized = normalizeEmail(email)
  const driverIds = state.drivers
    .filter(driver => driver.active && normalizeEmail(driver.email) === normalized)
    .map(driver => driver.id)

  if (driverIds.length === 0) return []

  return state.contracts
    .filter(contract => contract.assignedDriverId && driverIds.includes(contract.assignedDriverId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getAffreteurCompanyName(onboardingId: string) {
  return readState().onboardings.find(item => item.id === onboardingId)?.companyName ?? 'Affreteur'
}

export function getAffretementContextByOtId(otId: string) {
  const state = readState()
  const contract = state.contracts.find(item => item.otId === otId) ?? null
  if (!contract) return null

  const onboarding = state.onboardings.find(item => item.id === contract.onboardingId) ?? null
  const driver = contract.assignedDriverId
    ? state.drivers.find(item => item.id === contract.assignedDriverId) ?? null
    : null
  const vehicle = contract.assignedVehicleId
    ? state.vehicles.find(item => item.id === contract.assignedVehicleId) ?? null
    : null

  return {
    contract,
    onboarding,
    driver,
    vehicle,
  }
}

export const AFFRETEUR_EMPLOYEE_PERMISSION_OPTIONS = [
  { key: 'contrats:read', label: 'Voir les contrats affretes' },
  { key: 'contrats:update', label: 'Mettre a jour le statut des contrats' },
  { key: 'drivers:manage', label: 'Gerer les conducteurs affreteur' },
  { key: 'fleet:manage', label: 'Gerer camions et equipements' },
  { key: 'users:manage', label: 'Gerer les comptes employes' },
] as const
