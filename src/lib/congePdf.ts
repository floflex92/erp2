import { jsPDF } from 'jspdf'
import { normalizePdfText, drawPdfBranding } from './pdfDocument'
import { TYPE_ABSENCE_LABELS, type AbsenceRh } from './absencesRh'

export interface CongeDocParams {
  absence: AbsenceRh
  employeNom: string
  validateurExploitationNom?: string | null
  validateurDirectionNom?: string | null
  integrePaieParNom?: string | null
  validateurFinalNom?: string | null
}

function dateFR(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function generateCongeDocumentPDF(params: CongeDocParams): void {
  const { absence: a, employeNom } = params
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const M = 40

  let y = drawPdfBranding(doc, {}, 42)

  // Titre
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.text(normalizePdfText('Attestation de conge'), M, y)
  y += 30

  // Sous-titre
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(71, 85, 105)
  doc.text(normalizePdfText(`Document genere le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`), M, y)
  y += 28

  doc.setDrawColor(208, 213, 221)
  doc.line(M, y, pageW - M, y)
  y += 24

  // Informations employé
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text(normalizePdfText('Employe'), M, y)
  y += 20

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(31, 41, 55)
  const infoLines = [
    `Nom : ${employeNom}`,
    `Type d'absence : ${TYPE_ABSENCE_LABELS[a.type_absence]}`,
    `Periode : du ${dateFR(a.date_debut)} au ${dateFR(a.date_fin)}`,
    `Nombre de jours : ${a.nb_jours}`,
  ]
  if (a.motif) infoLines.push(`Motif : ${a.motif}`)

  for (const line of infoLines) {
    doc.text(normalizePdfText(line), M, y)
    y += 18
  }
  y += 12

  // Workflow de validation
  doc.setDrawColor(208, 213, 221)
  doc.line(M, y, pageW - M, y)
  y += 24

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text(normalizePdfText('Circuit de validation'), M, y)
  y += 24

  const steps = [
    { label: 'Demande deposee le', date: a.created_at, par: employeNom },
    { label: 'Validation exploitation', date: a.date_validation_exploitation, par: params.validateurExploitationNom },
    { label: 'Validation direction', date: a.date_validation_direction, par: params.validateurDirectionNom },
    { label: 'Integration fiche de paie', date: a.date_integration_paie, par: params.integrePaieParNom },
    { label: 'Validation finale', date: a.date_validation, par: params.validateurFinalNom },
  ]

  doc.setFontSize(11)
  for (const step of steps) {
    const done = !!step.date
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(done ? 22 : 148, done ? 163 : 163, done ? 74 : 184)
    doc.text(done ? '  [OK]' : '  [ - ]', M, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(31, 41, 55)
    const detail = done
      ? `${step.label} : ${dateFR(step.date)}${step.par ? ` par ${step.par}` : ''}`
      : `${step.label} : en attente`
    doc.text(normalizePdfText(detail), M + 40, y)
    y += 20
  }

  y += 20
  doc.setDrawColor(208, 213, 221)
  doc.line(M, y, pageW - M, y)
  y += 24

  // Signature
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text(normalizePdfText('Ce document atteste du suivi complet de la demande d\'absence.'), M, y)
  y += 16
  doc.text(normalizePdfText('Il fait foi de piece justificative pour le dossier RH du salarie.'), M, y)

  // Footer
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(
    normalizePdfText(`Ref. absence : ${a.id.slice(0, 8).toUpperCase()}`),
    M,
    doc.internal.pageSize.getHeight() - 30,
  )

  doc.save(`conge-${employeNom.replace(/\s+/g, '-').toLowerCase()}-${a.date_debut}.pdf`)
}
