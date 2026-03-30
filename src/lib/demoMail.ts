import type { Profil, Role } from './auth'
import { serializeTchatPayload } from './tchatMessage'

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

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function roleMailSeeds(role: Role) {
  if (role === 'commercial') {
    return [
      {
        from_name: 'Sophie Lambert',
        from_email: 'logistique@transavenir.fr',
        subject: 'Besoin d une cotation express Lille > Toulouse',
        body: serializeTchatPayload('Bonjour, peux tu me confirmer un tarif avant 11h pour un lot complet demain matin ? https://transavenir.fr/appel-offre/lille-toulouse', []),
        labels: ['client', 'urgent'],
        read: false,
        minutes: 18,
      },
      {
        from_name: 'Karim Besson',
        from_email: 'achats@novaprint.fr',
        subject: 'Suivi contrat cadre T2',
        body: serializeTchatPayload('Je partage le recap du contrat cadre et les volumes actualises pour avril. Merci de me dire si on ajuste les navettes hebdo.', []),
        labels: ['client'],
        read: true,
        minutes: 210,
      },
    ]
  }

  if (role === 'comptable') {
    return [
      {
        from_name: 'Claire Vasseur',
        from_email: 'compta@democlient.fr',
        subject: 'Duplicata facture F-2026-018',
        body: serializeTchatPayload('Bonjour, notre service achat ne retrouve plus la facture F-2026-018. Peux tu nous la renvoyer avec le bon de livraison ?', []),
        labels: ['facturation'],
        read: false,
        minutes: 37,
      },
      {
        from_name: 'Banque Nexo',
        from_email: 'alerte@banque-nexo.fr',
        subject: 'Avis de virement recu',
        body: serializeTchatPayload('Un virement de 14 820 EUR a ete credite sur le compte exploitation ce matin.', []),
        labels: ['finance'],
        read: true,
        minutes: 290,
      },
    ]
  }

  if (role === 'exploitant' || role === 'conducteur') {
    return [
      {
        from_name: 'Dispatch Rungis',
        from_email: 'rdv@plateforme-rungis.fr',
        subject: 'Changement de quai mission 24-038',
        body: serializeTchatPayload('Le rendez-vous passe quai 17 au lieu du quai 11. Merci de confirmer la bonne prise en compte.', []),
        labels: ['exploitation', 'rdv'],
        read: false,
        minutes: 11,
      },
      {
        from_name: 'Client Martinel',
        from_email: 'reception@martinel.fr',
        subject: 'Consignes de securite site Vitrolles',
        body: serializeTchatPayload('Voici les consignes d acces mises a jour pour le site. https://martinel.fr/consignes-vitrolles', []),
        labels: ['client', 'securite'],
        read: true,
        minutes: 480,
      },
    ]
  }

  if (role === 'rh') {
    return [
      {
        from_name: 'Medecine du travail',
        from_email: 'planning@medtravail.fr',
        subject: 'Disponibilites visite medicale Avril',
        body: serializeTchatPayload('Vous trouverez ci-joint les prochains creneaux disponibles pour les conducteurs.', []),
        labels: ['rh'],
        read: false,
        minutes: 52,
      },
    ]
  }

  return [
    {
      from_name: 'Support NEXORA truck',
      from_email: 'support@nexora.app',
      subject: 'Recap communication de la semaine',
      body: serializeTchatPayload('Un point rapide: la messagerie interne et le module mail restent separes mais visibles dans le meme espace communication.', []),
      labels: ['systeme'],
      read: false,
      minutes: 95,
    },
    {
      from_name: 'Client Horizon',
      from_email: 'operations@horizon-log.fr',
      subject: 'Question sur le planning de livraison',
      body: serializeTchatPayload('Peux tu verifier la mise a quai de jeudi matin ? Merci pour le retour.', []),
      labels: ['client'],
      read: true,
      minutes: 720,
    },
  ]
}

export function ensureDemoMailbox(profile: Profil) {
  const state = readState()
  if (state.seeded_owner_ids.includes(profile.id)) return

  const inboxSeeds = roleMailSeeds(profile.role).map(seed => ({
    id: nextId('mail'),
    owner_id: profile.id,
    folder: 'inbox' as const,
    from_name: seed.from_name,
    from_email: seed.from_email,
    to: [profile.email ?? `${profile.role}@nexora.local`],
    subject: seed.subject,
    body: seed.body,
    created_at: minutesAgo(seed.minutes),
    read: seed.read,
    starred: false,
    labels: seed.labels,
  }))

  const sentSeed: DemoMailRecord = {
    id: nextId('mail'),
    owner_id: profile.id,
    folder: 'sent',
    from_name: [profile.prenom, profile.nom].filter(Boolean).join(' ') || 'Equipe NEXORA truck',
    from_email: profile.email ?? `${profile.role}@nexora.local`,
    to: ['client@demo-destinataire.fr'],
    subject: 'Point de suivi expeditions',
    body: serializeTchatPayload('Bonjour, je te confirme le suivi des expeditions de la semaine. https://nexora.app/tableau-bord', []),
    created_at: minutesAgo(1380),
    read: true,
    starred: false,
    labels: ['envoye'],
  }

  state.seeded_owner_ids.push(profile.id)
  state.mails.push(...inboxSeeds, sentSeed)
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
