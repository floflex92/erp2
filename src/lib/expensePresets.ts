import type { Profil } from './auth'
import type { ExpenseCategory } from './expenseTickets'

export interface ExpensePreset {
  id: string
  label: string
  category: ExpenseCategory
  amount: number
  createdAt: string
  updatedAt: string
  createdByName: string
}

type ExpensePresetState = {
  items: ExpensePreset[]
  seeded: boolean
}

const STORAGE_KEY = 'nexora-expense-presets-v1'
const EVENT_NAME = 'nexora-expense-presets-updated'

function nextId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100_000)}`
}

function readState(): ExpensePresetState {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const fallback = { items: [], seeded: false } satisfies ExpensePresetState
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    return fallback
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ExpensePresetState>
    return {
      items: Array.isArray(parsed.items) ? parsed.items as ExpensePreset[] : [],
      seeded: Boolean(parsed.seeded),
    }
  } catch {
    const fallback = { items: [], seeded: false } satisfies ExpensePresetState
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    return fallback
  }
}

function saveState(state: ExpensePresetState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function buildSeedPreset(input: { label: string; category: ExpenseCategory; amount: number }) {
  const now = new Date().toISOString()
  return {
    id: nextId('expense-preset'),
    label: input.label,
    category: input.category,
    amount: input.amount,
    createdAt: now,
    updatedAt: now,
    createdByName: 'Comptabilite',
  } satisfies ExpensePreset
}

export function ensureExpensePresetSeed() {
  const state = readState()
  if (state.seeded) return

  state.items = [
    buildSeedPreset({ label: 'Forfait repas midi', category: 'repas', amount: 19.4 }),
    buildSeedPreset({ label: 'Forfait repas soir', category: 'repas', amount: 23.8 }),
    buildSeedPreset({ label: 'Forfait nuitee hotel', category: 'hebergement', amount: 95 }),
    buildSeedPreset({ label: 'Forfait stationnement journee', category: 'stationnement', amount: 18 }),
    buildSeedPreset({ label: 'Forfait peage mission regionale', category: 'peage', amount: 42 }),
    buildSeedPreset({ label: 'Forfait representation client', category: 'representation', amount: 60 }),
  ]
  state.seeded = true
  saveState(state)
}

export function listExpensePresets() {
  ensureExpensePresetSeed()
  return readState().items
    .slice()
    .sort((left, right) => left.label.localeCompare(right.label, 'fr-FR'))
}

export function createExpensePreset(input: {
  actor: Profil
  label: string
  category: ExpenseCategory
  amount: number
}) {
  ensureExpensePresetSeed()
  const label = input.label.trim()
  const amount = Math.round(input.amount * 100) / 100
  if (!label) {
    throw new Error('Le libelle du forfait est obligatoire.')
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Le montant du forfait doit etre strictement positif.')
  }

  const state = readState()
  const now = new Date().toISOString()
  state.items.unshift({
    id: nextId('expense-preset'),
    label,
    category: input.category,
    amount,
    createdAt: now,
    updatedAt: now,
    createdByName: [input.actor.prenom, input.actor.nom].filter(Boolean).join(' ') || input.actor.email || 'Comptabilite',
  })
  saveState(state)
}

export function deleteExpensePreset(id: string) {
  const state = readState()
  const nextItems = state.items.filter(item => item.id !== id)
  if (nextItems.length === state.items.length) {
    throw new Error('Forfait introuvable.')
  }
  state.items = nextItems
  saveState(state)
}

export function subscribeExpensePresets(listener: () => void) {
  const handle = () => listener()
  window.addEventListener(EVENT_NAME, handle)
  window.addEventListener('storage', handle)
  return () => {
    window.removeEventListener(EVENT_NAME, handle)
    window.removeEventListener('storage', handle)
  }
}
