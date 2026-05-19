import { DEMO_PROFILES } from './demoUsers'

export type ChatPresenceState = 'online' | 'away' | 'offline' | 'dnd'

export interface ChatPresenceProfile {
  state: ChatPresenceState
  customStatus: string
  vacationEnabled: boolean
  autoReplyMessage: string
  updatedAt: string
}

type ChatPresenceStateMap = Record<string, ChatPresenceProfile>

const STORAGE_KEY = 'nexora-chat-presence-v1'
const CHAT_PRESENCE_EVENT = 'nexora-chat-presence-updated'

export const CHAT_PRESENCE_CONFIG: Record<ChatPresenceState, { label: string; softClass: string; textClass: string; dotClass: string }> = {
  online: { label: 'Connecte', softClass: 'bg-emerald-500/12', textClass: 'text-emerald-200', dotClass: 'bg-emerald-400' },
  away: { label: 'Absent', softClass: 'bg-amber-500/12', textClass: 'text-amber-200', dotClass: 'bg-amber-400' },
  offline: { label: 'Hors ligne', softClass: 'bg-slate-500/14', textClass: 'text-slate-300', dotClass: 'bg-slate-400' },
  dnd: { label: 'Ne pas deranger', softClass: 'bg-rose-500/12', textClass: 'text-rose-200', dotClass: 'bg-rose-400' },
}

const DEFAULT_AUTO_REPLY = 'Je suis en vacances pour le moment. Je reviens vers vous des mon retour.'

const DEMO_DEFAULTS: Record<string, Partial<ChatPresenceProfile>> = Object.fromEntries(
  DEMO_PROFILES.map(profile => {
    if (profile.role === 'conducteur') {
      return [profile.id, { state: 'away', customStatus: 'Sur la route', vacationEnabled: false }]
    }
    if (profile.role === 'comptable') {
      return [profile.id, { state: 'offline', customStatus: 'Cloture comptable', vacationEnabled: false }]
    }
    if (profile.role === 'rh') {
      return [profile.id, { state: 'dnd', customStatus: 'Entretiens en cours', vacationEnabled: false }]
    }
    return [profile.id, { state: 'online', customStatus: '', vacationEnabled: false }]
  }),
)

function nowIso() {
  return new Date().toISOString()
}

function createDefaultPresence(profileId: string): ChatPresenceProfile {
  const override = DEMO_DEFAULTS[profileId] ?? {}
  return {
    state: override.state ?? 'online',
    customStatus: override.customStatus ?? '',
    vacationEnabled: override.vacationEnabled ?? false,
    autoReplyMessage: override.autoReplyMessage ?? DEFAULT_AUTO_REPLY,
    updatedAt: nowIso(),
  }
}

function normalizePresence(candidate: unknown, profileId: string): ChatPresenceProfile {
  if (!candidate || typeof candidate !== 'object') {
    return createDefaultPresence(profileId)
  }

  const value = candidate as Partial<ChatPresenceProfile>
  return {
    state: value.state === 'away' || value.state === 'offline' || value.state === 'dnd' ? value.state : 'online',
    customStatus: typeof value.customStatus === 'string' ? value.customStatus : '',
    vacationEnabled: Boolean(value.vacationEnabled),
    autoReplyMessage: typeof value.autoReplyMessage === 'string' && value.autoReplyMessage.trim()
      ? value.autoReplyMessage
      : DEFAULT_AUTO_REPLY,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : nowIso(),
  }
}

function savePresenceState(state: ChatPresenceStateMap) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(CHAT_PRESENCE_EVENT))
}

export function readChatPresenceState() {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const seeded = Object.fromEntries(DEMO_PROFILES.map(profile => [profile.id, createDefaultPresence(profile.id)]))
    savePresenceState(seeded)
    return seeded
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const normalized = Object.fromEntries(
      Object.entries(parsed).map(([profileId, presence]) => [profileId, normalizePresence(presence, profileId)]),
    )
    return normalized
  } catch {
    const reseeded = Object.fromEntries(DEMO_PROFILES.map(profile => [profile.id, createDefaultPresence(profile.id)]))
    savePresenceState(reseeded)
    return reseeded
  }
}

export function getChatPresence(profileId: string) {
  const state = readChatPresenceState()
  if (!state[profileId]) {
    state[profileId] = createDefaultPresence(profileId)
    savePresenceState(state)
  }
  return state[profileId]
}

export function getChatPresenceMap(profileIds: string[]) {
  const state = readChatPresenceState()
  let changed = false
  const result: ChatPresenceStateMap = {}

  for (const profileId of profileIds) {
    if (!state[profileId]) {
      state[profileId] = createDefaultPresence(profileId)
      changed = true
    }
    result[profileId] = state[profileId]
  }

  if (changed) savePresenceState(state)
  return result
}

export function updateChatPresence(profileId: string, patch: Partial<ChatPresenceProfile>) {
  const state = readChatPresenceState()
  state[profileId] = {
    ...getChatPresence(profileId),
    ...patch,
    updatedAt: nowIso(),
  }
  savePresenceState(state)
  return state[profileId]
}

export function subscribeChatPresenceUpdates(listener: () => void) {
  function handleUpdate() {
    listener()
  }

  window.addEventListener(CHAT_PRESENCE_EVENT, handleUpdate)
  window.addEventListener('storage', handleUpdate)

  return () => {
    window.removeEventListener(CHAT_PRESENCE_EVENT, handleUpdate)
    window.removeEventListener('storage', handleUpdate)
  }
}
