import { supabase } from './supabase'
import type { Role } from './auth'
import type { TablesInsert } from './database.types'

export type OnboardingReviewState = 'en_attente' | 'valide' | 'refuse'
export type OnboardingStatus = 'en_verification_commerciale' | 'en_verification_comptable' | 'validee' | 'refusee'
export type TransportRequestStatus = 'soumise' | 'en_etude' | 'acceptee' | 'refusee' | 'modification_demandee'

export type ClientPortalHistoryEntry = {
  at: string
  actorRole: Role | 'system' | 'client'
  actorName: string
  message: string
}

export interface ClientOnboardingRecord {
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
  status: OnboardingStatus
  rejectionReason: string | null
  clientId: string | null
  history: ClientPortalHistoryEntry[]
}

export interface ClientEmployeeAccount {
  id: string
  onboardingId: string
  fullName: string
  email: string
  title: string | null
  permissions: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ClientTransportRequest {
  id: string
  onboardingId: string
  requesterProfileId: string
  submittedAt: string
  updatedAt: string
  reference: string
  pickupAddress: string
  pickupDatetime: string
  deliveryAddress: string
  deliveryDatetime: string
  goodsDescription: string
  packageCount: number | null
  weightKg: number | null
  contactName: string | null
  contactPhone: string | null
  instructions: string | null
  status: TransportRequestStatus
  exploitationNote: string | null
  decidedAt: string | null
  decidedByRole: Role | null
  createdOtId: string | null
  history: ClientPortalHistoryEntry[]
}

export interface ClientInvoiceItem {
  id: string
  numero: string
  statut: string
  dateEmission: string
  dateEcheance: string | null
  datePaiement: string | null
  montantHt: number
  montantTtc: number | null
}

type ClientPortalState = {
  onboardings: ClientOnboardingRecord[]
  employees: ClientEmployeeAccount[]
  transportRequests: ClientTransportRequest[]
}

const STORAGE_KEY = 'nexora-client-portal-v1'
const EVENT_NAME = 'nexora-client-portal-updated'

function nowIso() {
  return new Date().toISOString()
}

function nextId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100_000)}`
}

function defaultState(): ClientPortalState {
  return { onboardings: [], employees: [], transportRequests: [] }
}

function readState(): ClientPortalState {
  if (typeof window === 'undefined') return defaultState()

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const seed = defaultState()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
    return seed
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ClientPortalState>
    return {
      onboardings: Array.isArray(parsed.onboardings) ? parsed.onboardings as ClientOnboardingRecord[] : [],
      employees: Array.isArray(parsed.employees) ? parsed.employees as ClientEmployeeAccount[] : [],
      transportRequests: Array.isArray(parsed.transportRequests) ? parsed.transportRequests as ClientTransportRequest[] : [],
    }
  } catch {
    const seed = defaultState()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
    return seed
  }
}

function writeState(state: ClientPortalState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function pushHistory(
  current: ClientPortalHistoryEntry[],
  entry: Omit<ClientPortalHistoryEntry, 'at'>,
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

async function ensureClientRow(onboarding: ClientOnboardingRecord): Promise<string | null> {
  try {
    const { data: existingBySiret } = await supabase
      .from('clients')
      .select('id')
      .eq('siret', onboarding.siret)
      .maybeSingle()

    if (existingBySiret?.id) return existingBySiret.id

    const payload: TablesInsert<'clients'> = {
      nom: onboarding.companyName,
      type_client: 'chargeur',
      siret: onboarding.siret,
      tva_intra: onboarding.vatNumber,
      email: onboarding.contactEmail,
      telephone: onboarding.contactPhone,
      adresse: onboarding.operationAddress ?? onboarding.billingAddress,
      adresse_facturation: onboarding.billingAddress,
      notes: onboarding.notes,
      actif: true,
      code_client: null,
      ville: null,
      code_postal: null,
      pays: 'France',
      ville_facturation: null,
      code_postal_facturation: null,
      pays_facturation: 'France',
      contact_facturation_nom: null,
      contact_facturation_email: onboarding.contactEmail,
      contact_facturation_telephone: onboarding.contactPhone,
      conditions_paiement: 30,
      type_echeance: 'date_facture_plus_delai',
      jour_echeance: null,
      mode_paiement_defaut: 'virement',
      encours_max: null,
      taux_tva_defaut: 20,
      iban: null,
      bic: null,
      banque: null,
      titulaire_compte: null,
      site_web: null,
    }

    const { data: inserted, error } = await supabase
      .from('clients')
      .insert(payload)
      .select('id')
      .single()

    if (error) return null
    return inserted?.id ?? null
  } catch {
    return null
  }
}

function mapClientReviewStatus(record: ClientOnboardingRecord): OnboardingStatus {
  if (record.commercialReview === 'refuse' || record.comptableReview === 'refuse') return 'refusee'
  if (record.commercialReview === 'valide' && record.comptableReview === 'valide') return 'validee'
  if (record.commercialReview === 'valide') return 'en_verification_comptable'
  return 'en_verification_commerciale'
}

export function subscribeClientPortalUpdates(listener: () => void) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => listener()
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}

export function listClientOnboardings() {
  return readState().onboardings.slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

export function findClientOnboardingForProfile(profileId: string) {
  return listClientOnboardings().find(item => item.ownerProfileId === profileId) ?? null
}

export function submitClientOnboarding(input: {
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

  const next: ClientOnboardingRecord = {
    id: current?.id ?? nextId('onb'),
    ownerProfileId: input.ownerProfileId,
    submittedAt,
    updatedAt: nowIso(),
    companyName: input.companyName.trim(),
    siret: input.siret.trim(),
    vatNumber: input.vatNumber?.trim() || null,
    contactEmail: input.contactEmail.trim().toLowerCase(),
    contactPhone: input.contactPhone?.trim() || null,
    billingAddress: input.billingAddress.trim(),
    operationAddress: input.operationAddress?.trim() || null,
    notes: input.notes?.trim() || null,
    commercialReview: current?.commercialReview ?? 'en_attente',
    comptableReview: current?.comptableReview ?? 'en_attente',
    status: current?.status ?? 'en_verification_commerciale',
    rejectionReason: current?.rejectionReason ?? null,
    clientId: current?.clientId ?? null,
    history: pushHistory(current?.history ?? [], {
      actorRole: 'client',
      actorName: 'Client',
      message: current ? 'Mise a jour du dossier entreprise.' : 'Inscription entreprise envoyee.',
    }),
  }

  next.status = mapClientReviewStatus(next)

  state.onboardings = [next, ...state.onboardings.filter(item => item.id !== next.id)]
  writeState(state)
  return next
}

export async function reviewClientOnboarding(input: {
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
    target.rejectionReason = note ?? 'Refus du dossier entreprise.'
  }

  target.status = mapClientReviewStatus(target)

  if (target.status === 'validee' && !target.clientId) {
    target.clientId = await ensureClientRow(target)
    if (!target.clientId) {
      target.status = 'en_verification_comptable'
      target.comptableReview = 'en_attente'
      target.rejectionReason = 'Integration CRM impossible pour le moment. Reessayer.'
    }
  }

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

export function listClientEmployees(onboardingId: string) {
  return readState().employees
    .filter(item => item.onboardingId === onboardingId)
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
}

export function upsertClientEmployee(input: {
  onboardingId: string
  id?: string | null
  fullName: string
  email: string
  title?: string | null
  permissions: string[]
}) {
  const state = readState()
  const existing = input.id ? state.employees.find(item => item.id === input.id) ?? null : null
  const next: ClientEmployeeAccount = {
    id: existing?.id ?? nextId('emp'),
    onboardingId: input.onboardingId,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    title: input.title?.trim() || null,
    permissions: Array.from(new Set(input.permissions)),
    active: existing?.active ?? true,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  }

  state.employees = [next, ...state.employees.filter(item => item.id !== next.id)]
  writeState(state)
  return next
}

export function setClientEmployeeActive(employeeId: string, active: boolean) {
  const state = readState()
  const employee = state.employees.find(item => item.id === employeeId)
  if (!employee) return null
  employee.active = active
  employee.updatedAt = nowIso()
  writeState(state)
  return employee
}

function isClientRequestEditable(status: TransportRequestStatus) {
  return status === 'soumise' || status === 'en_etude' || status === 'modification_demandee'
}

export function listClientTransportRequests(onboardingId: string) {
  return readState().transportRequests
    .filter(item => item.onboardingId === onboardingId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

export function listAllTransportRequests() {
  return readState().transportRequests.slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

export function submitClientTransportRequest(input: {
  onboardingId: string
  requesterProfileId: string
  reference?: string | null
  pickupAddress: string
  pickupDatetime: string
  deliveryAddress: string
  deliveryDatetime: string
  goodsDescription: string
  packageCount?: number | null
  weightKg?: number | null
  contactName?: string | null
  contactPhone?: string | null
  instructions?: string | null
}) {
  const state = readState()
  const record: ClientTransportRequest = {
    id: nextId('req'),
    onboardingId: input.onboardingId,
    requesterProfileId: input.requesterProfileId,
    submittedAt: nowIso(),
    updatedAt: nowIso(),
    reference: input.reference?.trim() || `REQ-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    pickupAddress: input.pickupAddress.trim(),
    pickupDatetime: input.pickupDatetime,
    deliveryAddress: input.deliveryAddress.trim(),
    deliveryDatetime: input.deliveryDatetime,
    goodsDescription: input.goodsDescription.trim(),
    packageCount: input.packageCount ?? null,
    weightKg: input.weightKg ?? null,
    contactName: input.contactName?.trim() || null,
    contactPhone: input.contactPhone?.trim() || null,
    instructions: input.instructions?.trim() || null,
    status: 'soumise',
    exploitationNote: null,
    decidedAt: null,
    decidedByRole: null,
    createdOtId: null,
    history: [{ at: nowIso(), actorRole: 'client', actorName: 'Client', message: 'Demande transport envoyee.' }],
  }

  state.transportRequests = [record, ...state.transportRequests]
  writeState(state)
  return record
}

export function updateClientTransportRequestByClient(input: {
  requestId: string
  requesterProfileId: string
  patch: Partial<Pick<ClientTransportRequest,
    'pickupAddress'
    | 'pickupDatetime'
    | 'deliveryAddress'
    | 'deliveryDatetime'
    | 'goodsDescription'
    | 'packageCount'
    | 'weightKg'
    | 'contactName'
    | 'contactPhone'
    | 'instructions'
    | 'reference'
  >>
}) {
  const state = readState()
  const target = state.transportRequests.find(item => item.id === input.requestId)
  if (!target) return null
  if (target.requesterProfileId !== input.requesterProfileId) return null
  if (!isClientRequestEditable(target.status)) return null

  target.reference = input.patch.reference?.trim() || target.reference
  target.pickupAddress = input.patch.pickupAddress?.trim() || target.pickupAddress
  target.pickupDatetime = input.patch.pickupDatetime || target.pickupDatetime
  target.deliveryAddress = input.patch.deliveryAddress?.trim() || target.deliveryAddress
  target.deliveryDatetime = input.patch.deliveryDatetime || target.deliveryDatetime
  target.goodsDescription = input.patch.goodsDescription?.trim() || target.goodsDescription
  target.packageCount = typeof input.patch.packageCount === 'number' ? input.patch.packageCount : target.packageCount
  target.weightKg = typeof input.patch.weightKg === 'number' ? input.patch.weightKg : target.weightKg
  target.contactName = input.patch.contactName === undefined ? target.contactName : (input.patch.contactName?.trim() || null)
  target.contactPhone = input.patch.contactPhone === undefined ? target.contactPhone : (input.patch.contactPhone?.trim() || null)
  target.instructions = input.patch.instructions === undefined ? target.instructions : (input.patch.instructions?.trim() || null)
  target.status = 'soumise'
  target.updatedAt = nowIso()
  target.history = pushHistory(target.history, {
    actorRole: 'client',
    actorName: 'Client',
    message: 'Demande transport modifiee puis renvoyee.',
  })

  writeState(state)
  return target
}

async function createOtFromRequest(request: ClientTransportRequest): Promise<string | null> {
  const onboarding = readState().onboardings.find(item => item.id === request.onboardingId)
  if (!onboarding?.clientId) return null

  try {
    const payload: TablesInsert<'ordres_transport'> = {
      client_id: onboarding.clientId,
      reference: request.reference,
      type_transport: 'complet',
      statut: 'confirme',
      date_chargement_prevue: request.pickupDatetime,
      date_livraison_prevue: request.deliveryDatetime,
      nature_marchandise: request.goodsDescription,
      nombre_colis: request.packageCount,
      poids_kg: request.weightKg,
      instructions: request.instructions,
      notes_internes: `Demande client ${request.id}`,
      prix_ht: null,
      taux_tva: 20,
      statut_operationnel: 'en_attente',
    }

    const { data, error } = await supabase
      .from('ordres_transport')
      .insert(payload)
      .select('id')
      .single()

    if (error) return null
    return data?.id ?? null
  } catch {
    return null
  }
}

export async function reviewTransportRequest(input: {
  requestId: string
  reviewerRole: Role
  reviewerName: string
  decision: 'accept' | 'reject' | 'ask_changes' | 'mark_in_review'
  note?: string
}) {
  if (!canExploitReview(input.reviewerRole)) return null

  const state = readState()
  const target = state.transportRequests.find(item => item.id === input.requestId)
  if (!target) return null

  const note = input.note?.trim() || null

  if (input.decision === 'mark_in_review') target.status = 'en_etude'
  if (input.decision === 'ask_changes') target.status = 'modification_demandee'
  if (input.decision === 'reject') target.status = 'refusee'
  if (input.decision === 'accept') {
    target.status = 'acceptee'
    if (!target.createdOtId) {
      target.createdOtId = await createOtFromRequest(target)
      if (!target.createdOtId) {
        target.exploitationNote = [
          note,
          'Validation metier OK, creation OT en base indisponible (a reprendre).',
        ].filter(Boolean).join(' | ')
      }
    }
  }

  target.exploitationNote = note ?? target.exploitationNote
  target.decidedAt = nowIso()
  target.decidedByRole = input.reviewerRole
  target.updatedAt = nowIso()
  target.history = pushHistory(target.history, {
    actorRole: input.reviewerRole,
    actorName: input.reviewerName,
    message: `Decision exploitation: ${input.decision}${note ? ` - ${note}` : ''}`,
  })

  writeState(state)
  return target
}

export async function listInvoicesForClient(clientId: string): Promise<ClientInvoiceItem[]> {
  try {
    const { data, error } = await supabase
      .from('factures')
      .select('id, numero, statut, date_emission, date_echeance, date_paiement, montant_ht, montant_ttc')
      .eq('client_id', clientId)
      .order('date_emission', { ascending: false })

    if (error) return []
    return (data ?? []).map(item => ({
      id: item.id,
      numero: item.numero,
      statut: item.statut,
      dateEmission: item.date_emission,
      dateEcheance: item.date_echeance,
      datePaiement: item.date_paiement,
      montantHt: item.montant_ht,
      montantTtc: item.montant_ttc,
    }))
  } catch {
    return []
  }
}

export const CLIENT_PERMISSION_OPTIONS = [
  { key: 'demandes:create', label: 'Creer des demandes transport' },
  { key: 'demandes:read', label: 'Voir le suivi des demandes' },
  { key: 'factures:read', label: 'Voir la facturation' },
  { key: 'users:manage', label: 'Gerer les comptes employes' },
] as const
