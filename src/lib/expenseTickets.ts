import type { Profil, Role } from './auth'
import { ROLE_LABELS } from './auth'
import { DEMO_PROFILES } from './demoUsers'
import { deliverDemoMailToInbox } from './demoMail'
import { serializeTchatPayload, type TchatDraftAttachment } from './tchatMessage'

export type ExpenseCategory =
  | 'repas'
  | 'hebergement'
  | 'carburant'
  | 'peage'
  | 'stationnement'
  | 'representation'
  | 'autre'

export type ExpenseTicketStatus =
  | 'submitted'
  | 'rh_approved'
  | 'accounting_approved'
  | 'rejected'
  | 'paid'

export interface ExpenseTicketAttachment {
  name: string
  mimeType: string
  size: number
  url: string
}

export interface ExpenseTicket {
  id: string
  employeeId: string
  employeeName: string
  employeeEmail: string | null
  employeeRole: Role
  title: string
  category: ExpenseCategory
  presetId: string | null
  presetLabel: string | null
  amount: number
  currency: 'EUR'
  expenseDate: string
  periodKey: string
  description: string
  status: ExpenseTicketStatus
  attachment: ExpenseTicketAttachment | null
  createdAt: string
  updatedAt: string
  submittedById: string
  submittedByName: string
  rhApprovedAt: string | null
  rhApprovedById: string | null
  rhApprovedByName: string | null
  accountingApprovedAt: string | null
  accountingApprovedById: string | null
  accountingApprovedByName: string | null
  rejectedAt: string | null
  rejectedById: string | null
  rejectedByName: string | null
  rejectionReason: string | null
  payrollSlipId: string | null
  payrollPeriodLabel: string | null
}

type ExpenseTicketState = {
  items: ExpenseTicket[]
  seeded: boolean
}

const STORAGE_KEY = 'nexora-expense-tickets-v1'
const EVENT_NAME = 'nexora-expense-tickets-updated'

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  repas: 'Repas',
  hebergement: 'Hebergement',
  carburant: 'Carburant',
  peage: 'Peage',
  stationnement: 'Stationnement',
  representation: 'Representation',
  autre: 'Autre',
}

export const EXPENSE_STATUS_LABELS: Record<ExpenseTicketStatus, string> = {
  submitted: 'A valider RH',
  rh_approved: 'A valider compta',
  accounting_approved: 'Valide pour paie',
  rejected: 'Refuse',
  paid: 'Integre a la paie',
}

function nextId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100_000)}`
}

function readState(): ExpenseTicketState {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const fallback = { items: [], seeded: false } satisfies ExpenseTicketState
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    return fallback
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ExpenseTicketState>
    return {
      items: Array.isArray(parsed.items) ? parsed.items as ExpenseTicket[] : [],
      seeded: Boolean(parsed.seeded),
    }
  } catch {
    const fallback = { items: [], seeded: false } satisfies ExpenseTicketState
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    return fallback
  }
}

function saveState(state: ExpenseTicketState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error(`Lecture impossible pour ${file.name}.`))
    reader.onerror = () => reject(new Error(`Lecture impossible pour ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

const FRENCH_MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function periodKeyFromDate(dateValue: string) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function periodKeyFromLabel(label: string) {
  const normalized = normalizeText(label)
  const direct = normalized.match(/\b(20\d{2})[-/](0[1-9]|1[0-2])\b/)
  if (direct) return `${direct[1]}-${direct[2]}`

  const yearMatch = normalized.match(/\b(20\d{2})\b/)
  const monthIndex = FRENCH_MONTHS.findIndex(month => normalized.includes(month))
  if (yearMatch && monthIndex >= 0) {
    return `${yearMatch[1]}-${String(monthIndex + 1).padStart(2, '0')}`
  }
  return null
}

function canViewAll(role: Role) {
  return role === 'admin' || role === 'dirigeant' || role === 'rh' || role === 'comptable'
}

export function canApproveExpenseAtRh(role: Role) {
  return role === 'admin' || role === 'dirigeant' || role === 'rh'
}

export function canApproveExpenseAtAccounting(role: Role) {
  return role === 'admin' || role === 'dirigeant' || role === 'comptable'
}

function formatCurrency(amount: number) {
  return `${amount.toFixed(2)} EUR`
}

function formatExpenseSubject(ticket: ExpenseTicket) {
  return `${EXPENSE_CATEGORY_LABELS[ticket.category]} - ${ticket.employeeName}`
}

function demoRecipientsByRoles(roles: Role[]) {
  return DEMO_PROFILES.filter(profile => roles.includes(profile.role))
}

function notifyRecipients(recipients: typeof DEMO_PROFILES, subject: string, text: string, attachment: ExpenseTicketAttachment | null, labels: string[]) {
  recipients.forEach(profile => {
    const attachments: TchatDraftAttachment[] = attachment
      ? [{
          id: `attachment-${subject}-${profile.id}`,
          kind: attachment.mimeType.startsWith('image/') ? 'image' : 'document',
          name: attachment.name,
          mimeType: attachment.mimeType,
          size: attachment.size,
          url: attachment.url,
        }]
      : []

    deliverDemoMailToInbox(
      profile,
      'Workflow frais',
      'frais@nexora-truck.fr',
      subject,
      serializeTchatPayload(text, attachments),
      labels,
    )
  })
}

function notifyOnSubmission(ticket: ExpenseTicket) {
  const recipients = demoRecipientsByRoles(['rh', 'comptable'])
  notifyRecipients(
    recipients,
    `Ticket frais ${ticket.employeeName} - ${formatCurrency(ticket.amount)}`,
    `${ticket.employeeName} a soumis une note de frais ${EXPENSE_CATEGORY_LABELS[ticket.category].toLowerCase()} du ${new Date(ticket.expenseDate).toLocaleDateString('fr-FR')}. Validation RH puis comptable attendue.`,
    ticket.attachment,
    ['frais', 'validation'],
  )
}

function notifyEmployee(ticket: ExpenseTicket, subject: string, text: string) {
  const employee = DEMO_PROFILES.find(profile => profile.id === ticket.employeeId)
  if (!employee) return
  notifyRecipients([employee], subject, text, ticket.attachment, ['frais'])
}

function buildSeedTicket(input: {
  employeeId: string
  employeeName: string
  employeeEmail: string | null
  employeeRole: Role
  title: string
  category: ExpenseCategory
  amount: number
  expenseDate: string
  status: ExpenseTicketStatus
  description: string
  attachmentName?: string
}) {
  const now = new Date().toISOString()
  return {
    id: nextId('expense'),
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    employeeEmail: input.employeeEmail,
    employeeRole: input.employeeRole,
    title: input.title,
    category: input.category,
    presetId: null,
    presetLabel: null,
    amount: input.amount,
    currency: 'EUR',
    expenseDate: input.expenseDate,
    periodKey: periodKeyFromDate(input.expenseDate) ?? '',
    description: input.description,
    status: input.status,
    attachment: input.attachmentName ? {
      name: input.attachmentName,
      mimeType: 'application/pdf',
      size: 86_000,
      url: 'data:application/pdf;base64,',
    } : null,
    createdAt: now,
    updatedAt: now,
    submittedById: input.employeeId,
    submittedByName: input.employeeName,
    rhApprovedAt: input.status === 'submitted' ? null : now,
    rhApprovedById: input.status === 'submitted' ? null : 'demo-rh',
    rhApprovedByName: input.status === 'submitted' ? null : 'Emma Marchal',
    accountingApprovedAt: input.status === 'accounting_approved' || input.status === 'paid' ? now : null,
    accountingApprovedById: input.status === 'accounting_approved' || input.status === 'paid' ? 'demo-compta' : null,
    accountingApprovedByName: input.status === 'accounting_approved' || input.status === 'paid' ? 'Claire Petitjean' : null,
    rejectedAt: null,
    rejectedById: null,
    rejectedByName: null,
    rejectionReason: null,
    payrollSlipId: input.status === 'paid' ? 'seed-slip-mar-2026' : null,
    payrollPeriodLabel: input.status === 'paid' ? 'Mars 2026' : null,
  } satisfies ExpenseTicket
}

export function ensureExpenseTicketSeed() {
  const state = readState()
  if (state.seeded) return

  const conducteur = DEMO_PROFILES.find(profile => profile.role === 'conducteur')
  const exploitant = DEMO_PROFILES.find(profile => profile.role === 'exploitant')
  const commercial = DEMO_PROFILES.find(profile => profile.role === 'commercial')
  const seededItems = [
    conducteur && buildSeedTicket({
      employeeId: conducteur.id,
      employeeName: `${conducteur.prenom} ${conducteur.nom}`,
      employeeEmail: conducteur.email,
      employeeRole: conducteur.role,
      title: 'Repas mission Lille',
      category: 'repas',
      amount: 18.9,
      expenseDate: '2026-03-12',
      status: 'rh_approved',
      description: 'Repas pris pendant une mission de nuit sur Lille.',
      attachmentName: 'ticket-repas-lille.pdf',
    }),
    exploitant && buildSeedTicket({
      employeeId: exploitant.id,
      employeeName: `${exploitant.prenom} ${exploitant.nom}`,
      employeeEmail: exploitant.email,
      employeeRole: exploitant.role,
      title: 'Hotel client Bordeaux',
      category: 'hebergement',
      amount: 124.4,
      expenseDate: '2026-03-14',
      status: 'accounting_approved',
      description: 'Nuitee sur site client veille de comite exploitation.',
      attachmentName: 'hotel-bordeaux.pdf',
    }),
    commercial && buildSeedTicket({
      employeeId: commercial.id,
      employeeName: `${commercial.prenom} ${commercial.nom}`,
      employeeEmail: commercial.email,
      employeeRole: commercial.role,
      title: 'Peages rendez-vous client',
      category: 'peage',
      amount: 36.7,
      expenseDate: '2026-02-21',
      status: 'paid',
      description: 'Aller-retour peages pour rendez-vous prospection.',
      attachmentName: 'peages-client.pdf',
    }),
  ].filter(Boolean) as ExpenseTicket[]

  saveState({
    items: [...seededItems, ...state.items],
    seeded: true,
  })
}

export function listExpenseTickets() {
  ensureExpenseTicketSeed()
  return readState().items
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
}

export function listExpenseTicketsForViewer(viewerId: string, viewerRole: Role, employeeFilterId?: string | null) {
  const all = listExpenseTickets()
  if (canViewAll(viewerRole)) {
    return employeeFilterId ? all.filter(item => item.employeeId === employeeFilterId) : all
  }
  return all.filter(item => item.employeeId === viewerId)
}

export async function createExpenseTicket(input: {
  employee: Profil
  actor: Profil
  title: string
  category: ExpenseCategory
  presetId?: string | null
  presetLabel?: string | null
  amount: number
  expenseDate: string
  description: string
  file?: File | null
}) {
  ensureExpenseTicketSeed()
  const attachment = input.file
    ? {
        name: input.file.name,
        mimeType: input.file.type || 'application/octet-stream',
        size: input.file.size,
        url: await fileToDataUrl(input.file),
      }
    : null

  const now = new Date().toISOString()
  const ticket: ExpenseTicket = {
    id: nextId('expense'),
    employeeId: input.employee.id,
    employeeName: [input.employee.prenom, input.employee.nom].filter(Boolean).join(' ') || ROLE_LABELS[input.employee.role],
    employeeEmail: input.employee.email ?? null,
    employeeRole: input.employee.role,
    title: input.title.trim(),
    category: input.category,
    presetId: input.presetId ?? null,
    presetLabel: input.presetLabel ?? null,
    amount: Math.round(input.amount * 100) / 100,
    currency: 'EUR',
    expenseDate: input.expenseDate,
    periodKey: periodKeyFromDate(input.expenseDate) ?? '',
    description: input.description.trim(),
    status: 'submitted',
    attachment,
    createdAt: now,
    updatedAt: now,
    submittedById: input.actor.id,
    submittedByName: [input.actor.prenom, input.actor.nom].filter(Boolean).join(' ') || ROLE_LABELS[input.actor.role],
    rhApprovedAt: null,
    rhApprovedById: null,
    rhApprovedByName: null,
    accountingApprovedAt: null,
    accountingApprovedById: null,
    accountingApprovedByName: null,
    rejectedAt: null,
    rejectedById: null,
    rejectedByName: null,
    rejectionReason: null,
    payrollSlipId: null,
    payrollPeriodLabel: null,
  }

  const state = readState()
  state.items.unshift(ticket)
  saveState(state)
  notifyOnSubmission(ticket)
  return ticket
}

function updateTicket(ticketId: string, mutate: (ticket: ExpenseTicket) => ExpenseTicket) {
  const state = readState()
  let nextTicket: ExpenseTicket | undefined
  state.items = state.items.map(ticket => {
    if (ticket.id !== ticketId) return ticket
    nextTicket = mutate(ticket)
    return nextTicket
  })
  if (!nextTicket) {
    throw new Error('Ticket de frais introuvable.')
  }
  saveState(state)
  return nextTicket as ExpenseTicket
}

export function approveExpenseTicketAtRh(ticketId: string, actor: Profil) {
  const next = updateTicket(ticketId, ticket => {
    if (ticket.status !== 'submitted') return ticket
    return {
      ...ticket,
      status: 'rh_approved',
      updatedAt: new Date().toISOString(),
      rhApprovedAt: new Date().toISOString(),
      rhApprovedById: actor.id,
      rhApprovedByName: [actor.prenom, actor.nom].filter(Boolean).join(' ') || ROLE_LABELS[actor.role],
      rejectionReason: null,
      rejectedAt: null,
      rejectedById: null,
      rejectedByName: null,
    }
  })

  notifyRecipients(
    demoRecipientsByRoles(['comptable']),
    `Validation comptable requise - ${formatExpenseSubject(next)}`,
    `Le ticket de frais ${next.title} pour ${next.employeeName} a ete valide par le service RH et attend la validation comptable.`,
    next.attachment,
    ['frais', 'comptabilite'],
  )
  notifyEmployee(next, 'Note de frais validee RH', `Votre note de frais ${next.title} a ete validee par le service RH.`)
  return next
}

export function approveExpenseTicketAtAccounting(ticketId: string, actor: Profil) {
  const next = updateTicket(ticketId, ticket => {
    if (ticket.status !== 'rh_approved') return ticket
    return {
      ...ticket,
      status: 'accounting_approved',
      updatedAt: new Date().toISOString(),
      accountingApprovedAt: new Date().toISOString(),
      accountingApprovedById: actor.id,
      accountingApprovedByName: [actor.prenom, actor.nom].filter(Boolean).join(' ') || ROLE_LABELS[actor.role],
    }
  })

  notifyEmployee(
    next,
    'Note de frais validee comptabilite',
    `Votre note de frais ${next.title} est validee et sera integree automatiquement a la prochaine fiche de paie de la periode.`,
  )
  return next
}

export function rejectExpenseTicket(ticketId: string, actor: Profil, reason: string) {
  const next = updateTicket(ticketId, ticket => ({
    ...ticket,
    status: 'rejected',
    updatedAt: new Date().toISOString(),
    rejectedAt: new Date().toISOString(),
    rejectedById: actor.id,
    rejectedByName: [actor.prenom, actor.nom].filter(Boolean).join(' ') || ROLE_LABELS[actor.role],
    rejectionReason: reason.trim() || 'Motif non precise',
  }))

  notifyEmployee(
    next,
    'Note de frais refusee',
    `Votre note de frais ${next.title} a ete refusee. Motif: ${next.rejectionReason}.`,
  )
  return next
}

export function sumApprovedExpenseReimbursements(employeeId: string, periodLabel: string) {
  const periodKey = periodKeyFromLabel(periodLabel)
  if (!periodKey) return 0
  return listExpenseTickets()
    .filter(ticket => ticket.employeeId === employeeId && ticket.status === 'accounting_approved' && ticket.periodKey === periodKey)
    .reduce((sum, ticket) => sum + ticket.amount, 0)
}

export function listApprovedExpenseTicketsForPeriod(employeeId: string, periodLabel: string) {
  const periodKey = periodKeyFromLabel(periodLabel)
  if (!periodKey) return [] as ExpenseTicket[]
  return listExpenseTickets()
    .filter(ticket => ticket.employeeId === employeeId && ticket.status === 'accounting_approved' && ticket.periodKey === periodKey)
}

export function markApprovedExpenseTicketsPaid(employeeId: string, periodLabel: string, payrollSlipId: string) {
  const periodKey = periodKeyFromLabel(periodLabel)
  if (!periodKey) return
  const state = readState()
  let changed = false
  state.items = state.items.map(ticket => {
    if (ticket.employeeId !== employeeId || ticket.status !== 'accounting_approved' || ticket.periodKey !== periodKey) return ticket
    changed = true
    return {
      ...ticket,
      status: 'paid',
      updatedAt: new Date().toISOString(),
      payrollSlipId,
      payrollPeriodLabel: periodLabel,
    }
  })
  if (changed) saveState(state)
}

export function subscribeExpenseTickets(listener: () => void) {
  const handle = () => listener()
  window.addEventListener(EVENT_NAME, handle)
  window.addEventListener('storage', handle)
  return () => {
    window.removeEventListener(EVENT_NAME, handle)
    window.removeEventListener('storage', handle)
  }
}
