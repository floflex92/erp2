import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_TCHAT_STYLE,
  TCHAT_EMOJIS,
  attachmentLabel,
  filesToDraftAttachments,
  formatAttachmentSize,
  parseTchatPayload,
  type TchatAttachment,
  type TchatDraftAttachment,
  type TchatTextStyle,
} from '@/lib/tchatMessage'
import type { TchatConversation, TchatMessage } from '@/lib/tchatTypes'
import { ROLE_LABELS, type Profil } from '@/lib/auth'
import { type ChatPresenceProfile } from '@/lib/chatPresence'
import { saveAttachmentToVault } from '@/lib/vault'
import { TchatPresenceBadge } from './TchatPresenceBadge'

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'bg-slate-700/40', text: 'text-slate-300' },
  dirigeant: { bg: 'bg-violet-900/40', text: 'text-violet-300' },
  exploitant: { bg: 'bg-blue-900/40', text: 'text-blue-300' },
  mecanicien: { bg: 'bg-orange-900/40', text: 'text-orange-300' },
  commercial: { bg: 'bg-emerald-900/40', text: 'text-emerald-300' },
  comptable: { bg: 'bg-slate-800/40', text: 'text-slate-300' },
  rh: { bg: 'bg-rose-900/40', text: 'text-rose-300' },
  conducteur: { bg: 'bg-amber-900/40', text: 'text-amber-300' },
}

const EMPTY_HINT_ICON = '...'
const CHECK_SINGLE = '✓'
const CHECK_DOUBLE = '✓✓'
const PREVIEW_IMAGE_ICON = '🖼️'
const PREVIEW_DOCUMENT_ICON = '📄'
const COMPOSER_EMOJI_ICON = '🙂'

const roleColor = (role: string) => ROLE_COLORS[role] ?? { bg: 'bg-slate-700/40', text: 'text-slate-300' }

const initiales = (profile: Profil) =>
  (`${profile.prenom?.[0] ?? ''}${profile.nom?.[0] ?? ''}`.toUpperCase() || profile.role[0].toUpperCase())

const displayName = (profile: Profil) =>
  profile.prenom || profile.nom
    ? [profile.prenom, profile.nom].filter(Boolean).join(' ')
    : ROLE_LABELS[profile.role] ?? profile.role

const conversationTitle = (conversation: TchatConversation) =>
  conversation.participants.length <= 1
    ? displayName(conversation.participants[0])
    : `${displayName(conversation.participants[0])} +${conversation.participants.length - 1}`

const conversationSubtitle = (conversation: TchatConversation) =>
  conversation.participants.length <= 1
    ? (ROLE_LABELS[conversation.participants[0].role] ?? conversation.participants[0].role)
    : `Groupe: ${conversation.participants
        .slice(1, 3)
        .map(displayName)
        .join(', ')}${conversation.participants.length > 3 ? `, +${conversation.participants.length - 3}` : ''}`

const receiptStatus = (message: TchatMessage, profileId: string | null) => {
  if (!profileId || message.sender_id !== profileId) return null
  return message.read_at ? 'read' : 'delivered'
}

type Props = {
  className?: string
  conversation: TchatConversation | null
  messages: TchatMessage[]
  profilId: string | null
  demoMode: boolean
  loadingMsgs: boolean
  sending: boolean
  searchTerm: string
  presenceById: Record<string, ChatPresenceProfile>
  onBackToList?: () => void
  onSend: (text: string, attachments: TchatDraftAttachment[], style: TchatTextStyle) => Promise<void>
}

export function TchatConversationPanel({
  className,
  conversation,
  messages,
  profilId,
  demoMode,
  loadingMsgs,
  sending,
  searchTerm,
  presenceById,
  onBackToList,
  onSend,
}: Props) {
  const [showConversationDetails, setShowConversationDetails] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [draftAttachments, setDraftAttachments] = useState<TchatDraftAttachment[]>([])
  const [draftStyle, setDraftStyle] = useState<TchatTextStyle>(DEFAULT_TCHAT_STYLE)
  const [composerError, setComposerError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const documentInputRef = useRef<HTMLInputElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setShowConversationDetails(false)
    setShowEmojiPicker(false)
    setDraftText('')
    setDraftAttachments([])
    setDraftStyle(DEFAULT_TCHAT_STYLE)
    setComposerError(null)
  }, [conversation?.id])

  function appendEmoji(emoji: string) {
    setDraftText(current => `${current}${emoji}`)
  }

  async function addAttachments(files: FileList | null, kind: 'image' | 'document') {
    if (!files?.length) return
    try {
      setComposerError(null)
      const attachments = await filesToDraftAttachments(files, kind)
      setDraftAttachments(current => [...current, ...attachments].slice(0, 6))
    } catch (error) {
      setComposerError(error instanceof Error ? error.message : 'Ajout de fichier impossible.')
    }
  }

  async function submit() {
    if ((!draftText.trim() && draftAttachments.length === 0) || sending) return
    await onSend(draftText, draftAttachments, draftStyle)
    setDraftText('')
    setDraftAttachments([])
    setDraftStyle(DEFAULT_TCHAT_STYLE)
    setShowEmojiPicker(false)
    setComposerError(null)
  }

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-6xl opacity-20">{EMPTY_HINT_ICON}</div>
          <p className="font-medium text-slate-400">Selectionne une conversation</p>
          <p className="mt-1 text-sm text-slate-600">ou cree-en une nouvelle avec +</p>
        </div>
      </div>
    )
  }

  const lead = conversation.participants[0]
  const leadColor = roleColor(lead.role)
  const leadPresence = presenceById[lead.id]
  const normalizedSearch = normalizeSearch(searchTerm)

  return (
    <div className={`flex flex-1 flex-col ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setShowConversationDetails(current => !current)}
        className="border-b px-4 py-4 text-left transition-colors hover:bg-white/5 sm:px-5"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-3">
          {onBackToList && (
            <span
              role="button"
              tabIndex={0}
              onClick={event => {
                event.stopPropagation()
                onBackToList()
              }}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  onBackToList()
                }
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 md:hidden"
              aria-label="Revenir a la liste des conversations"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </span>
          )}
          <div className="relative shrink-0">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${leadColor.bg} ${leadColor.text}`}
            >
              {initiales(lead)}
            </span>
            {conversation.participants.length > 1 && (
              <span className="absolute -bottom-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full border border-slate-900 bg-sky-500 px-1 text-[9px] font-bold text-white">
                {conversation.participants.length}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">{conversationTitle(conversation)}</p>
            <p className="truncate text-xs text-slate-400">{conversationSubtitle(conversation)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {leadPresence && <TchatPresenceBadge presence={leadPresence} compact />}
              <p className="truncate text-[11px] text-slate-500">
                Touchez ici pour afficher {conversation.participants.length > 1 ? `${conversation.participants.length} participants` : '1 participant'} comme dans iMessage.
              </p>
            </div>
          </div>

          <span className={`text-slate-400 transition-transform ${showConversationDetails ? 'rotate-180' : ''}`}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </div>
      </button>

      {showConversationDetails && (
        <div
          className="border-b px-4 py-4 sm:px-5"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
        >
          <div className="flex flex-wrap gap-2">
            {conversation.participants.map(participant => {
              const color = roleColor(participant.role)
              const presence = presenceById[participant.id]
              return (
                <div
                  key={participant.id}
                  className="flex w-full min-w-0 items-start gap-3 rounded-2xl border px-3 py-3 sm:min-w-[230px] sm:w-auto"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.32)' }}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${color.bg} ${color.text}`}
                  >
                    {initiales(participant)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100">{displayName(participant)}</p>
                    <p className={`mb-2 text-xs ${color.text}`}>{ROLE_LABELS[participant.role] ?? participant.role}</p>
                    {presence && <TchatPresenceBadge presence={presence} showCustomStatus />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="nx-scrollbar flex-1 space-y-3 overflow-y-auto p-3 sm:p-5">
        {loadingMsgs ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 text-4xl opacity-30">{EMPTY_HINT_ICON}</div>
            <p className="text-sm text-slate-500">Demarre la conversation</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const payload = parseTchatPayload(message.content)
            const isMe = message.sender_id === profilId
            const status = receiptStatus(message, profilId)
            const previousMessage = index > 0 ? messages[index - 1] : null
            const showDate =
              !previousMessage
              || new Date(message.created_at).toDateString() !== new Date(previousMessage.created_at).toDateString()
            const imageAttachments = payload.attachments.filter(attachment => attachment.kind === 'image')
            const documentAttachments = payload.attachments.filter(attachment => attachment.kind === 'document')
            const matchesSearch = normalizedSearch.length > 0 && normalizeSearch(`${payload.text} ${payload.links.map(link => `${link.title} ${link.description ?? ''}`).join(' ')}`).includes(normalizedSearch)

            return (
              <div key={message.id}>
                {showDate && (
                  <div className="my-4 flex items-center gap-3">
                    <div className="flex-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                    <span className="px-2 text-xs text-slate-500">
                      {new Date(message.created_at).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </span>
                    <div className="flex-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                  </div>
                )}

                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[92%] rounded-2xl px-4 py-3 sm:max-w-[82%] ${isMe ? 'rounded-br-sm bg-blue-600 text-white' : 'rounded-bl-sm text-slate-100'} ${matchesSearch ? 'ring-2 ring-sky-400/60' : ''}`}
                    style={isMe ? undefined : { background: 'rgba(255,255,255,0.08)' }}
                  >
                    {payload.meta.autoReply && (
                      <div className={`mb-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${isMe ? 'bg-white/15 text-blue-100' : 'bg-sky-500/12 text-sky-200'}`}>
                        Reponse automatique
                      </div>
                    )}

                    {payload.text && (
                      <p className={`whitespace-pre-wrap break-words leading-relaxed ${messageTextClasses(payload.style)}`}>
                        {payload.text}
                      </p>
                    )}

                    {payload.links.length > 0 && (
                      <div className={`space-y-2 ${payload.text ? 'mt-3' : ''}`}>
                        {payload.links.map(link => (
                          <a
                            key={link.url}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`block rounded-2xl border px-3 py-3 transition-colors ${isMe ? 'border-white/10 bg-white/10 hover:bg-white/15' : 'border-white/10 bg-black/10 hover:bg-black/20'}`}
                          >
                            <p className={`text-[11px] uppercase tracking-[0.18em] ${isMe ? 'text-blue-100/80' : 'text-slate-400'}`}>{link.hostname}</p>
                            <p className="mt-1 text-sm font-semibold">{link.title}</p>
                            {link.description && <p className={`mt-1 text-xs ${isMe ? 'text-blue-100/80' : 'text-slate-400'}`}>{link.description}</p>}
                          </a>
                        ))}
                      </div>
                    )}

                    {payload.attachments.length > 0 && (
                      <div className={`space-y-2 ${payload.text || payload.links.length > 0 ? 'mt-3' : ''}`}>
                        {imageAttachments.length > 0 && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {imageAttachments.map(attachment => (
                              <AttachmentPreview key={attachment.id} attachment={attachment} compact={isMe} ownerId={profilId} sourceLabel={conversationTitle(conversation)} />
                            ))}
                          </div>
                        )}
                        {documentAttachments.map(attachment => (
                          <AttachmentPreview key={attachment.id} attachment={attachment} compact={isMe} ownerId={profilId} sourceLabel={conversationTitle(conversation)} />
                        ))}
                      </div>
                    )}

                    <div className={`mt-2 flex items-center gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <p className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-500'}`}>
                        {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {status && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${status === 'read' ? 'bg-sky-400/20 text-sky-100' : 'bg-white/12 text-blue-100'}`}
                        >
                          <span className="tracking-[-0.18em]">{status === 'read' ? CHECK_DOUBLE : CHECK_SINGLE}</span>
                          <span>{status === 'read' ? 'Vu' : 'Distribue'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-3 sm:p-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Texte</span>
          <button type="button" onClick={() => setDraftStyle(current => ({ ...current, bold: !current.bold }))} className={`rounded-lg px-2 py-1 text-xs font-semibold ${draftStyle.bold ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-300'}`}>Gras</button>
          <button type="button" onClick={() => setDraftStyle(current => ({ ...current, italic: !current.italic }))} className={`rounded-lg px-2 py-1 text-xs font-semibold ${draftStyle.italic ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-300'}`}>Italique</button>
          <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
            {(['left', 'center', 'right'] as const).map(align => (
              <button
                key={align}
                type="button"
                onClick={() => setDraftStyle(current => ({ ...current, align }))}
                className={`rounded-lg px-2 py-1 text-xs font-semibold ${draftStyle.align === align ? 'bg-blue-500 text-white' : 'text-slate-300'}`}
              >
                {align === 'left' ? 'G' : align === 'center' ? 'C' : 'D'}
              </button>
            ))}
          </div>
          <select
            value={draftStyle.size}
            onChange={event => setDraftStyle(current => ({ ...current, size: event.target.value as TchatTextStyle['size'] }))}
            className="rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-slate-200 outline-none"
          >
            <option value="sm">Petit</option>
            <option value="md">Normal</option>
            <option value="lg">Grand</option>
          </select>
          <select
            value={draftStyle.fontFamily}
            onChange={event => setDraftStyle(current => ({ ...current, fontFamily: event.target.value as TchatTextStyle['fontFamily'] }))}
            className="rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-slate-200 outline-none"
          >
            <option value="sans">Standard</option>
            <option value="serif">Serif</option>
            <option value="mono">Mono</option>
          </select>
        </div>

        {draftAttachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {draftAttachments.map(attachment => (
              <button
                key={attachment.id}
                type="button"
                onClick={() => setDraftAttachments(current => current.filter(item => item.id !== attachment.id))}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left"
              >
                <span className="text-sm">{attachment.kind === 'image' ? PREVIEW_IMAGE_ICON : PREVIEW_DOCUMENT_ICON}</span>
                <span className="max-w-[180px] truncate text-xs text-slate-200">{attachment.name}</span>
                <span className="text-[10px] text-slate-500">x</span>
              </button>
            ))}
          </div>
        )}

        {showEmojiPicker && (
          <div className="mb-3 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
            {TCHAT_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => appendEmoji(emoji)}
                className="rounded-xl bg-white/5 px-3 py-2 text-xl transition-colors hover:bg-white/10"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {composerError && (
          <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {composerError}
          </div>
        )}

        <form
          onSubmit={event => {
            event.preventDefault()
            void submit()
          }}
          className="space-y-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(current => !current)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg text-slate-200 transition-colors hover:bg-white/10"
              title="Emoji"
            >
              {COMPOSER_EMOJI_ICON}
            </button>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition-colors hover:bg-white/10"
              title="Ajouter une photo"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 6h4l2-2h4l2 2h4v12H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => documentInputRef.current?.click()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition-colors hover:bg-white/10"
              title="Ajouter un document"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 3h7l5 5v13H7z" />
                <path d="M14 3v5h5" />
              </svg>
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async event => {
                await addAttachments(event.target.files, 'image')
                event.target.value = ''
              }}
            />
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg"
              multiple
              className="hidden"
              onChange={async event => {
                await addAttachments(event.target.files, 'document')
                event.target.value = ''
              }}
            />
          </div>

          <div className="flex items-end gap-2">
            <textarea
              value={draftText}
              onChange={event => setDraftText(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void submit()
                }
              }}
              placeholder={demoMode ? 'Ecrire un message demo ou coller un lien... (Entree pour envoyer)' : 'Ecrire un message ou coller un lien... (Entree pour envoyer)'}
              rows={1}
              maxLength={4000}
              className="flex-1 resize-none rounded-xl border bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
              style={{ borderColor: 'rgba(255,255,255,0.1)', maxHeight: '120px' }}
            />

            <button
              type="submit"
              disabled={(!draftText.trim() && draftAttachments.length === 0) || sending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7Z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function messageTextClasses(style: TchatTextStyle) {
  const alignClass = style.align === 'center' ? 'text-center' : style.align === 'right' ? 'text-right' : 'text-left'
  const sizeClass = style.size === 'sm' ? 'text-xs' : style.size === 'lg' ? 'text-base' : 'text-sm'
  const weightClass = style.bold ? 'font-semibold' : ''
  const italicClass = style.italic ? 'italic' : ''
  const familyClass = style.fontFamily === 'serif' ? 'font-serif' : style.fontFamily === 'mono' ? 'font-mono' : ''
  return [alignClass, sizeClass, weightClass, italicClass, familyClass].join(' ')
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function AttachmentPreview({ attachment, compact, ownerId, sourceLabel }: { attachment: TchatAttachment; compact: boolean; ownerId: string | null; sourceLabel: string }) {
  const [saved, setSaved] = useState(false)

  function saveToVault() {
    if (!ownerId) return
    saveAttachmentToVault(ownerId, attachment, 'tchat', sourceLabel)
    setSaved(true)
  }

  if (attachment.kind === 'image') {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <a href={attachment.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-t-2xl">
          <img src={attachment.url} alt={attachment.name} className={`h-40 w-full object-cover ${compact ? 'opacity-95' : ''}`} />
        </a>
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-black/10 px-3 py-3">
          <a href={attachment.url} download={attachment.name} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-white/5">Appareil</a>
          <button type="button" onClick={saveToVault} disabled={!ownerId} className="rounded-xl bg-[color:var(--primary)] px-3 py-2 text-xs font-medium text-white disabled:opacity-50">Coffre</button>
          {saved && <span className="text-[11px] text-emerald-300">Enregistre dans le coffre</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-3">
      <div className="flex items-start gap-3">
        <span className="text-lg">{PREVIEW_DOCUMENT_ICON}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{attachment.name}</p>
        <p className="text-[11px] opacity-70">
          {attachmentLabel(attachment)} · {formatAttachmentSize(attachment.size)}
        </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a href={attachment.url} download={attachment.name} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-white/5">Appareil</a>
        <button type="button" onClick={saveToVault} disabled={!ownerId} className="rounded-xl bg-[color:var(--primary)] px-3 py-2 text-xs font-medium text-white disabled:opacity-50">Coffre</button>
        {saved && <span className="text-[11px] text-emerald-300">Enregistre dans le coffre</span>}
      </div>
    </div>
  )
}
