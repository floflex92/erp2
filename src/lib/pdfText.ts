function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function extractPdfText(file: File) {
  const buffer = await file.arrayBuffer()
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  const latin1 = new TextDecoder('latin1').decode(buffer)
  const chunks = `${utf8}\n${latin1}`.match(/[A-Za-z0-9À-ÿ:/.,'()\- ]{3,}/g) ?? []
  return chunks.map(chunk => normalizeText(chunk)).filter(Boolean).join('\n')
}
