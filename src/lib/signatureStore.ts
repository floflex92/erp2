import type { Role } from './auth'

export interface SignatureRecord {
  ownerId: string
  ownerName: string
  role: Role
  signatureText: string
  signatureImageUrl: string | null
  isActive: boolean
  updatedAt: string
}

type SignatureState = {
  items: SignatureRecord[]
}

const STORAGE_KEY = 'nexora-signatures-v1'
const EVENT_NAME = 'nexora-signatures-updated'

function readState(): SignatureState {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const fallback = { items: [] } satisfies SignatureState
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    return fallback
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SignatureState>
    if (Array.isArray(parsed.items)) {
      return {
        items: parsed.items.filter(item =>
          item
          && typeof item.ownerId === 'string'
          && typeof item.signatureText === 'string'
          && typeof item.role === 'string',
        ) as SignatureRecord[],
      }
    }
  } catch {
    // Ignore and reset below.
  }

  const fallback = { items: [] } satisfies SignatureState
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
  return fallback
}

function saveState(state: SignatureState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

export function listDigitalSignatures() {
  return readState().items
    .slice()
    .sort((left, right) => left.ownerName.localeCompare(right.ownerName, 'fr-FR'))
}

export function getDigitalSignature(ownerId: string) {
  return readState().items.find(item => item.ownerId === ownerId) ?? null
}

export function upsertDigitalSignature(input: SignatureRecord) {
  const state = readState()
  const next: SignatureRecord = {
    ...input,
    updatedAt: new Date().toISOString(),
  }
  const existingIndex = state.items.findIndex(item => item.ownerId === input.ownerId)
  if (existingIndex >= 0) {
    state.items[existingIndex] = next
  } else {
    state.items.push(next)
  }
  saveState(state)
  return next
}

export function activateDigitalSignature(ownerId: string, active: boolean) {
  const state = readState()
  state.items = state.items.map(item => item.ownerId === ownerId ? { ...item, isActive: active, updatedAt: new Date().toISOString() } : item)
  saveState(state)
}

export function subscribeDigitalSignatures(listener: () => void) {
  const handleUpdate = () => listener()
  window.addEventListener(EVENT_NAME, handleUpdate)
  window.addEventListener('storage', handleUpdate)
  return () => {
    window.removeEventListener(EVENT_NAME, handleUpdate)
    window.removeEventListener('storage', handleUpdate)
  }
}
