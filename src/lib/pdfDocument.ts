import { jsPDF } from 'jspdf'
import { DEFAULT_COMPANY_NAME, readCompanySettings } from './companySettings'

type PdfFile = {
  url: string
  size: number
}

export interface PdfSignatureBlock {
  label: string
  value: string
}

export interface PdfDocumentOptions {
  companyName?: string
  companyLogoDataUrl?: string | null
  signatures?: PdfSignatureBlock[]
}

export function normalizePdfText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
}

function addWrappedText(doc: jsPDF, lines: string[], startY: number, maxWidth: number) {
  let cursorY = startY
  lines.forEach(line => {
    const wrapped = doc.splitTextToSize(normalizePdfText(line || ' '), maxWidth) as string[]
    wrapped.forEach(chunk => {
      doc.text(chunk, 40, cursorY)
      cursorY += 16
    })
  })
  return cursorY
}

function inferImageFormat(dataUrl: string) {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG'
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP'
  return 'PNG'
}

function resolvePdfOptions(options: PdfDocumentOptions = {}) {
  const settings = readCompanySettings()
  return {
    companyName: options.companyName ?? settings.companyName ?? DEFAULT_COMPANY_NAME,
    companyLogoDataUrl: options.companyLogoDataUrl ?? settings.logoDataUrl,
    signatures: options.signatures ?? [],
  } satisfies Required<PdfDocumentOptions>
}

export function drawPdfBranding(doc: jsPDF, options: PdfDocumentOptions = {}, startY = 42) {
  const mergedOptions = resolvePdfOptions(options)
  const pageWidth = doc.internal.pageSize.getWidth()
  let textStartX = 40
  let cursorY = startY

  if (mergedOptions.companyLogoDataUrl) {
    try {
      doc.addImage(mergedOptions.companyLogoDataUrl, inferImageFormat(mergedOptions.companyLogoDataUrl), 40, startY - 10, 96, 48)
      textStartX = 148
    } catch {
      textStartX = 40
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(18, 18, 18)
  doc.text(normalizePdfText(mergedOptions.companyName || DEFAULT_COMPANY_NAME), textStartX, cursorY + 8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(98, 108, 125)
  doc.text('Documents officiels et operationnels ERP', textStartX, cursorY + 24)

  doc.setDrawColor(208, 213, 221)
  doc.line(40, cursorY + 42, pageWidth - 40, cursorY + 42)

  return cursorY + 66
}

export function createPdfDocument(title: string, lines: string[], options: PdfDocumentOptions = {}): PdfFile {
  const mergedOptions = resolvePdfOptions(options)
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let cursorY = drawPdfBranding(doc, mergedOptions, 42)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42)
  doc.text(normalizePdfText(title), 40, cursorY)
  cursorY += 24

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(31, 41, 55)
  cursorY = addWrappedText(doc, lines, cursorY, pageWidth - 80)

  if (mergedOptions.signatures && mergedOptions.signatures.length > 0) {
    cursorY += 12
    doc.setDrawColor(208, 213, 221)
    doc.line(40, cursorY, pageWidth - 40, cursorY)
    cursorY += 24
    doc.setFont('helvetica', 'bold')
    doc.text('Signatures actives', 40, cursorY)
    cursorY += 18
    doc.setFont('helvetica', 'normal')
    mergedOptions.signatures.forEach(signature => {
      cursorY = addWrappedText(doc, [`${signature.label}: ${signature.value}`], cursorY, pageWidth - 80)
    })
  }

  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(
    normalizePdfText(`Document genere le ${new Date().toLocaleString('fr-FR')}`),
    40,
    doc.internal.pageSize.getHeight() - 24,
  )

  const arrayBuffer = doc.output('arraybuffer')
  return {
    url: doc.output('datauristring'),
    size: arrayBuffer.byteLength,
  }
}
