import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { jsPDF } from 'jspdf'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const inputPath = path.resolve(__dirname, '../docs/plan-mcd-base-donnees-exhaustif-2026-04-15.md')
const outputPath = path.resolve(__dirname, '../docs/plan-mcd-base-donnees-exhaustif-2026-04-15.pdf')

const source = fs.readFileSync(inputPath, 'utf8')
const lines = source.replace(/\r\n/g, '\n').split('\n')

const doc = new jsPDF({ unit: 'mm', format: 'a4' })

const marginLeft = 15
const marginTop = 15
const marginBottom = 15
const pageWidth = 210
const pageHeight = 297
const usableWidth = pageWidth - marginLeft * 2

let y = marginTop

function ensureSpace(heightNeeded) {
  if (y + heightNeeded > pageHeight - marginBottom) {
    doc.addPage()
    y = marginTop
  }
}

function writeWrapped(text, fontSize = 11, lineHeight = 5, style = 'normal') {
  doc.setFont('helvetica', style)
  doc.setFontSize(fontSize)

  const chunks = doc.splitTextToSize(text, usableWidth)
  for (const chunk of chunks) {
    ensureSpace(lineHeight)
    doc.text(chunk, marginLeft, y)
    y += lineHeight
  }
}

for (const raw of lines) {
  const line = raw.trimEnd()

  if (!line) {
    y += 2
    continue
  }

  if (line.startsWith('# ')) {
    ensureSpace(8)
    writeWrapped(line.slice(2), 16, 7, 'bold')
    y += 1
    continue
  }

  if (line.startsWith('## ')) {
    ensureSpace(7)
    writeWrapped(line.slice(3), 13, 6, 'bold')
    y += 1
    continue
  }

  if (line.startsWith('### ')) {
    ensureSpace(6)
    writeWrapped(line.slice(4), 12, 5.5, 'bold')
    continue
  }

  if (line.startsWith('- ')) {
    writeWrapped(`• ${line.slice(2)}`, 11, 5, 'normal')
    continue
  }

  writeWrapped(line, 11, 5, 'normal')
}

doc.save(outputPath)

console.log(`PDF genere: ${outputPath}`)
