import type { TchatAttachment } from './tchatMessage'

export interface VaultRecord {
  id: string
  owner_id: string
  name: string
  mime_type: string
  size: number
  url: string
  source: 'mail' | 'tchat' | 'signature'
  source_label: string
  created_at: string
}

type VaultState = {
  items: VaultRecord[]
}

const STORAGE_KEY = 'nexora-secure-vault-v1'
const EVENT_NAME = 'nexora-secure-vault-updated'

function nextId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100_000)}`
}

function saveState(state: VaultState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function readState(): VaultState {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const fallback = { items: [] } satisfies VaultState
    saveState(fallback)
    return fallback
  }

  try {
    const parsed = JSON.parse(raw) as Partial<VaultState>
    if (Array.isArray(parsed.items)) {
      return {
        items: parsed.items.filter(item => item && typeof item.id === 'string') as VaultRecord[],
      }
    }
  } catch {
    // Ignore and reset below.
  }

  const fallback = { items: [] } satisfies VaultState
  saveState(fallback)
  return fallback
}

export function listVaultRecords(ownerId: string) {
  return readState().items
    .filter(item => item.owner_id === ownerId)
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
}

export function saveAttachmentToVault(
  ownerId: string,
  attachment: TchatAttachment,
  source: 'mail' | 'tchat' | 'signature',
  sourceLabel: string,
) {
  const state = readState()
  const existing = state.items.find(item =>
    item.owner_id === ownerId
    && item.name === attachment.name
    && item.size === attachment.size
    && item.source_label === sourceLabel,
  )
  if (existing) return existing

  const record: VaultRecord = {
    id: nextId('vault'),
    owner_id: ownerId,
    name: attachment.name,
    mime_type: attachment.mimeType,
    size: attachment.size,
    url: attachment.url,
    source,
    source_label: sourceLabel,
    created_at: new Date().toISOString(),
  }
  state.items.unshift(record)
  saveState(state)
  return record
}

export function subscribeVaultUpdates(listener: () => void) {
  const handleUpdate = () => listener()
  window.addEventListener(EVENT_NAME, handleUpdate)
  window.addEventListener('storage', handleUpdate)
  return () => {
    window.removeEventListener(EVENT_NAME, handleUpdate)
    window.removeEventListener('storage', handleUpdate)
  }
}
