import type { Profil } from './auth'

const STORAGE_KEY = 'nexora-demo-mail-v1'
const DEMO_MAIL_EVENT = 'nexora-demo-mail-updated'

export type DemoMailFolder = 'inbox' | 'sent' | 'archive'

export interface DemoMailRecord {
  id: string
  owner_id: string
  folder: DemoMailFolder
  from_name: string
  from_email: string
  to: string[]
  subject: string
  body: string
  created_at: string
  read: boolean
  starred: boolean
  labels: string[]
}

interface DemoMailState {
  seeded_owner_ids: string[]
  mails: DemoMailRecord[]
}

function nextId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100_000)}`
}

function saveState(state: DemoMailState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(DEMO_MAIL_EVENT))
}

function readState(): DemoMailState {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const seeded = { seeded_owner_ids: [], mails: [] } satisfies DemoMailState
    saveState(seeded)
    return seeded
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DemoMailState>
    if (Array.isArray(parsed.seeded_owner_ids) && Array.isArray(parsed.mails)) {
      return {
        seeded_owner_ids: parsed.seeded_owner_ids.filter(item => typeof item === 'string'),
        mails: parsed.mails.filter(item => item && typeof item.id === 'string' && typeof item.owner_id === 'string') as DemoMailRecord[],
      }
    }
  } catch {
    // Ignore and reseed below.
  }

  const fallback = { seeded_owner_ids: [], mails: [] } satisfies DemoMailState
  saveState(fallback)
  return fallback
}

export function ensureDemoMailbox(profile: Profil) {
  const state = readState()
  if (state.seeded_owner_ids.includes(profile.id)) return

  state.seeded_owner_ids.push(profile.id)
  saveState(state)
}

export function listDemoMailRecords(ownerId: string) {
  return readState().mails
    .filter(mail => mail.owner_id === ownerId)
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
}

export function countUnreadDemoMails(ownerId: string) {
  return readState().mails.filter(mail => mail.owner_id === ownerId && mail.folder === 'inbox' && !mail.read).length
}

export function markDemoMailRead(ownerId: string, mailId: string) {
  const state = readState()
  let changed = false
  state.mails = state.mails.map(mail => {
    if (mail.owner_id !== ownerId || mail.id !== mailId || mail.read) return mail
    changed = true
    return { ...mail, read: true }
  })
  if (changed) saveState(state)
}

export function archiveDemoMail(ownerId: string, mailId: string) {
  const state = readState()
  state.mails = state.mails.map(mail => {
    if (mail.owner_id !== ownerId || mail.id !== mailId) return mail
    return { ...mail, folder: 'archive', read: true }
  })
  saveState(state)
}

export function toggleDemoMailStar(ownerId: string, mailId: string) {
  const state = readState()
  state.mails = state.mails.map(mail => {
    if (mail.owner_id !== ownerId || mail.id !== mailId) return mail
    return { ...mail, starred: !mail.starred }
  })
  saveState(state)
}

export function sendDemoMail(ownerProfile: Profil, to: string[], subject: string, body: string) {
  const state = readState()
  const message: DemoMailRecord = {
    id: nextId('mail'),
    owner_id: ownerProfile.id,
    folder: 'sent',
    from_name: [ownerProfile.prenom, ownerProfile.nom].filter(Boolean).join(' ') || 'Equipe NEXORA truck',
    from_email: ownerProfile.email ?? `${ownerProfile.role}@nexora.local`,
    to,
    subject,
    body,
    created_at: new Date().toISOString(),
    read: true,
    starred: false,
    labels: ['envoye'],
  }
  state.mails.unshift(message)
  saveState(state)
  return message
}

export function deliverDemoMailToInbox(
  ownerProfile: Profil,
  fromName: string,
  fromEmail: string,
  subject: string,
  body: string,
  labels: string[] = [],
) {
  const state = readState()
  const message: DemoMailRecord = {
    id: nextId('mail'),
    owner_id: ownerProfile.id,
    folder: 'inbox',
    from_name: fromName,
    from_email: fromEmail,
    to: [ownerProfile.email ?? `${ownerProfile.role}@nexora.local`],
    subject,
    body,
    created_at: new Date().toISOString(),
    read: false,
    starred: false,
    labels,
  }
  state.mails.unshift(message)
  saveState(state)
  return message
}

export function subscribeDemoMailUpdates(listener: () => void) {
  function handleUpdate() {
    listener()
  }
  window.addEventListener(DEMO_MAIL_EVENT, handleUpdate)
  window.addEventListener('storage', handleUpdate)
  return () => {
    window.removeEventListener(DEMO_MAIL_EVENT, handleUpdate)
    window.removeEventListener('storage', handleUpdate)
  }
}
