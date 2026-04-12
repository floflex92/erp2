import featuresCsv from '../../docs/modele-fonctionnalites-page.csv?raw'

type CsvFeature = {
  Statut?: string
  Categorie?: string
  Fonctionnalite?: string
  'Description courte'?: string
  Priorite?: string
  Publier_sur_site?: string
  Filtre_Statut?: string
  Filtre_Priorite?: string
}

export type CatalogFeature = {
  statut: string
  categorie: string
  fonctionnalite: string
  description: string
  priorite: string
  publierSurSite: boolean
  filtreStatut: number
  filtrePriorite: number
}

function toBoolean(value?: string): boolean {
  const normalized = (value ?? '').trim().toLowerCase()
  if (!normalized) return true
  return ['1', 'true', 'oui', 'yes', 'x'].includes(normalized)
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ';' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += char
  }

  cells.push(current)
  return cells
}

function parseFeaturesFromCsv(raw: string): CatalogFeature[] {
  const lines = raw
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0])

  const rows = lines.slice(1).map(line => {
    const cells = parseCsvLine(line)
    const row: CsvFeature = {}
    headers.forEach((header, i) => {
      row[header as keyof CsvFeature] = cells[i] ?? ''
    })
    return row
  })

  const toNumber = (value?: string, fallback = 99) => {
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }

  return rows
    .map(row => ({
      statut: (row.Statut ?? '').trim(),
      categorie: (row.Categorie ?? '').trim(),
      fonctionnalite: (row.Fonctionnalite ?? '').trim(),
      description: (row['Description courte'] ?? '').trim(),
      priorite: (row.Priorite ?? '').trim(),
      publierSurSite: toBoolean(row.Publier_sur_site),
      filtreStatut: toNumber(row.Filtre_Statut, 99),
      filtrePriorite: toNumber(row.Filtre_Priorite, 9),
    }))
    .filter(item => item.fonctionnalite.length > 0 && item.publierSurSite)
    .sort((a, b) =>
      a.filtreStatut - b.filtreStatut ||
      a.filtrePriorite - b.filtrePriorite ||
      a.categorie.localeCompare(b.categorie, 'fr') ||
      a.fonctionnalite.localeCompare(b.fonctionnalite, 'fr'),
    )
}

export const allCatalogFeatures = parseFeaturesFromCsv(featuresCsv)
export const developedCatalogFeatures = allCatalogFeatures.filter(item => item.statut === 'Developpe' || item.statut === 'Disponible')
export const inProgressCatalogFeatures = allCatalogFeatures.filter(item => item.statut === 'En cours de developpement')
export const upcomingCatalogFeatures = allCatalogFeatures.filter(item => item.statut === 'Features' || item.statut === 'Prochaine feature')