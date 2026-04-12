import { jsPDF } from 'jspdf'
import type { Profil } from './auth'
import { ROLE_LABELS } from './auth'
import { readCompanySettings } from './companySettings'
import { deliverDemoMailToInbox } from './demoMail'
import { buildPayrollPeriodSchedule, formatPayrollWorkflowDate } from './payrollWorkflow'
import { listApprovedExpenseTicketsForPeriod, markApprovedExpenseTicketsPaid, sumApprovedExpenseReimbursements } from './expenseTickets'
import { getEmployeeRecord, updateEmployeeRecord, type EmployeeRecord } from './employeeRecords'
import { registerHrDocument } from './hrDocuments'
import { drawPdfBranding, normalizePdfText } from './pdfDocument'
import { staffDisplayName, type StaffMember } from './staffDirectory'
import { serializeTchatPayload } from './tchatMessage'

export interface PayrollInput {
  periodLabel: string
  // Heures
  workedHours: number
  overtime25Hours: number
  overtime50Hours: number
  absenceHours: number
  heuresNuit: number              // heures de nuit pour info bulletin
  joursTravailles: number         // pour coût journalier
  sourceHeures: 'manuel' | 'tachygraphe' | 'mixte'
  // Primes imposables (SOUMIS cotisations + IR)
  performanceBonus: number
  exceptionalBonus: number
  // Indemnités exonérées (HORS assiette cotisations si ≤ barème URSSAF)
  indemniteRepasExo: number       // remplace mealAllowance — ≤ 21,10€/repas
  indemniteGrandRoutierExo: number // GR nuitée hors domicile — ≤ 98,27€/jour
  indemniteTpExo: number          // territoire propre (retour domicile)
  // Dépassement barème : part qui dépasse le plafond URSSAF → devient cotisable
  depassementBaremeCotisable: number
  // Nombre de repas/jours (pour contrôle plafond unitaire)
  nbRepas: number
  nbJoursGr: number
  // Frais remboursés
  manualExpenseAdjustment: number
  // Retenues
  incomeTaxWithholding: number
  advanceDeduction: number
  otherDeduction: number
  /** @deprecated Utiliser indemniteRepasExo — conservé pour compatibilité ascendante */
  mealAllowance?: number
  /** @deprecated Utiliser indemniteTpExo — conservé pour compatibilité ascendante */
  transportBonus?: number
}

export interface PayrollContributionLine {
  label: string
  base: number
  rate: number
  employeeAmount: number
  employerAmount: number
}

export interface ConformiteAlerte {
  type: string
  niveau: 'bloquant' | 'avertissement' | 'info'
  message: string
}

// Barèmes URSSAF 2026 — mis à jour annuellement
export const BAREME_URSSAF_2026 = {
  repas_journee: 21.10,          // repas en déplacement 1 journée
  grand_routier_journalier: 98.27, // GR nuitée hors domicile (repas midi+soir+coucher)
  territoire_propre_repas: 10.10,  // repas pour TP (1 repas)
  smic_horaire: 11.88,
} as const

export interface PayrollPreview {
  baseHours: number
  hourlyRate: number
  baseMonthlyGross: number
  absenceDeduction: number
  grossBase: number
  grossOvertime25: number
  grossOvertime50: number
  // Primes imposables uniquement (hors indemnités exonérées)
  primesImposables: number
  /** @deprecated Alias de primesImposables — conservé pour le PDF existant */
  bonusesTotal: number
  // Indemnités exonérées URSSAF (hors assiette cotisations)
  indemnitesExonerees: number
  depassementBaremeCotisable: number
  approvedExpenseReimbursement: number
  manualExpenseAdjustment: number
  expenseReimbursement: number
  // Brut soumis cotisations (NE contient PAS les indemnités exonérées)
  grossSubject: number
  employeeContributions: number
  employerContributions: number
  netBeforeIncomeTax: number
  incomeTaxWithholding: number
  taxableNet: number
  otherDeductions: number
  totalEmployeeDeductions: number
  netToPay: number
  employerTotalCost: number
  contributionLines: PayrollContributionLine[]
  alertesConformite: ConformiteAlerte[]
}

export interface PayrollSlip extends PayrollPreview {
  id: string
  employeeId: string
  periodLabel: string
  createdAt: string
  documentId: string
  availableAt?: string | null
  paymentScheduledAt?: string | null
}

type PayrollState = {
  slips: PayrollSlip[]
}

const STORAGE_KEY = 'nexora-payroll-v1'
const EVENT_NAME = 'nexora-payroll-updated'

function nextId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100_000)}`
}

function readState(): PayrollState {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const fallback = { slips: [] } satisfies PayrollState
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    return fallback
  }
  try {
    const parsed = JSON.parse(raw) as Partial<PayrollState>
    return { slips: Array.isArray(parsed.slips) ? parsed.slips : [] }
  } catch {
    const fallback = { slips: [] } satisfies PayrollState
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    return fallback
  }
}

function saveState(state: PayrollState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function numberOrZero(value: number) {
  return Number.isFinite(value) ? value : 0
}

function roundAmount(value: number) {
  return Math.round(value * 100) / 100
}

function formatCurrency(value: number) {
  return `${roundAmount(value).toFixed(2)} EUR`
}

function formatHourlyRate(value: number) {
  return `${roundAmount(value).toFixed(2)} EUR/h`
}

function formatHours(value: number) {
  return `${roundAmount(value).toFixed(2)} h`
}

function sanitizeFilePart(value: string) {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'periode'
}

function conventionAnnexReference(role: StaffMember['role']) {
  if (role === 'conducteur' || role === 'mecanicien') return 'Annexe I ouvriers'
  if (role === 'exploitant' || role === 'commercial' || role === 'comptable' || role === 'rh') {
    return 'Annexe II employes / Annexe III TAM'
  }
  return 'Annexe III TAM / Annexe IV cadres'
}

function maskSocialSecurityNumber(value: string | null) {
  if (!value) return 'Non renseigne'
  const normalized = value.replace(/\s+/g, '')
  if (normalized.length < 4) return value
  return `${normalized.slice(0, 3)} ${'*'.repeat(Math.max(0, normalized.length - 7))}${normalized.slice(-4)}`
}

function buildContributionLines(grossSubject: number): PayrollContributionLine[] {
  const mutuelleEmployee = 18.5
  const mutuelleEmployer = 18.5
  return [
    { label: 'Sante prevoyance', base: grossSubject, rate: 0.0095, employeeAmount: grossSubject * 0.0095, employerAmount: grossSubject * 0.13 },
    { label: 'Vieillesse plafonnee', base: grossSubject, rate: 0.069, employeeAmount: grossSubject * 0.069, employerAmount: grossSubject * 0.0855 },
    { label: 'Vieillesse deplafonnee', base: grossSubject, rate: 0.004, employeeAmount: grossSubject * 0.004, employerAmount: grossSubject * 0.019 },
    { label: 'Retraite complementaire T1', base: grossSubject, rate: 0.0315, employeeAmount: grossSubject * 0.0315, employerAmount: grossSubject * 0.0472 },
    { label: 'CEG / equilibre general', base: grossSubject, rate: 0.0086, employeeAmount: grossSubject * 0.0086, employerAmount: grossSubject * 0.0129 },
    { label: 'CSG deductible', base: grossSubject * 0.9825, rate: 0.068, employeeAmount: grossSubject * 0.9825 * 0.068, employerAmount: 0 },
    { label: 'CSG / CRDS non deductible', base: grossSubject * 0.9825, rate: 0.029, employeeAmount: grossSubject * 0.9825 * 0.029, employerAmount: 0 },
    { label: 'Mutuelle entreprise', base: 1, rate: 0, employeeAmount: mutuelleEmployee, employerAmount: mutuelleEmployer },
    { label: 'Allocations familiales / AT / chomage', base: grossSubject, rate: 0, employeeAmount: 0, employerAmount: grossSubject * (0.0345 + 0.021 + 0.0405) },
  ].map(line => ({
    ...line,
    base: roundAmount(line.base),
    employeeAmount: roundAmount(line.employeeAmount),
    employerAmount: roundAmount(line.employerAmount),
  }))
}

function checkConformite(record: EmployeeRecord, input: PayrollInput): ConformiteAlerte[] {
  const alertes: ConformiteAlerte[] = []
  const taux = numberOrZero(record.hourlyRate || 0)
  // Contrôle SMIC horaire
  if (taux > 0 && taux < BAREME_URSSAF_2026.smic_horaire) {
    alertes.push({
      type: 'smic_horaire',
      niveau: 'bloquant',
      message: `Taux horaire ${taux.toFixed(4)} €/h inférieur au SMIC ${BAREME_URSSAF_2026.smic_horaire} €/h — bulletin illégal`,
    })
  }
  // Contrôle plafond repas unitaire
  if (input.nbRepas > 0) {
    const repasUnitaire = numberOrZero(input.indemniteRepasExo) / input.nbRepas
    if (repasUnitaire > BAREME_URSSAF_2026.repas_journee) {
      alertes.push({
        type: 'plafond_repas_urssaf',
        niveau: 'avertissement',
        message: `Indemnité repas unitaire ${repasUnitaire.toFixed(2)} €/repas dépasse le barème URSSAF ${BAREME_URSSAF_2026.repas_journee} € — l'excédent est soumis à cotisations`,
      })
    }
  }
  // Contrôle plafond GR journalier
  if (input.nbJoursGr > 0) {
    const grJournalier = numberOrZero(input.indemniteGrandRoutierExo) / input.nbJoursGr
    if (grJournalier > BAREME_URSSAF_2026.grand_routier_journalier) {
      alertes.push({
        type: 'plafond_grand_routier_urssaf',
        niveau: 'avertissement',
        message: `Indemnité GR journalière ${grJournalier.toFixed(2)} €/jour dépasse le barème URSSAF ${BAREME_URSSAF_2026.grand_routier_journalier} € — l'excédent est soumis à cotisations`,
      })
    }
  }
  return alertes
}

export function calculatePayrollPreview(record: EmployeeRecord, input: PayrollInput): PayrollPreview {
  const baseHours = numberOrZero(record.monthlyBaseHours || 151.67)
  const hourlyRate = numberOrZero(record.hourlyRate || 0)
  const baseMonthlyGross = roundAmount(baseHours * hourlyRate)
  const absenceDeduction = roundAmount(numberOrZero(input.absenceHours) * hourlyRate)
  const grossBase = roundAmount(Math.max(0, baseMonthlyGross - absenceDeduction))
  const grossOvertime25 = roundAmount(numberOrZero(input.overtime25Hours) * hourlyRate * 1.25)
  const grossOvertime50 = roundAmount(numberOrZero(input.overtime50Hours) * hourlyRate * 1.5)

  // Primes IMPOSABLES uniquement (soumises à cotisations et IR)
  const primesImposables = roundAmount(
    numberOrZero(input.performanceBonus)
    + numberOrZero(input.exceptionalBonus)
    + numberOrZero(input.depassementBaremeCotisable), // part des indemnités dépassant les barèmes
  )

  // Indemnités EXONÉRÉES (hors assiette si ≤ barème URSSAF)
  const indemnitesExonerees = roundAmount(
    numberOrZero(input.indemniteRepasExo)
    + numberOrZero(input.indemniteGrandRoutierExo)
    + numberOrZero(input.indemniteTpExo)
    // Compat ascendante : anciens champs si nouveaux à zéro
    + (numberOrZero(input.indemniteRepasExo) === 0 ? numberOrZero(input.mealAllowance ?? 0) : 0)
    + (numberOrZero(input.indemniteTpExo) === 0 ? numberOrZero(input.transportBonus ?? 0) : 0),
  )
  const depassementBaremeCotisable = roundAmount(numberOrZero(input.depassementBaremeCotisable))

  const approvedExpenseReimbursement = roundAmount(sumApprovedExpenseReimbursements(record.employeeId, input.periodLabel))
  const manualExpenseAdjustment = roundAmount(numberOrZero(input.manualExpenseAdjustment))
  const expenseReimbursement = roundAmount(approvedExpenseReimbursement + manualExpenseAdjustment)

  // BRUT SOUMIS COTISATIONS : ne contient PAS les indemnités exonérées
  const grossSubject = roundAmount(grossBase + grossOvertime25 + grossOvertime50 + primesImposables)
  const contributionLines = buildContributionLines(grossSubject)
  const employeeContributions = roundAmount(contributionLines.reduce((sum, line) => sum + line.employeeAmount, 0))
  const employerContributions = roundAmount(contributionLines.reduce((sum, line) => sum + line.employerAmount, 0))
  const csgNonDeductible = contributionLines.find(line => line.label === 'CSG / CRDS non deductible')?.employeeAmount ?? 0
  // NET : brut - cotisations + indemnités exonérées + frais
  const netBeforeIncomeTax = roundAmount(grossSubject - employeeContributions + indemnitesExonerees + expenseReimbursement)
  const incomeTaxWithholding = roundAmount(numberOrZero(input.incomeTaxWithholding))
  const taxableNet = roundAmount(grossSubject - employeeContributions + csgNonDeductible)
  const otherDeductions = roundAmount(numberOrZero(input.advanceDeduction) + numberOrZero(input.otherDeduction))
  const totalEmployeeDeductions = roundAmount(incomeTaxWithholding + otherDeductions)
  const netToPay = roundAmount(netBeforeIncomeTax - totalEmployeeDeductions)
  const employerTotalCost = roundAmount(grossSubject + employerContributions + expenseReimbursement)
  const alertesConformite = checkConformite(record, input)

  return {
    baseHours: roundAmount(baseHours),
    hourlyRate: roundAmount(hourlyRate),
    baseMonthlyGross,
    absenceDeduction,
    grossBase,
    grossOvertime25,
    grossOvertime50,
    primesImposables,
    bonusesTotal: primesImposables, // alias déprécié — même valeur pour compatibilité PDF
    indemnitesExonerees,
    depassementBaremeCotisable,
    approvedExpenseReimbursement,
    manualExpenseAdjustment,
    expenseReimbursement,
    grossSubject,
    employeeContributions,
    employerContributions,
    netBeforeIncomeTax,
    incomeTaxWithholding,
    taxableNet,
    otherDeductions,
    totalEmployeeDeductions,
    netToPay,
    employerTotalCost,
    contributionLines,
    alertesConformite,
  }
}

function drawSectionTitle(doc: jsPDF, y: number, label: string) {
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(40, y, 515, 20, 6, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text(normalizePdfText(label), 48, y + 13)
  return y + 30
}

function drawInfoBlock(doc: jsPDF, x: number, y: number, width: number, title: string, rows: Array<[string, string]>) {
  const height = 28 + rows.length * 14
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(x, y, width, height, 10, 10)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text(normalizePdfText(title), x + 10, y + 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  rows.forEach((row, index) => {
    doc.text(normalizePdfText(`${row[0]}: ${row[1]}`), x + 10, y + 32 + index * 14)
  })
  return height
}

function drawTableHeader(doc: jsPDF, y: number, columns: string[], widths: number[]) {
  let x = 40
  doc.setFillColor(15, 23, 42)
  doc.rect(40, y, widths.reduce((sum, width) => sum + width, 0), 20, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  columns.forEach((column, index) => {
    doc.text(normalizePdfText(column), x + 6, y + 13)
    x += widths[index]
  })
  return y + 20
}

function drawTableRow(doc: jsPDF, y: number, values: string[], widths: number[], shaded = false) {
  let x = 40
  if (shaded) {
    doc.setFillColor(248, 250, 252)
    doc.rect(40, y, widths.reduce((sum, width) => sum + width, 0), 18, 'F')
  }
  doc.setDrawColor(226, 232, 240)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(30, 41, 59)
  values.forEach((value, index) => {
    doc.rect(x, y, widths[index], 18)
    const text = normalizePdfText(value)
    const textWidth = doc.getTextWidth(text)
    const isNumeric = index > 0
    const textX = isNumeric ? x + widths[index] - Math.min(textWidth, widths[index] - 12) - 6 : x + 6
    doc.text(text, textX, y + 12)
    x += widths[index]
  })
  return y + 18
}

function drawSummaryCard(doc: jsPDF, x: number, y: number, width: number, label: string, value: string, accent: [number, number, number]) {
  doc.setFillColor(accent[0], accent[1], accent[2])
  doc.roundedRect(x, y, width, 50, 12, 12, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(226, 232, 240)
  doc.text(normalizePdfText(label), x + 12, y + 16)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text(normalizePdfText(value), x + 12, y + 35)
}

function createPayrollPdf(employee: StaffMember, actor: Profil, record: EmployeeRecord, input: PayrollInput, preview: PayrollPreview) {
  const settings = readCompanySettings()
  const approvedExpenseTickets = listApprovedExpenseTicketsForPeriod(employee.id, input.periodLabel)
  const annexReference = conventionAnnexReference(employee.role)
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const now = new Date()
  const title = `Bulletin de paie - ${input.periodLabel}`
  const fileName = `paie-${employee.id}-${sanitizeFilePart(input.periodLabel)}.pdf`
  let y = drawPdfBranding(doc, {
    companyName: settings.companyName,
    companyLogoDataUrl: settings.logoDataUrl,
  }, 34)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.text(normalizePdfText(title), 40, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(normalizePdfText(`Document emis le ${now.toLocaleDateString('fr-FR')}`), 430, y)
  y += 18

  const leftHeight = drawInfoBlock(doc, 40, y, 248, 'Employeur', [
    ['Entreprise', settings.companyName],
    ['Adresse', 'Parc logistique Delta, 59810 Lesquin'],
    ['SIRET', '900 000 001 00018'],
    ['Code NAF', '4941A'],
  ])
  const rightHeight = drawInfoBlock(doc, 307, y, 248, 'Salarie', [
    ['Nom', staffDisplayName(employee)],
    ['Poste', record.jobTitle ?? ROLE_LABELS[employee.role] ?? employee.role],
    ['Contrat', record.contractType ?? 'A renseigner'],
    ['NIR', maskSocialSecurityNumber(record.socialSecurityNumber)],
    ['Mail pro', record.professionalEmail],
  ])
  y += Math.max(leftHeight, rightHeight) + 12

  y = drawSectionTitle(doc, y, 'References RH et conventionnelles')
  y = drawTableHeader(doc, y, ['Libelle', 'Valeur', 'Libelle', 'Valeur'], [180, 77, 180, 78])
  y = drawTableRow(doc, y, ['Convention', 'IDCC 16', 'Branche', 'Transport routier'], [180, 77, 180, 78], true)
  y = drawTableRow(doc, y, ['Annexe', annexReference, 'Coefficient', record.jobCoefficient ?? 'A renseigner'], [180, 77, 180, 78])
  y = drawTableRow(doc, y, ['Taux horaire', formatHourlyRate(preview.hourlyRate), 'Base mensuelle', formatHours(preview.baseHours)], [180, 77, 180, 78], true)
  y = drawTableRow(doc, y, ['Salaire mensuel base', formatCurrency(preview.baseMonthlyGross), 'Contrat', record.contractType ?? 'A renseigner'], [180, 77, 180, 78])
  y += 14

  y = drawSectionTitle(doc, y, 'Periode et activite')
  y = drawTableHeader(doc, y, ['Libelle', 'Valeur', 'Libelle', 'Valeur'], [180, 77, 180, 78])
  y = drawTableRow(doc, y, ['Periode', input.periodLabel, 'Base mensuelle', formatHours(preview.baseHours)], [180, 77, 180, 78], true)
  y = drawTableRow(doc, y, ['Heures travaillees', formatHours(input.workedHours), 'Heures absence', formatHours(input.absenceHours)], [180, 77, 180, 78])
  y = drawTableRow(doc, y, ['Heures sup 25%', formatHours(input.overtime25Hours), 'Heures sup 50%', formatHours(input.overtime50Hours)], [180, 77, 180, 78], true)
  y = drawTableRow(doc, y, ['Heures de nuit', formatHours(input.heuresNuit || 0), 'Source heures', input.sourceHeures || 'manuel'], [180, 77, 180, 78])
  y += 14

  y = drawSectionTitle(doc, y, 'Elements de remuneration soumis cotisations')
  const earningsWidths = [227, 70, 70, 74, 74]
  y = drawTableHeader(doc, y, ['Rubrique', 'Base', 'Taux', 'Gains', 'Retenues'], earningsWidths)
  const earningsRows: string[][] = [
    ['Salaire de base', formatHours(preview.baseHours), formatCurrency(preview.hourlyRate), formatCurrency(preview.baseMonthlyGross), ''],
    ['Absence non remuneree', formatHours(input.absenceHours), formatCurrency(preview.hourlyRate), '', formatCurrency(preview.absenceDeduction)],
    ['Heures supplementaires 25%', formatHours(input.overtime25Hours), '125 %', formatCurrency(preview.grossOvertime25), ''],
    ['Heures supplementaires 50%', formatHours(input.overtime50Hours), '150 %', formatCurrency(preview.grossOvertime50), ''],
  ]
  if (numberOrZero(input.performanceBonus) > 0)
    earningsRows.push(['Prime performance (imposable)', '-', '-', formatCurrency(numberOrZero(input.performanceBonus)), ''])
  if (numberOrZero(input.exceptionalBonus) > 0)
    earningsRows.push(['Prime exceptionnelle (imposable)', '-', '-', formatCurrency(numberOrZero(input.exceptionalBonus)), ''])
  if (numberOrZero(input.depassementBaremeCotisable) > 0)
    earningsRows.push(['Depassement bareme URSSAF (cotisable)', '-', '-', formatCurrency(preview.depassementBaremeCotisable), ''])
  earningsRows.forEach((row, index) => {
    y = drawTableRow(doc, y, row, earningsWidths, index % 2 === 0)
  })
  y += 8

  // Section indemnités exonérées (hors assiette)
  if (preview.indemnitesExonerees > 0) {
    y = drawSectionTitle(doc, y, 'Indemnites transport exonerees (hors assiette cotisations)')
    y = drawTableHeader(doc, y, ['Rubrique', 'Nb', 'Bareme max', 'Montant exonere', 'Statut'], [210, 50, 80, 100, 75])
    const indRows: string[][] = []
    if (numberOrZero(input.indemniteRepasExo) > 0 || numberOrZero(input.mealAllowance ?? 0) > 0) {
      const montant = numberOrZero(input.indemniteRepasExo) || numberOrZero(input.mealAllowance ?? 0)
      indRows.push(['Indemnite repas (petit deplacement)', String(input.nbRepas || '-'), '21.10 EUR', formatCurrency(montant), 'Exoneree'])
    }
    if (numberOrZero(input.indemniteGrandRoutierExo) > 0)
      indRows.push(['Indemnite grand routier (nuitee)', String(input.nbJoursGr || '-'), '98.27 EUR', formatCurrency(numberOrZero(input.indemniteGrandRoutierExo)), 'Exoneree'])
    if (numberOrZero(input.indemniteTpExo) > 0 || numberOrZero(input.transportBonus ?? 0) > 0) {
      const montant = numberOrZero(input.indemniteTpExo) || numberOrZero(input.transportBonus ?? 0)
      indRows.push(['Indemnite territoire propre', '-', '10.10 EUR', formatCurrency(montant), 'Exoneree'])
    }
    indRows.forEach((row, index) => {
      y = drawTableRow(doc, y, row, [210, 50, 80, 100, 75], index % 2 === 0)
    })
  }
  if (preview.approvedExpenseReimbursement > 0 || preview.manualExpenseAdjustment > 0) {
    y = drawTableRow(doc, y, ['Frais professionnels valides', '-', '-', formatCurrency(preview.approvedExpenseReimbursement + preview.manualExpenseAdjustment), ''], earningsWidths, true)
  }
  y += 14

  y = drawSectionTitle(doc, y, 'Cotisations et charges')
  const contributionsWidths = [220, 78, 64, 76, 77]
  y = drawTableHeader(doc, y, ['Rubrique', 'Base', 'Taux', 'Part salarie', 'Part employeur'], contributionsWidths)
  preview.contributionLines.forEach((line, index) => {
    y = drawTableRow(
      doc,
      y,
      [
        line.label,
        formatCurrency(line.base),
        line.rate > 0 ? `${(line.rate * 100).toFixed(2)} %` : '-',
        formatCurrency(line.employeeAmount),
        formatCurrency(line.employerAmount),
      ],
      contributionsWidths,
      index % 2 === 0,
    )
  })
  y += 18

  drawSummaryCard(doc, 40, y, 118, 'Brut soumis', formatCurrency(preview.grossSubject), [15, 23, 42])
  drawSummaryCard(doc, 171, y, 118, 'Net imposable', formatCurrency(preview.taxableNet), [30, 64, 175])
  drawSummaryCard(doc, 302, y, 118, 'Net avant PAS', formatCurrency(preview.netBeforeIncomeTax), [14, 116, 144])
  drawSummaryCard(doc, 433, y, 122, 'Net a payer', formatCurrency(preview.netToPay), [22, 101, 52])
  y += 64

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text(normalizePdfText(`Prelevement a la source: ${formatCurrency(preview.incomeTaxWithholding)}`), 40, y)
  doc.text(normalizePdfText(`Autres retenues: ${formatCurrency(preview.otherDeductions)}`), 240, y)
  doc.text(normalizePdfText(`Cout employeur estime: ${formatCurrency(preview.employerTotalCost)}`), 400, y)
  y += 16
  doc.text(normalizePdfText(`Tickets frais integres: ${approvedExpenseTickets.length} | Indemnites transport exonerees: ${formatCurrency(preview.indemnitesExonerees)}`), 40, y)
  y += 14
  doc.text(normalizePdfText(`Reference CCN: IDCC 16 - ${annexReference} | Source heures: ${input.sourceHeures || 'manuel'}`), 40, y)
  // Alertes conformité
  if (preview.alertesConformite.length > 0) {
    y += 14
    doc.setTextColor(220, 38, 38)
    preview.alertesConformite.forEach(alerte => {
      doc.text(normalizePdfText(`[${alerte.niveau.toUpperCase()}] ${alerte.message}`), 40, y)
      y += 12
    })
    doc.setTextColor(100)
  }

  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(normalizePdfText(`Bulletin genere par ${[actor.prenom, actor.nom].filter(Boolean).join(' ') || 'Service paie'}`), 40, 810)
  doc.text(normalizePdfText(`Convention: IDCC 16 - ${annexReference}`), 250, 810)

  const arrayBuffer = doc.output('arraybuffer')
  return {
    title,
    fileName,
    url: doc.output('datauristring'),
    size: arrayBuffer.byteLength,
  }
}

export function listPayrollSlips(employeeId?: string | null) {
  const all = readState().slips
  return (employeeId ? all.filter(item => item.employeeId === employeeId) : all)
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
}

export function savePayrollConfig(employeeId: string, patch: { conventionCollective?: string; jobCoefficient?: string | null; hourlyRate?: number | null; monthlyBaseHours?: number; contractType?: string | null; jobTitle?: string | null }) {
  return updateEmployeeRecord(employeeId, patch)
}

export function createPayrollSlip(employee: StaffMember, actor: Profil, input: PayrollInput) {
  const record = getEmployeeRecord(employee.id)
  if (!record || !record.hourlyRate) {
    throw new Error('Le taux horaire doit etre renseigne dans la fiche employee avant generation.')
  }

  const preview = calculatePayrollPreview(record, input)

  // Bloquer si alerte de conformité bloquante (ex : sous le SMIC)
  const alertesBloquantes = preview.alertesConformite.filter(a => a.niveau === 'bloquant')
  if (alertesBloquantes.length > 0) {
    throw new Error(alertesBloquantes.map(a => a.message).join(' | '))
  }

  const pdf = createPayrollPdf(employee, actor, record, input, preview)
  const companySettings = readCompanySettings()
  const payrollSchedule = buildPayrollPeriodSchedule(input.periodLabel, companySettings)

  const document = registerHrDocument({
    employeeId: employee.id,
    employeeName: staffDisplayName(employee),
    employeeEmail: employee.email,
    employeeRole: employee.role,
    category: 'fiche_paie',
    title: pdf.title,
    mimeType: 'application/pdf',
    fileName: pdf.fileName,
    size: pdf.size,
    url: pdf.url,
    createdById: actor.id,
    createdByName: [actor.prenom, actor.nom].filter(Boolean).join(' ') || 'Service paie',
    source: 'generated',
    requiresSignature: false,
    signedAt: null,
    signatureLabel: null,
    tags: ['paie', input.periodLabel, employee.role],
    availableAt: payrollSchedule.vaultAvailableAt?.toISOString() ?? null,
    paymentScheduledAt: payrollSchedule.paymentScheduledAt?.toISOString() ?? null,
  })

  if (employee.email) {
    const availabilityLabel = formatPayrollWorkflowDate(payrollSchedule.vaultAvailableAt)
    const paymentLabel = formatPayrollWorkflowDate(payrollSchedule.paymentScheduledAt)
    deliverDemoMailToInbox(
      {
        id: employee.id,
        role: employee.role,
        nom: employee.nom,
        prenom: employee.prenom,
        email: employee.email,
        domain: employee.domain,
        isDemo: true,
      },
      [actor.prenom, actor.nom].filter(Boolean).join(' ') || 'Service paie',
      actor.email ?? `${actor.role}@nexora.local`,
      pdf.title,
      serializeTchatPayload(
        `Votre bulletin de paie pour ${input.periodLabel} sera publie dans le coffre numerique a partir du ${availabilityLabel}. Versement salarie planifie le ${paymentLabel}.`,
        [{
          id: `attachment-${document.id}`,
          kind: 'document',
          name: document.fileName,
          mimeType: document.mimeType,
          size: document.size,
          url: document.url,
        }],
      ),
      ['paie', input.periodLabel],
    )
  }

  const slip: PayrollSlip = {
    id: nextId('payroll'),
    employeeId: employee.id,
    periodLabel: input.periodLabel,
    createdAt: new Date().toISOString(),
    documentId: document.id,
    availableAt: payrollSchedule.vaultAvailableAt?.toISOString() ?? null,
    paymentScheduledAt: payrollSchedule.paymentScheduledAt?.toISOString() ?? null,
    ...preview,
  }

  const state = readState()
  state.slips.unshift(slip)
  saveState(state)
  markApprovedExpenseTicketsPaid(employee.id, input.periodLabel, slip.id)
  return slip
}

export function subscribePayroll(listener: () => void) {
  const handle = () => listener()
  window.addEventListener(EVENT_NAME, handle)
  window.addEventListener('storage', handle)
  return () => {
    window.removeEventListener(EVENT_NAME, handle)
    window.removeEventListener('storage', handle)
  }
}
