import { createPdfDocument } from './pdfDocument'
import type { TchatAttachment } from './tchatMessage'

export type FineNature = 'stationnement' | 'vitesse' | 'peage' | 'circulation' | 'autre'
export type FineStatus = 'recue' | 'notifiee' | 'redirigee' | 'archivee'
export type FineConfidence = 'faible' | 'moyenne' | 'haute'

export interface ParsedFineData {
  rawText: string
  nature: FineNature
  amount: number | null
  occuredAt: string | null
  location: string | null
  immatriculation: string | null
  conducteurName: string | null
  reference: string | null
  confidence: FineConfidence
}

export interface FineRecord {
  id: string
  pdf_name: string
  pdf_url: string
  pdf_size: number
  extracted_text: string
  reference: string | null
  nature: FineNature
  amount: number | null
  occured_at: string | null
  location: string | null
  vehicule_id: string | null
  vehicule_plate: string | null
  conducteur_id: string | null
  conducteur_name: string | null
  conducteur_email: string | null
  status: FineStatus
  confidence: FineConfidence
  manager_notes: string | null
  created_at: string
  notified_at: string | null
  redirected_at: string | null
}

type FineState = {
  fines: FineRecord[]
}

const STORAGE_KEY = 'nexora-fines-v1'
const EVENT_NAME = 'nexora-fines-updated'

function nextId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100_000)}`
}

function saveState(state: FineState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function defaultState(): FineState {
  return { fines: [] }
}

function readState(): FineState {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const fallback = defaultState()
    saveState(fallback)
    return fallback
  }

  try {
    const parsed = JSON.parse(raw) as Partial<FineState>
    if (Array.isArray(parsed.fines)) {
      return {
        fines: parsed.fines.filter(item => item && typeof item.id === 'string') as FineRecord[],
      }
    }
  } catch {
    // Ignore and reset below.
  }

  const fallback = defaultState()
  saveState(fallback)
  return fallback
}

export function normalizePlate(value: string | null | undefined) {
  return (value ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase()
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseAmount(rawText: string) {
  const match = rawText.match(/(\d{1,4}(?:[.,]\d{2})?)\s?(?:€|EUR)\b/i)
  if (!match) return null
  const normalized = match[1].replace(',', '.')
  const amount = Number.parseFloat(normalized)
  return Number.isFinite(amount) ? amount : null
}

function parseDateTime(rawText: string) {
  const full = rawText.match(/(\d{2}[/-]\d{2}[/-]\d{4})\s*(?:a|à|a\s+)?\s*(\d{1,2}:\d{2})/i)
  if (full) {
    const date = full[1].replace(/\//g, '-')
    const [day, month, year] = date.split('-')
    return `${year}-${month}-${day}T${full[2]}:00`
  }

  const dateOnly = rawText.match(/(\d{2}[/-]\d{2}[/-]\d{4})/i)
  if (!dateOnly) return null
  const normalized = dateOnly[1].replace(/\//g, '-')
  const [day, month, year] = normalized.split('-')
  return `${year}-${month}-${day}T00:00:00`
}

function parseLocation(rawText: string) {
  const patterns = [
    /(?:lieu|commune|adresse|route)\s*[:-]\s*([^\n\r]{4,120})/i,
    /(?:sur|au niveau de|a hauteur de)\s+([^\n\r]{4,120})/i,
  ]
  for (const pattern of patterns) {
    const match = rawText.match(pattern)
    if (match) return normalizeText(match[1])
  }
  return null
}

function parseImmatriculation(rawText: string, fileName: string) {
  const source = `${rawText}\n${fileName}`.toUpperCase()
  const patterns = [
    /\b[A-Z]{2}[-\s]?\d{3}[-\s]?[A-Z]{2}\b/g,
    /\b\d{1,4}\s?[A-Z]{2,3}\s?\d{2,3}\b/g,
  ]
  for (const pattern of patterns) {
    const match = source.match(pattern)
    if (match?.[0]) return match[0].replace(/\s+/g, '-')
  }
  return null
}

function parseConducteurName(rawText: string) {
  const match = rawText.match(/(?:conducteur|contrevenant|titulaire)\s*[:-]\s*([A-Za-zÀ-ÿ' -]{5,80})/i)
  return match ? normalizeText(match[1]) : null
}

function detectNature(rawText: string): FineNature {
  const normalized = normalizeText(rawText).toLowerCase()
  if (normalized.includes('stationnement') || normalized.includes('parking') || normalized.includes('fps')) return 'stationnement'
  if (normalized.includes('vitesse') || normalized.includes('radar')) return 'vitesse'
  if (normalized.includes('peage') || normalized.includes('toll')) return 'peage'
  if (normalized.includes('circulation') || normalized.includes('feu rouge') || normalized.includes('signalisation')) return 'circulation'
  return 'autre'
}

function detectReference(rawText: string) {
  const match = rawText.match(/(?:avis|reference|ref|n[°o])\s*[:-]?\s*([A-Z0-9-]{6,30})/i)
  return match ? match[1].toUpperCase() : null
}

function confidenceFromData(data: Omit<ParsedFineData, 'confidence'>) {
  let score = 0
  if (data.immatriculation) score += 1
  if (data.occuredAt) score += 1
  if (data.location) score += 1
  if (data.amount !== null) score += 1
  if (data.reference) score += 1
  if (score >= 4) return 'haute'
  if (score >= 2) return 'moyenne'
  return 'faible'
}

export async function extractPdfSearchText(file: File) {
  const buffer = await file.arrayBuffer()
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  const latin1 = new TextDecoder('latin1').decode(buffer)
  const chunks = `${utf8}\n${latin1}`.match(/[A-Za-z0-9À-ÿ€:/.,'()\- ]{4,}/g) ?? []
  return chunks
    .map(chunk => normalizeText(chunk))
    .filter(Boolean)
    .join('\n')
}

export function parseFineDocument(rawText: string, fileName: string): ParsedFineData {
  const base = {
    rawText,
    nature: detectNature(rawText),
    amount: parseAmount(rawText),
    occuredAt: parseDateTime(rawText),
    location: parseLocation(rawText),
    immatriculation: parseImmatriculation(rawText, fileName),
    conducteurName: parseConducteurName(rawText),
    reference: detectReference(rawText),
  }

  return {
    ...base,
    confidence: confidenceFromData(base),
  }
}

export function listFineRecords() {
  return readState().fines
    .slice()
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
}

export function createFineRecord(input: Omit<FineRecord, 'id' | 'created_at'>) {
  const state = readState()
  const record: FineRecord = {
    ...input,
    id: nextId('fine'),
    created_at: new Date().toISOString(),
  }
  state.fines.unshift(record)
  saveState(state)
  return record
}

export function patchFineRecord(id: string, patch: Partial<FineRecord>) {
  const state = readState()
  let updated: FineRecord | null = null
  state.fines = state.fines.map(record => {
    if (record.id !== id) return record
    updated = { ...record, ...patch }
    return updated
  })
  saveState(state)
  return updated
}

export function subscribeFineUpdates(listener: () => void) {
  const handleUpdate = () => listener()
  window.addEventListener(EVENT_NAME, handleUpdate)
  window.addEventListener('storage', handleUpdate)
  return () => {
    window.removeEventListener(EVENT_NAME, handleUpdate)
    window.removeEventListener('storage', handleUpdate)
  }
}

type FineSeedContext = {
  conducteurs: Array<{ id: string; nom: string; prenom: string; email: string | null }>
  vehicules: Array<{ id: string; immatriculation: string }>
  affectations: Array<{ conducteur_id: string; vehicule_id: string | null; actif: boolean }>
}

function attachmentFromPdf(name: string, title: string, lines: string[]): TchatAttachment {
  const pdf = createPdfDocument(title, lines)
  return {
    id: nextId('fine-attachment'),
    kind: 'document',
    name,
    mimeType: 'application/pdf',
    size: pdf.size,
    url: pdf.url,
  }
}

export function ensureDemoFineSeeds(context: FineSeedContext) {
  const state = readState()
  if (state.fines.length > 0) return state.fines
  if (context.vehicules.length === 0) return state.fines

  const templates = [
    { nature: 'stationnement' as const, amount: 135, occuredAt: '2026-03-18T08:42:00', location: 'Rue de Rivoli, Paris', label: 'Avis de stationnement', confidence: 'haute' as const },
    { nature: 'vitesse' as const, amount: 90, occuredAt: '2026-03-16T05:37:00', location: 'A26 PK 87', label: 'Avis de contravention radar', confidence: 'haute' as const },
    { nature: 'peage' as const, amount: 47.5, occuredAt: '2026-03-12T14:05:00', location: 'Peage de Saint-Arnoult', label: 'Relance peage', confidence: 'moyenne' as const },
    { nature: 'circulation' as const, amount: 68, occuredAt: '2026-03-09T11:18:00', location: 'Boulevard peripherique Lyon', label: 'Avis circulation', confidence: 'moyenne' as const },
  ]

  const fines: FineRecord[] = templates.map((template, index) => {
    const vehicule = context.vehicules[index % context.vehicules.length]
    const affectation = context.affectations.find(item => item.actif && item.vehicule_id === vehicule.id) ?? null
    const conducteur = affectation ? context.conducteurs.find(item => item.id === affectation.conducteur_id) ?? null : null
    const reference = `PV-${2026}${String(index + 11).padStart(2, '0')}-${String(index + 1).padStart(4, '0')}`
    const pdf = attachmentFromPdf(
      `${reference}.pdf`,
      template.label,
      [
        `Reference: ${reference}`,
        `Immatriculation: ${vehicule.immatriculation}`,
        `Date: ${template.occuredAt}`,
        `Lieu: ${template.location}`,
        `Montant: ${template.amount} EUR`,
        `Nature: ${template.nature}`,
        `Conducteur: ${conducteur ? `${conducteur.prenom} ${conducteur.nom}` : 'A confirmer'}`,
      ],
    )

    return {
      id: nextId('fine'),
      pdf_name: pdf.name,
      pdf_url: pdf.url,
      pdf_size: pdf.size,
      extracted_text: [
        template.label,
        `Reference : ${reference}`,
        `Immatriculation : ${vehicule.immatriculation}`,
        `Date : ${template.occuredAt}`,
        `Lieu : ${template.location}`,
        `Montant : ${template.amount} EUR`,
        `Conducteur : ${conducteur ? `${conducteur.prenom} ${conducteur.nom}` : 'A confirmer'}`,
      ].join('\n'),
      reference,
      nature: template.nature,
      amount: template.amount,
      occured_at: template.occuredAt,
      location: template.location,
      vehicule_id: vehicule.id,
      vehicule_plate: vehicule.immatriculation,
      conducteur_id: conducteur?.id ?? null,
      conducteur_name: conducteur ? `${conducteur.prenom} ${conducteur.nom}` : null,
      conducteur_email: conducteur?.email ?? null,
      status: conducteur ? 'notifiee' : 'recue',
      confidence: template.confidence,
      manager_notes: conducteur ? 'Import demo pre-assigne.' : 'Verification manuelle requise.',
      created_at: new Date(Date.now() - (index + 1) * 86_400_000).toISOString(),
      notified_at: conducteur ? new Date(Date.now() - index * 43_200_000).toISOString() : null,
      redirected_at: null,
    }
  })

  state.fines = fines
  saveState(state)
  return state.fines
}
