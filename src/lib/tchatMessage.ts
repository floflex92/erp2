export type TchatAttachmentKind = 'image' | 'document'
export type TchatTextAlign = 'left' | 'center' | 'right'
export type TchatTextSize = 'sm' | 'md' | 'lg'
export type TchatFontFamily = 'sans' | 'serif' | 'mono'

export interface TchatAttachment {
  id: string
  kind: TchatAttachmentKind
  name: string
  mimeType: string
  size: number
  url: string
}

export interface TchatDraftAttachment {
  id: string
  kind: TchatAttachmentKind
  name: string
  mimeType: string
  size: number
  url: string
}

export interface TchatTextStyle {
  align: TchatTextAlign
  size: TchatTextSize
  fontFamily: TchatFontFamily
  bold: boolean
  italic: boolean
}

export interface TchatLinkPreview {
  url: string
  hostname: string
  title: string
  description: string | null
}

export interface TchatPayloadMeta {
  autoReply?: boolean
}

export interface TchatPayload {
  text: string
  attachments: TchatAttachment[]
  style: TchatTextStyle
  links: TchatLinkPreview[]
  meta: TchatPayloadMeta
}

type StoredTchatPayload = {
  kind: 'nexora-message-v2'
  text: string
  attachments: TchatAttachment[]
  style?: Partial<TchatTextStyle>
  links?: TchatLinkPreview[]
  meta?: TchatPayloadMeta
}

const FILE_SIZE_LIMIT_BYTES = 2_500_000
const FILE_COUNT_LIMIT = 6

export const DEFAULT_TCHAT_STYLE: TchatTextStyle = {
  align: 'left',
  size: 'md',
  fontFamily: 'sans',
  bold: false,
  italic: false,
}

export const TCHAT_EMOJIS = ['👍', '👌', '🙏', '🚚', '📍', '✅', '⚠️', '📦', '🧾', '🛠️', '⏱️', '🙂']

function nextId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100_000)}`
}

function normalizeTextStyle(style?: Partial<TchatTextStyle> | null): TchatTextStyle {
  return {
    align: style?.align === 'center' || style?.align === 'right' ? style.align : 'left',
    size: style?.size === 'sm' || style?.size === 'lg' ? style.size : 'md',
    fontFamily: style?.fontFamily === 'serif' || style?.fontFamily === 'mono' ? style.fontFamily : 'sans',
    bold: Boolean(style?.bold),
    italic: Boolean(style?.italic),
  }
}

function isDefaultStyle(style: TchatTextStyle) {
  return (
    style.align === DEFAULT_TCHAT_STYLE.align
    && style.size === DEFAULT_TCHAT_STYLE.size
    && style.fontFamily === DEFAULT_TCHAT_STYLE.fontFamily
    && style.bold === DEFAULT_TCHAT_STYLE.bold
    && style.italic === DEFAULT_TCHAT_STYLE.italic
  )
}

export function parseTchatPayload(content: string): TchatPayload {
  try {
    const parsed = JSON.parse(content) as Partial<StoredTchatPayload>
    if (
      parsed
      && parsed.kind === 'nexora-message-v2'
      && typeof parsed.text === 'string'
      && Array.isArray(parsed.attachments)
    ) {
      return {
        text: parsed.text,
        attachments: parsed.attachments.filter(attachment =>
          attachment
          && typeof attachment.id === 'string'
          && (attachment.kind === 'image' || attachment.kind === 'document')
          && typeof attachment.name === 'string'
          && typeof attachment.mimeType === 'string'
          && typeof attachment.size === 'number'
          && typeof attachment.url === 'string',
        ) as TchatAttachment[],
        style: normalizeTextStyle(parsed.style),
        links: Array.isArray(parsed.links)
          ? parsed.links.filter(link =>
              link
              && typeof link.url === 'string'
              && typeof link.hostname === 'string'
              && typeof link.title === 'string'
              && (typeof link.description === 'string' || link.description === null),
            ) as TchatLinkPreview[]
          : buildLinkPreviews(parsed.text),
        meta: typeof parsed.meta === 'object' && parsed.meta ? parsed.meta : {},
      }
    }
  } catch {
    // Keep backward compatibility with plain-text messages.
  }

  return {
    text: content,
    attachments: [],
    style: DEFAULT_TCHAT_STYLE,
    links: buildLinkPreviews(content),
    meta: {},
  }
}

export function serializeTchatPayload(
  text: string,
  attachments: TchatDraftAttachment[],
  style: Partial<TchatTextStyle> = DEFAULT_TCHAT_STYLE,
  meta: TchatPayloadMeta = {},
) {
  const normalizedStyle = normalizeTextStyle(style)
  const trimmedText = text.trim()
  const links = buildLinkPreviews(trimmedText)
  const hasAutoReply = Boolean(meta.autoReply)
  const payload: StoredTchatPayload = {
    kind: 'nexora-message-v2',
    text: trimmedText,
    attachments: attachments.map(attachment => ({
      id: attachment.id,
      kind: attachment.kind,
      name: attachment.name,
      mimeType: attachment.mimeType,
      size: attachment.size,
      url: attachment.url,
    })),
    style: normalizedStyle,
    links,
    meta,
  }

  if (!payload.text && payload.attachments.length === 0) return ''

  if (
    payload.attachments.length === 0
    && isDefaultStyle(normalizedStyle)
    && links.length === 0
    && !hasAutoReply
  ) {
    return payload.text
  }

  return JSON.stringify(payload)
}

export function tchatMessageSummary(content: string) {
  const payload = parseTchatPayload(content)
  const imageCount = payload.attachments.filter(attachment => attachment.kind === 'image').length
  const documentCount = payload.attachments.filter(attachment => attachment.kind === 'document').length

  if (payload.text) return payload.text
  if (imageCount && documentCount) return `${imageCount} photo(s) et ${documentCount} document(s)`
  if (imageCount) return imageCount === 1 ? 'Photo' : `${imageCount} photos`
  if (documentCount) return documentCount === 1 ? 'Document' : `${documentCount} documents`
  return 'Message'
}

export async function filesToDraftAttachments(files: FileList | File[], kind: TchatAttachmentKind) {
  const list = Array.from(files)
  if (list.length === 0) return [] as TchatDraftAttachment[]
  if (list.length > FILE_COUNT_LIMIT) {
    throw new Error(`Limite de ${FILE_COUNT_LIMIT} fichiers par envoi.`)
  }

  const attachments = await Promise.all(list.map(async file => {
    if (file.size > FILE_SIZE_LIMIT_BYTES) {
      throw new Error(`${file.name} depasse la limite de 2,5 Mo.`)
    }

    const url = await readFileAsDataUrl(file)
    return {
      id: nextId('attachment'),
      kind,
      name: file.name,
      mimeType: file.type || (kind === 'image' ? 'image/jpeg' : 'application/octet-stream'),
      size: file.size,
      url,
    } satisfies TchatDraftAttachment
  }))

  return attachments
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error(`Lecture impossible pour ${file.name}.`))
    }
    reader.onerror = () => reject(new Error(`Lecture impossible pour ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

export function attachmentLabel(attachment: TchatAttachment) {
  return attachment.kind === 'image' ? 'Photo' : 'Document'
}

export function formatAttachmentSize(size: number) {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(1)} Mo`
  if (size >= 1_000) return `${Math.round(size / 1_000)} Ko`
  return `${size} o`
}

function buildLinkPreviews(text: string) {
  const urls = extractUrls(text)
  const uniqueUrls = Array.from(new Set(urls))
  return uniqueUrls
    .map(url => buildLinkPreview(url, text))
    .filter((preview): preview is TchatLinkPreview => Boolean(preview))
}

function extractUrls(text: string) {
  return text.match(/https?:\/\/[^\s]+/gi) ?? []
}

function buildLinkPreview(url: string, text: string): TchatLinkPreview | null {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace(/^www\./i, '')
    const segments = parsed.pathname
      .split('/')
      .map(segment => decodeURIComponent(segment).trim())
      .filter(Boolean)

    const lastSegment = segments[segments.length - 1] ?? ''
    const title = humanizeSegment(lastSegment) || hostname
    const description = buildLinkDescription(text, url)

    return {
      url,
      hostname,
      title,
      description,
    }
  } catch {
    return null
  }
}

function buildLinkDescription(text: string, url: string) {
  const context = text.replace(url, ' ').replace(/\s+/g, ' ').trim()
  if (!context) return null
  return context.length > 100 ? `${context.slice(0, 97)}...` : context
}

function humanizeSegment(segment: string) {
  return segment
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase())
}
