import fs from 'node:fs';
import path from 'node:path';
import { jsPDF } from 'jspdf';

const workspaceRoot = path.resolve(process.cwd(), '..', '..');
const sourcePath = path.join(workspaceRoot, 'DOSSIER_RECAPITULATIF_SITUATION_CONNECTIVITE_2026-04-18.md');
const outputPath = path.join(workspaceRoot, 'DOSSIER_RECAPITULATIF_SITUATION_CONNECTIVITE_2026-04-18.pdf');

if (!fs.existsSync(sourcePath)) {
  console.error(`Source introuvable: ${sourcePath}`);
  process.exit(1);
}

const raw = fs.readFileSync(sourcePath, 'utf8');
const lines = raw
  .replace(/\t/g, '    ')
  .split(/\r?\n/)
  .map((line) => line.replace(/^#{1,6}\s*/, '').trimEnd());

const doc = new jsPDF({
  orientation: 'p',
  unit: 'mm',
  format: 'a4',
  compress: true,
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const marginX = 14;
const marginTop = 14;
const marginBottom = 14;
const textWidth = pageWidth - marginX * 2;
let y = marginTop;

function ensureSpace(lineHeight) {
  if (y + lineHeight > pageHeight - marginBottom) {
    doc.addPage();
    y = marginTop;
  }
}

function writeWrapped(text, opts = {}) {
  const size = opts.size ?? 11;
  const lineGap = opts.lineGap ?? 1.3;
  const weight = opts.weight ?? 'normal';

  doc.setFont('helvetica', weight);
  doc.setFontSize(size);

  const wrapped = doc.splitTextToSize(text || ' ', textWidth);
  const lineHeight = size * 0.3528 * lineGap;

  for (const part of wrapped) {
    ensureSpace(lineHeight);
    doc.text(part, marginX, y);
    y += lineHeight;
  }
}

for (const line of lines) {
  const trimmed = line.trim();

  if (!trimmed) {
    y += 2.5;
    continue;
  }

  if (/^[A-Z0-9 .\-:]{12,}$/.test(trimmed)) {
    writeWrapped(trimmed, { size: 15, weight: 'bold', lineGap: 1.1 });
    y += 1.2;
    continue;
  }

  if (/^(\d+\.\d+|\d+)\s/.test(trimmed) || /^-{3,}$/.test(trimmed)) {
    writeWrapped(trimmed, { size: 12.5, weight: 'bold', lineGap: 1.15 });
    y += 0.8;
    continue;
  }

  if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
    writeWrapped(trimmed, { size: 9.5, weight: 'normal', lineGap: 1.1 });
    continue;
  }

  if (trimmed.startsWith('- ')) {
    writeWrapped(trimmed, { size: 10.8, lineGap: 1.2 });
    continue;
  }

  writeWrapped(trimmed, { size: 10.8, lineGap: 1.2 });
}

const totalPages = doc.getNumberOfPages();
for (let i = 1; i <= totalPages; i += 1) {
  doc.setPage(i);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`NEXORA - Dossier recapitulatif - Page ${i}/${totalPages}`, marginX, pageHeight - 6);
}

doc.save(outputPath);
console.log(`PDF genere: ${outputPath}`);
