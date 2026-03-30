export interface CommunicationImportanceSettings {
  peopleIds: string[]
  peopleLabels: string[]
  keywords: string[]
}

const STORAGE_KEY = 'nexora-communication-importance-v1'
const EVENT_NAME = 'nexora-communication-importance-updated'

const DEFAULT_SETTINGS: CommunicationImportanceSettings = {
  peopleIds: [],
  peopleLabels: [],
  keywords: [],
}

function normalizeKeyword(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function readCommunicationImportance() {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_SETTINGS

  try {
    const parsed = JSON.parse(raw) as Partial<CommunicationImportanceSettings>
    return {
      peopleIds: Array.isArray(parsed.peopleIds) ? parsed.peopleIds.filter(item => typeof item === 'string') : [],
      peopleLabels: Array.isArray(parsed.peopleLabels) ? parsed.peopleLabels.filter(item => typeof item === 'string') : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.filter(item => typeof item === 'string') : [],
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function save(settings: CommunicationImportanceSettings) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

export function toggleImportantPerson(personId: string, label: string) {
  const settings = readCommunicationImportance()
  const exists = settings.peopleIds.includes(personId)
  const next = exists
    ? {
        ...settings,
        peopleIds: settings.peopleIds.filter(item => item !== personId),
        peopleLabels: settings.peopleLabels.filter(item => item !== label),
      }
    : {
        ...settings,
        peopleIds: [...settings.peopleIds, personId],
        peopleLabels: Array.from(new Set([...settings.peopleLabels, label])),
      }
  save(next)
  return next
}

export function addImportantKeyword(keyword: string) {
  const normalized = normalizeKeyword(keyword)
  if (!normalized) return readCommunicationImportance()
  const settings = readCommunicationImportance()
  const next = {
    ...settings,
    keywords: Array.from(new Set([...settings.keywords, normalized])),
  }
  save(next)
  return next
}

export function removeImportantKeyword(keyword: string) {
  const normalized = normalizeKeyword(keyword)
  const settings = readCommunicationImportance()
  const next = {
    ...settings,
    keywords: settings.keywords.filter(item => item !== normalized),
  }
  save(next)
  return next
}

export function subscribeCommunicationImportance(listener: () => void) {
  function handle() {
    listener()
  }
  window.addEventListener(EVENT_NAME, handle)
  window.addEventListener('storage', handle)
  return () => {
    window.removeEventListener(EVENT_NAME, handle)
    window.removeEventListener('storage', handle)
  }
}

export function countImportantKeywordMatches(text: string, keywords: string[]) {
  const haystack = normalizeKeyword(text)
  return keywords.reduce((count, keyword) => count + (haystack.includes(normalizeKeyword(keyword)) ? 1 : 0), 0)
}

export function matchesImportantPerson(candidateIds: string[], candidateLabels: string[], settings: CommunicationImportanceSettings) {
  const hasIdMatch = candidateIds.some(candidate => settings.peopleIds.includes(candidate))
  const hasLabelMatch = candidateLabels.some(candidate => settings.peopleLabels.includes(candidate))
  return hasIdMatch || hasLabelMatch
}
