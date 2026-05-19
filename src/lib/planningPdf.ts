import { jsPDF } from 'jspdf'
import { normalizePdfText, drawPdfBranding } from './pdfDocument'

export interface PlanningPdfOT {
  id: string
  reference: string
  client_nom: string
  statut: string
  date_chargement_prevue: string | null
  date_livraison_prevue: string | null
  distance_km: number | null
  prix_ht: number | null
}

export interface PlanningPdfRow {
  id: string
  label: string
  subtitle?: string
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  r.setDate(r.getDate() + n)
  return r
}

const STATUT_SHORT: Record<string, string> = {
  brouillon: 'BRO', confirme: 'CNF', planifie: 'PLN',
  en_cours: 'ENC', livre: 'LIV', facture: 'FAC', annule: 'ANN',
  en_attente_validation: 'ATT', incident: 'INC', termine: 'TRM',
}

const DAY_NAMES_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

export function generatePlanningWeekPDF(params: {
  weekStart: Date
  rows: PlanningPdfRow[]
  getRowOTs: (rowId: string) => PlanningPdfOT[]
  title?: string
}): void {
  const { weekStart, rows, getRowOTs } = params
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekLabel = `Planning semaine du ${weekDays[0].toLocaleDateString('fr-FR')} au ${weekDays[6].toLocaleDateString('fr-FR')}`

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const pageW = doc.internal.pageSize.getWidth()  // 841.89
  const pageH = doc.internal.pageSize.getHeight() // 595.28
  const MARGIN = 36

  let cursorY = drawPdfBranding(doc, {}, 36)

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text(normalizePdfText(params.title ?? weekLabel), MARGIN, cursorY)
  cursorY += 28

  // Table config
  const COL_RESOURCE = 140
  const tableWidth = pageW - MARGIN * 2
  const dayColW = (tableWidth - COL_RESOURCE) / 7

  // Table header
  doc.setFillColor(30, 41, 59)
  doc.rect(MARGIN, cursorY, tableWidth, 20, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(226, 232, 240)
  doc.text('Ressource', MARGIN + 4, cursorY + 13)
  weekDays.forEach((day, i) => {
    const x = MARGIN + COL_RESOURCE + i * dayColW
    doc.text(`${DAY_NAMES_FR[i]} ${day.getDate()}/${String(day.getMonth()+1).padStart(2,'0')}`, x + 4, cursorY + 13)
  })
  cursorY += 20

  // Row body
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)

  let totalOTs = 0
  let totalCA = 0
  let totalKm = 0

  for (const row of rows) {
    const allOTs = getRowOTs(row.id)
    if (allOTs.length === 0) continue

    // Compute OTs per day
    const otsByDay: PlanningPdfOT[][] = weekDays.map(day => {
      const dayISO = toISO(day)
      return allOTs.filter(ot => {
        if (!ot.date_chargement_prevue) return false
        const charDate = ot.date_chargement_prevue.slice(0, 10)
        const livDate = (ot.date_livraison_prevue ?? ot.date_chargement_prevue).slice(0, 10)
        return charDate <= dayISO && livDate >= dayISO
      })
    })
    const maxPerDay = Math.max(1, ...otsByDay.map(d => d.length))
    const rowH = Math.max(22, maxPerDay * 14 + 8)

    // Check page overflow
    if (cursorY + rowH > pageH - MARGIN - 30) {
      doc.addPage()
      cursorY = MARGIN + 20
    }

    // Draw row background (alternating)
    doc.setFillColor(248, 250, 252)
    doc.rect(MARGIN, cursorY, tableWidth, rowH, 'F')
    doc.setDrawColor(203, 213, 225)
    doc.rect(MARGIN, cursorY, tableWidth, rowH)

    // Resource label
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(30, 41, 59)
    doc.text(normalizePdfText(row.label), MARGIN + 4, cursorY + 13)
    if (row.subtitle) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      doc.setTextColor(100, 116, 139)
      doc.text(normalizePdfText(row.subtitle), MARGIN + 4, cursorY + 22)
    }

    // Vertical separator after resource col
    doc.setDrawColor(203, 213, 225)
    doc.line(MARGIN + COL_RESOURCE, cursorY, MARGIN + COL_RESOURCE, cursorY + rowH)

    // Day cells
    weekDays.forEach((_, i) => {
      const x = MARGIN + COL_RESOURCE + i * dayColW
      const dayOTs = otsByDay[i]

      // Vertical separator
      if (i > 0) doc.line(x, cursorY, x, cursorY + rowH)

      // Weekend background
      if (i >= 5) {
        doc.setFillColor(241, 245, 249)
        doc.rect(x, cursorY, dayColW, rowH, 'F')
      }

      dayOTs.forEach((ot, j) => {
        const lineY = cursorY + 13 + j * 14
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.5)
        doc.setTextColor(30, 41, 59)
        doc.text(normalizePdfText(ot.reference), x + 3, lineY)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(71, 85, 105)
        const statut = STATUT_SHORT[ot.statut] ?? ot.statut.slice(0, 3).toUpperCase()
        doc.text(`${normalizePdfText(ot.client_nom.slice(0, 12))} [${statut}]`, x + 3, lineY + 8)

        totalOTs++
        totalCA += ot.prix_ht ?? 0
        totalKm += ot.distance_km ?? 0
      })
    })

    cursorY += rowH
  }

  // Footer summary
  cursorY += 10
  if (cursorY + 30 > pageH - MARGIN) {
    doc.addPage()
    cursorY = MARGIN + 20
  }
  doc.setDrawColor(148, 163, 184)
  doc.line(MARGIN, cursorY, pageW - MARGIN, cursorY)
  cursorY += 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text(
    normalizePdfText(`Semaine : ${totalOTs} course(s)  |  CA planifie : ${totalCA > 0 ? (totalCA/1000).toFixed(1) + 'k EUR' : '-'}  |  Distance totale : ${totalKm > 0 ? Math.round(totalKm) + ' km' : '-'}`),
    MARGIN,
    cursorY,
  )
  cursorY += 12
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text(
    normalizePdfText(`Exporte le ${new Date().toLocaleString('fr-FR')} depuis Nexora Truck ERP`),
    MARGIN,
    cursorY,
  )

  doc.save(normalizePdfText(`planning-semaine-${toISO(weekStart)}.pdf`))
}
