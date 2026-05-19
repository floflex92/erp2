import { DEMO_PROFILES } from './demoUsers'

const STORAGE_KEY = 'nexora-demo-chat-v1'
const DEMO_CHAT_EVENT = 'nexora-demo-chat-updated'

export interface DemoChatConversationRecord {
  id: string
  participant_ids: string[]
  updated_at: string
}

export interface DemoChatMessageRecord {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read_by: string[]
  read_at_by: Record<string, string>
}

interface DemoChatState {
  conversations: DemoChatConversationRecord[]
  messages: DemoChatMessageRecord[]
}

function timestamp(minutesAgo: number) {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString()
}

function demoProfileId(email: string) {
  return DEMO_PROFILES.find(profile => profile.email === email)?.id ?? email
}

function buildInitialState(): DemoChatState {
  const exploitationId = demoProfileId('exploitation@erp-demo.fr')
  const conducteurId = demoProfileId('conducteur@erp-demo.fr')
  const comptableId = demoProfileId('compta@erp-demo.fr')
  const commercialId = demoProfileId('commercial@erp-demo.fr')
  const rhId = demoProfileId('rh@erp-demo.fr')

  const conv1 = 'demo-conv-exploitation-conducteur'
  const conv2 = 'demo-conv-commercial-comptable'
  const conv3 = 'demo-conv-rh-conducteur'

  return {
    conversations: [
      { id: conv1, participant_ids: [exploitationId, conducteurId], updated_at: timestamp(18) },
      { id: conv2, participant_ids: [commercialId, comptableId], updated_at: timestamp(65) },
      { id: conv3, participant_ids: [rhId, conducteurId], updated_at: timestamp(150) },
    ],
    messages: [
      {
        id: 'demo-msg-1',
        conversation_id: conv1,
        sender_id: exploitationId,
        content: 'Prise a quai 14h15 a Gennevilliers. Pense a confirmer le depart.',
        created_at: timestamp(35),
        read_by: [exploitationId, conducteurId],
        read_at_by: {
          [exploitationId]: timestamp(35),
          [conducteurId]: timestamp(31),
        },
      },
      {
        id: 'demo-msg-2',
        conversation_id: conv1,
        sender_id: conducteurId,
        content: 'Bien recu. Arrivee sur site dans 20 minutes, je te recontacte au chargement.',
        created_at: timestamp(18),
        read_by: [conducteurId],
        read_at_by: {
          [conducteurId]: timestamp(18),
        },
      },
      {
        id: 'demo-msg-3',
        conversation_id: conv2,
        sender_id: commercialId,
        content: 'Le client attend le duplicata de facture avant 16h.',
        created_at: timestamp(90),
        read_by: [commercialId, comptableId],
        read_at_by: {
          [commercialId]: timestamp(90),
          [comptableId]: timestamp(84),
        },
      },
      {
        id: 'demo-msg-4',
        conversation_id: conv2,
        sender_id: comptableId,
        content: 'Je prepare l envoi PDF et je boucle le dossier avant midi.',
        created_at: timestamp(65),
        read_by: [comptableId, commercialId],
        read_at_by: {
          [comptableId]: timestamp(65),
          [commercialId]: timestamp(61),
        },
      },
      {
        id: 'demo-msg-5',
        conversation_id: conv3,
        sender_id: rhId,
        content: 'Pense a deposer la visite medicale scannee dans le dossier chauffeur.',
        created_at: timestamp(150),
        read_by: [rhId],
        read_at_by: {
          [rhId]: timestamp(150),
        },
      },
    ],
  }
}

function normalizeState(candidate: unknown): DemoChatState | null {
  if (!candidate || typeof candidate !== 'object') return null
  const state = candidate as Partial<DemoChatState>
  if (!Array.isArray(state.conversations) || !Array.isArray(state.messages)) return null

  return {
    conversations: state.conversations.filter(item =>
      item
      && typeof item.id === 'string'
      && Array.isArray(item.participant_ids)
      && typeof item.updated_at === 'string',
    ) as DemoChatConversationRecord[],
    messages: state.messages.filter(item =>
      item
      && typeof item.id === 'string'
      && typeof item.conversation_id === 'string'
      && typeof item.sender_id === 'string'
      && typeof item.content === 'string'
      && typeof item.created_at === 'string'
      && Array.isArray(item.read_by)
      && item.read_at_by
      && typeof item.read_at_by === 'object',
    ) as DemoChatMessageRecord[],
  }
}

function saveDemoChatState(state: DemoChatState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(DEMO_CHAT_EVENT))
}

export function readDemoChatState(): DemoChatState {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const seeded = buildInitialState()
    saveDemoChatState(seeded)
    return seeded
  }

  try {
    const parsed = normalizeState(JSON.parse(raw))
    if (parsed) return parsed
  } catch {
    // Ignore invalid local data and reseed below.
  }

  const reseeded = buildInitialState()
  saveDemoChatState(reseeded)
  return reseeded
}

export function getDemoConversationRecords(profileId: string) {
  const state = readDemoChatState()
  return state.conversations
    .filter(conversation => conversation.participant_ids.includes(profileId))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

export function getDemoMessageRecords(conversationId: string) {
  const state = readDemoChatState()
  return state.messages
    .filter(message => message.conversation_id === conversationId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

export function countUnreadDemoMessages(conversationId: string, viewerId: string) {
  return readDemoChatState().messages.filter(message =>
    message.conversation_id === conversationId
    && message.sender_id !== viewerId
    && !message.read_by.includes(viewerId),
  ).length
}

export function countAllUnreadDemoMessages(viewerId: string) {
  return readDemoChatState().messages.filter(message =>
    message.sender_id !== viewerId && !message.read_by.includes(viewerId),
  ).length
}

export function getDemoConversationLastMessage(conversationId: string) {
  const messages = getDemoMessageRecords(conversationId)
  return messages.length > 0 ? messages[messages.length - 1].content : undefined
}

function nextId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100_000)}`
}

export function openOrCreateDemoConversation(profileId: string, otherProfileIds: string[]) {
  const state = readDemoChatState()
  const participantIds = Array.from(new Set([profileId, ...otherProfileIds])).sort()
  const existing = state.conversations.find(conversation =>
    [...conversation.participant_ids].sort().join('|') === participantIds.join('|'),
  )

  if (existing) return existing.id

  const createdAt = new Date().toISOString()
  const conversation: DemoChatConversationRecord = {
    id: nextId('demo-conv'),
    participant_ids: participantIds,
    updated_at: createdAt,
  }

  state.conversations = [conversation, ...state.conversations]
  saveDemoChatState(state)
  return conversation.id
}

export function sendDemoMessage(conversationId: string, senderId: string, content: string) {
  const state = readDemoChatState()
  const createdAt = new Date().toISOString()
  const message: DemoChatMessageRecord = {
    id: nextId('demo-msg'),
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    created_at: createdAt,
    read_by: [senderId],
    read_at_by: {
      [senderId]: createdAt,
    },
  }

  state.messages.push(message)
  state.conversations = state.conversations.map(conversation =>
    conversation.id === conversationId
      ? { ...conversation, updated_at: createdAt }
      : conversation,
  )
  saveDemoChatState(state)
  return message
}

export function markDemoConversationRead(conversationId: string, viewerId: string) {
  const state = readDemoChatState()
  const readAt = new Date().toISOString()
  let changed = false

  state.messages = state.messages.map(message => {
    if (message.conversation_id !== conversationId || message.sender_id === viewerId || message.read_by.includes(viewerId)) {
      return message
    }

    changed = true
    return {
      ...message,
      read_by: [...message.read_by, viewerId],
      read_at_by: {
        ...message.read_at_by,
        [viewerId]: readAt,
      },
    }
  })

  if (changed) saveDemoChatState(state)
}

export function markAllDemoMessagesRead(viewerId: string) {
  const state = readDemoChatState()
  const readAt = new Date().toISOString()
  let changed = false

  state.messages = state.messages.map(message => {
    if (message.sender_id === viewerId || message.read_by.includes(viewerId)) {
      return message
    }

    changed = true
    return {
      ...message,
      read_by: [...message.read_by, viewerId],
      read_at_by: {
        ...message.read_at_by,
        [viewerId]: readAt,
      },
    }
  })

  if (changed) saveDemoChatState(state)
}

export function resetDemoChatState() {
  saveDemoChatState(buildInitialState())
}

export function subscribeDemoChatUpdates(listener: () => void) {
  function handleUpdate() {
    listener()
  }

  window.addEventListener(DEMO_CHAT_EVENT, handleUpdate)
  window.addEventListener('storage', handleUpdate)

  return () => {
    window.removeEventListener(DEMO_CHAT_EVENT, handleUpdate)
    window.removeEventListener('storage', handleUpdate)
  }
}
