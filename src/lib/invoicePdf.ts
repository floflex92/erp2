import { jsPDF } from 'jspdf'

type InvoicePdfInput = {
  invoiceNumber: string
  clientName: string
  issueDate: string
  dueDate: string | null
  paymentMode: string | null
  amountHt: number
  vatRate: number
  amountTva: number
  amountTtc: number
  notes: string | null
  otReferences: string[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : '-'
}

async function sha256Hex(buffer: ArrayBuffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function buildInvoicePdf(input: InvoicePdfInput) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const marginX = 16
  let cursorY = 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('FACTURE CLIENT', marginX, cursorY)
  cursorY += 8

  doc.setFontSize(11)
  doc.text(`Numero: ${input.invoiceNumber}`, marginX, cursorY)
  cursorY += 6
  doc.setFont('helvetica', 'normal')
  doc.text(`Client: ${input.clientName}`, marginX, cursorY)
  cursorY += 6
  doc.text(`Date emission: ${formatDate(input.issueDate)}`, marginX, cursorY)
  cursorY += 6
  doc.text(`Date echeance: ${formatDate(input.dueDate)}`, marginX, cursorY)
  cursorY += 6
  doc.text(`Mode de paiement: ${input.paymentMode ?? '-'}`, marginX, cursorY)
  cursorY += 10

  doc.setFont('helvetica', 'bold')
  doc.text('Ordres de transport rattaches', marginX, cursorY)
  cursorY += 6
  doc.setFont('helvetica', 'normal')
  if (input.otReferences.length === 0) {
    doc.text('Aucun OT rattache', marginX, cursorY)
    cursorY += 6
  } else {
    input.otReferences.forEach(reference => {
      doc.text(`- ${reference}`, marginX, cursorY)
      cursorY += 5
    })
  }

  cursorY += 4
  doc.setFont('helvetica', 'bold')
  doc.text('Montants', marginX, cursorY)
  cursorY += 6
  doc.setFont('helvetica', 'normal')
  doc.text(`HT: ${formatCurrency(input.amountHt)}`, marginX, cursorY)
  cursorY += 5
  doc.text(`TVA ${input.vatRate}%: ${formatCurrency(input.amountTva)}`, marginX, cursorY)
  cursorY += 5
  doc.setFont('helvetica', 'bold')
  doc.text(`TTC: ${formatCurrency(input.amountTtc)}`, marginX, cursorY)
  cursorY += 8

  doc.setFont('helvetica', 'normal')
  const noteLines = doc.splitTextToSize(input.notes?.trim() || 'Aucune note complementaire.', 180)
  doc.text(noteLines, marginX, cursorY)
  cursorY += noteLines.length * 5 + 8

  doc.setDrawColor(148, 163, 184)
  doc.line(marginX, cursorY, 194, cursorY)
  cursorY += 6
  doc.setFontSize(9)
  doc.text('Document genere par NEXORA Truck pour suivi et authentification interne.', marginX, cursorY)

  const pdfBuffer = doc.output('arraybuffer')
  const checksum = await sha256Hex(pdfBuffer)
  const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' })

  return {
    blob: pdfBlob,
    checksum,
    fileName: `${input.invoiceNumber}.pdf`,
  }
}