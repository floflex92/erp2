import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  archiveDemoMail,
  countUnreadDemoMails,
  ensureDemoMailbox,
  listDemoMailRecords,
  markDemoMailRead,
  sendDemoMail,
  subscribeDemoMailUpdates,
  toggleDemoMailStar,
  type DemoMailFolder,
  type DemoMailRecord,
} from '@/lib/demoMail'
import { countImportantKeywordMatches, matchesImportantPerson, readCommunicationImportance, subscribeCommunicationImportance, toggleImportantPerson, type CommunicationImportanceSettings } from '@/lib/communicationImportance'
import {
  DEFAULT_TCHAT_STYLE,
  TCHAT_EMOJIS,
  attachmentLabel,
  filesToDraftAttachments,
  formatAttachmentSize,
  parseTchatPayload,
  serializeTchatPayload,
  type TchatAttachment,
  type TchatDraftAttachment,
  type TchatTextStyle,
} from '@/lib/tchatMessage'
import { saveAttachmentToVault } from '@/lib/vault'

const PREVIEW_IMAGE_ICON = '🖼️'
const PREVIEW_DOCUMENT_ICON = '📄'

const FOLDER_LABELS: Record<DemoMailFolder, string> = {
  inbox: 'Reception',
  sent: 'Envoyes',
  archive: 'Archives',
}

export default function Mail() {
  const { profil } = useAuth()
  const profilId = profil?.id ?? null
  const [mails, setMails] = useState<DemoMailRecord[]>([])
  const [folder, setFolder] = useState<DemoMailFolder>('inbox')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeAttachments, setComposeAttachments] = useState<TchatDraftAttachment[]>([])
  const [composeStyle, setComposeStyle] = useState<TchatTextStyle>(DEFAULT_TCHAT_STYLE)
  const [composeError, setComposeError] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [importanceSettings, setImportanceSettings] = useState<CommunicationImportanceSettings>(readCommunicationImportance())
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const documentInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!profil) return
    const currentProfil = profil
    function loadMailbox() {
      ensureDemoMailbox(currentProfil)
      const mailbox = listDemoMailRecords(currentProfil.id)
      setMails(mailbox)
      setSelectedId(current => current ?? mailbox[0]?.id ?? null)
    }
    loadMailbox()
    return subscribeDemoMailUpdates(loadMailbox)
  }, [profil])

  useEffect(() => {
    function refreshImportance() {
      setImportanceSettings(readCommunicationImportance())
    }
    refreshImportance()
    return subscribeCommunicationImportance(refreshImportance)
  }, [])

  const counts = useMemo(() => ({
    inbox: mails.filter(mail => mail.folder === 'inbox').length,
    sent: mails.filter(mail => mail.folder === 'sent').length,
    archive: mails.filter(mail => mail.folder === 'archive').length,
    unread: profilId ? countUnreadDemoMails(profilId) : 0,
  }), [mails, profilId])

  const normalizedSearch = normalizeSearch(searchTerm)

  const filteredMails = useMemo(() => {
    return mails.map(mail => {
      const payload = parseTchatPayload(mail.body)
      const important = matchesImportantPerson([], [mail.from_name, mail.from_email], importanceSettings)
        || countImportantKeywordMatches(`${mail.subject} ${payload.text}`, importanceSettings.keywords) > 0
      return { mail, payload, important }
    }).filter(({ mail, payload }) => {
      if (mail.folder !== folder) return false
      if (!normalizedSearch) return true
      const haystack = normalizeSearch([
        mail.from_name,
        mail.from_email,
        mail.subject,
        payload.text,
        payload.links.map(link => `${link.title} ${link.description ?? ''} ${link.url}`).join(' '),
      ].join(' '))
      return haystack.includes(normalizedSearch)
    }).sort((left, right) => Number(right.important) - Number(left.important))
  }, [mails, folder, normalizedSearch, importanceSettings])

  const selectedMail = mails.find(mail => mail.id === selectedId) ?? filteredMails[0]?.mail ?? null

  useEffect(() => {
    if (!profil || !selectedMail || selectedMail.folder !== 'inbox' || selectedMail.read) return
    markDemoMailRead(profil.id, selectedMail.id)
  }, [profil, selectedMail])

  async function addAttachments(files: FileList | null, kind: 'image' | 'document') {
    if (!files?.length) return
    try {
      setComposeError(null)
      const attachments = await filesToDraftAttachments(files, kind)
      setComposeAttachments(current => [...current, ...attachments].slice(0, 6))
    } catch (error) {
      setComposeError(error instanceof Error ? error.message : 'Ajout de fichier impossible.')
    }
  }

  function resetCompose() {
    setComposeTo('')
    setComposeSubject('')
    setComposeBody('')
    setComposeAttachments([])
    setComposeStyle(DEFAULT_TCHAT_STYLE)
    setComposeError(null)
    setShowEmojiPicker(false)
  }

  function openCompose(prefill?: Partial<DemoMailRecord>) {
    setShowCompose(true)
    setComposeTo(prefill?.from_email ?? '')
    setComposeSubject(prefill ? `Re: ${prefill.subject}` : '')
    setComposeBody('')
    setComposeAttachments([])
    setComposeStyle(DEFAULT_TCHAT_STYLE)
    setComposeError(null)
    setShowEmojiPicker(false)
  }

  function appendEmoji(emoji: string) {
    setComposeBody(current => `${current}${emoji}`)
  }

  function send() {
    if (!profil) return
    const recipients = composeTo.split(/[;,]+/).map(item => item.trim()).filter(Boolean)
    if (recipients.length === 0) {
      setComposeError('Ajoute au moins un destinataire.')
      return
    }
    if (!composeSubject.trim()) {
      setComposeError('Ajoute un objet.')
      return
    }
    if (!composeBody.trim() && composeAttachments.length === 0) {
      setComposeError('Ajoute un contenu ou une piece jointe.')
      return
    }

    const body = serializeTchatPayload(composeBody, composeAttachments, composeStyle)
    const sent = sendDemoMail(profil, recipients, composeSubject.trim(), body)
    setFolder('sent')
    setSelectedId(sent.id)
    setShowCompose(false)
    resetCompose()
  }

  if (!profil) return null

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Mails non lus" value={String(counts.unread)} tone="blue" />
        <MetricCard label="Boite de reception" value={String(counts.inbox)} tone="slate" />
        <MetricCard label="Envoyes" value={String(counts.sent)} tone="emerald" />
      </div>

      <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.7)' }}>
        <div className="flex w-[24rem] shrink-0 flex-col border-r" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="border-b px-4 py-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Mail</h2>
                <p className="mt-1 text-xs text-slate-400">Flux externe separe de la messagerie interne.</p>
              </div>
              <button type="button" onClick={() => openCompose()} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500">
                Nouveau
              </button>
            </div>

            <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
              <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Rechercher un expediteur, un objet ou un lien"
                className="w-full border-0 bg-transparent p-0 text-sm text-white outline-none placeholder:text-slate-500"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              {(['inbox', 'sent', 'archive'] as DemoMailFolder[]).map(currentFolder => (
                <button
                  key={currentFolder}
                  type="button"
                  onClick={() => setFolder(currentFolder)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${folder === currentFolder ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  {FOLDER_LABELS[currentFolder]}
                  {currentFolder === 'inbox' && counts.unread > 0 ? ` (${counts.unread})` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="nx-scrollbar flex-1 overflow-y-auto p-2">
            {filteredMails.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-5 text-center">
                <div className="mb-3 text-4xl opacity-25">...</div>
                <p className="text-sm text-slate-400">Aucun mail dans {FOLDER_LABELS[folder].toLowerCase()}.</p>
              </div>
            ) : (
              filteredMails.map(({ mail, payload, important }) => {
                const active = mail.id === selectedMail?.id && !showCompose
                return (
                  <button
                    key={mail.id}
                    type="button"
                    onClick={() => { setSelectedId(mail.id); setShowCompose(false) }}
                    className={`mb-1 w-full rounded-2xl px-3 py-3 text-left transition-colors ${active ? 'bg-blue-600/15 ring-1 ring-blue-500/30' : 'hover:bg-white/5'} ${important ? 'border border-amber-400/20 bg-amber-400/5' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {!mail.read && mail.folder === 'inbox' && <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />}
                          <p className={`truncate text-sm ${mail.read ? 'font-medium text-slate-200' : 'font-semibold text-white'}`}>{mail.from_name}</p>
                          {important && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-100">Important</span>}
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-100">{mail.subject}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{payload.text || 'Message avec piece jointe ou lien'}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] text-slate-500">{formatTime(mail.created_at)}</p>
                        {mail.starred && <p className="mt-1 text-xs text-amber-300">Suivi</p>}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          {showCompose ? (
            <ComposePanel
              composeTo={composeTo}
              setComposeTo={setComposeTo}
              composeSubject={composeSubject}
              setComposeSubject={setComposeSubject}
              composeBody={composeBody}
              setComposeBody={setComposeBody}
              composeAttachments={composeAttachments}
              setComposeAttachments={setComposeAttachments}
              composeStyle={composeStyle}
              setComposeStyle={setComposeStyle}
              composeError={composeError}
              send={send}
              resetCompose={resetCompose}
              showEmojiPicker={showEmojiPicker}
              setShowEmojiPicker={setShowEmojiPicker}
              appendEmoji={appendEmoji}
              addAttachments={addAttachments}
              imageInputRef={imageInputRef}
              documentInputRef={documentInputRef}
            />
          ) : selectedMail ? (
            <MailReader
              mail={selectedMail}
              ownerId={profil.id}
              importantSender={matchesImportantPerson([], [selectedMail.from_name, selectedMail.from_email], importanceSettings)}
              onReply={() => openCompose(selectedMail)}
              onArchive={() => {
                archiveDemoMail(profil.id, selectedMail.id)
                setFolder('archive')
              }}
              onToggleStar={() => toggleDemoMailStar(profil.id, selectedMail.id)}
              onToggleImportantSender={() => toggleImportantPerson(selectedMail.from_email.toLowerCase(), selectedMail.from_name)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-slate-500">Selectionne un mail</div>
          )}
        </div>
      </div>
    </div>
  )
}

function ComposePanel(props: {
  composeTo: string
  setComposeTo: (value: string) => void
  composeSubject: string
  setComposeSubject: (value: string) => void
  composeBody: string
  setComposeBody: (value: string) => void
  composeAttachments: TchatDraftAttachment[]
  setComposeAttachments: React.Dispatch<React.SetStateAction<TchatDraftAttachment[]>>
  composeStyle: TchatTextStyle
  setComposeStyle: React.Dispatch<React.SetStateAction<TchatTextStyle>>
  composeError: string | null
  send: () => void
  resetCompose: () => void
  showEmojiPicker: boolean
  setShowEmojiPicker: (value: boolean | ((current: boolean) => boolean)) => void
  appendEmoji: (emoji: string) => void
  addAttachments: (files: FileList | null, kind: 'image' | 'document') => Promise<void>
  imageInputRef: React.RefObject<HTMLInputElement | null>
  documentInputRef: React.RefObject<HTMLInputElement | null>
}) {
  const { composeTo, setComposeTo, composeSubject, setComposeSubject, composeBody, setComposeBody, composeAttachments, setComposeAttachments, composeStyle, setComposeStyle, composeError, send, resetCompose, showEmojiPicker, setShowEmojiPicker, appendEmoji, addAttachments, imageInputRef, documentInputRef } = props

  return (
    <div className="nx-scrollbar flex flex-1 flex-col overflow-y-auto">
      <div className="border-b px-5 py-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Nouveau mail</h3>
            <p className="mt-1 text-xs text-slate-400">Canal externe: ideal pour clients, fournisseurs et partenaires.</p>
          </div>
          <button type="button" onClick={resetCompose} className="text-sm text-slate-400 transition-colors hover:text-slate-200">Effacer</button>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <input value={composeTo} onChange={event => setComposeTo(event.target.value)} placeholder="A : client@domaine.fr, exploitation@client.fr" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
        <input value={composeSubject} onChange={event => setComposeSubject(event.target.value)} placeholder="Objet" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Texte</span>
          <button type="button" onClick={() => setComposeStyle(current => ({ ...current, bold: !current.bold }))} className={`rounded-lg px-2 py-1 text-xs font-semibold ${composeStyle.bold ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-300'}`}>Gras</button>
          <button type="button" onClick={() => setComposeStyle(current => ({ ...current, italic: !current.italic }))} className={`rounded-lg px-2 py-1 text-xs font-semibold ${composeStyle.italic ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-300'}`}>Italique</button>
          <select value={composeStyle.align} onChange={event => setComposeStyle(current => ({ ...current, align: event.target.value as TchatTextStyle['align'] }))} className="rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-slate-200 outline-none">
            <option value="left">Gauche</option>
            <option value="center">Centre</option>
            <option value="right">Droite</option>
          </select>
          <select value={composeStyle.size} onChange={event => setComposeStyle(current => ({ ...current, size: event.target.value as TchatTextStyle['size'] }))} className="rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-slate-200 outline-none">
            <option value="sm">Petit</option>
            <option value="md">Normal</option>
            <option value="lg">Grand</option>
          </select>
          <select value={composeStyle.fontFamily} onChange={event => setComposeStyle(current => ({ ...current, fontFamily: event.target.value as TchatTextStyle['fontFamily'] }))} className="rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-slate-200 outline-none">
            <option value="sans">Standard</option>
            <option value="serif">Serif</option>
            <option value="mono">Mono</option>
          </select>
        </div>

        {composeAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {composeAttachments.map(attachment => (
              <button key={attachment.id} type="button" onClick={() => setComposeAttachments(current => current.filter(item => item.id !== attachment.id))} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left">
                <span className="text-sm">{attachment.kind === 'image' ? PREVIEW_IMAGE_ICON : PREVIEW_DOCUMENT_ICON}</span>
                <span className="max-w-[180px] truncate text-xs text-slate-200">{attachment.name}</span>
                <span className="text-[10px] text-slate-500">x</span>
              </button>
            ))}
          </div>
        )}

        {showEmojiPicker && (
          <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
            {TCHAT_EMOJIS.map(emoji => (
              <button key={emoji} type="button" onClick={() => appendEmoji(emoji)} className="rounded-xl bg-white/5 px-3 py-2 text-xl transition-colors hover:bg-white/10">
                {emoji}
              </button>
            ))}
          </div>
        )}

        {composeError && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{composeError}</div>}

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowEmojiPicker(current => !current)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">Emoji</button>
          <button type="button" onClick={() => imageInputRef.current?.click()} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">Photo</button>
          <button type="button" onClick={() => documentInputRef.current?.click()} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10">Document</button>
          <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={async event => { await addAttachments(event.target.files, 'image'); event.target.value = '' }} />
          <input ref={documentInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg" multiple className="hidden" onChange={async event => { await addAttachments(event.target.files, 'document'); event.target.value = '' }} />
        </div>

        <textarea value={composeBody} onChange={event => setComposeBody(event.target.value)} rows={14} placeholder="Redige ton mail. Les liens colles seront compris et mis en avant." className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500" />

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={resetCompose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5">Annuler</button>
          <button type="button" onClick={send} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500">Envoyer</button>
        </div>
      </div>
    </div>
  )
}

function MailReader({ mail, ownerId, importantSender, onReply, onArchive, onToggleStar, onToggleImportantSender }: { mail: DemoMailRecord; ownerId: string; importantSender: boolean; onReply: () => void; onArchive: () => void; onToggleStar: () => void; onToggleImportantSender: () => void }) {
  const payload = parseTchatPayload(mail.body)
  return (
    <div className="nx-scrollbar flex flex-1 flex-col overflow-y-auto">
      <div className="border-b px-5 py-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{mail.folder === 'inbox' ? 'Mail recu' : mail.folder === 'sent' ? 'Mail envoye' : 'Archive'}</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{mail.subject}</h3>
            <p className="mt-2 text-sm text-slate-400">De {mail.from_name} • {mail.from_email}</p>
            <p className="mt-1 text-sm text-slate-500">Pour {mail.to.join(', ')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onToggleImportantSender} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5">{importantSender ? 'Retirer importance' : 'Mettre en importance'}</button>
            <button type="button" onClick={onToggleStar} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5">{mail.starred ? 'Retirer suivi' : 'Suivre'}</button>
            <button type="button" onClick={onArchive} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5">Archiver</button>
            <button type="button" onClick={onReply} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500">Repondre</button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {payload.text && <p className={messageTextClasses(payload.style)}>{payload.text}</p>}
        {payload.links.length > 0 && payload.links.map(link => (
          <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{link.hostname}</p>
            <p className="mt-1 text-sm font-semibold text-white">{link.title}</p>
            {link.description && <p className="mt-1 text-xs text-slate-400">{link.description}</p>}
          </a>
        ))}
        {payload.attachments.length > 0 && (
          <div className="space-y-2">
            {payload.attachments.map(attachment => <AttachmentPreview key={attachment.id} attachment={attachment} ownerId={ownerId} sourceLabel={mail.subject} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function AttachmentPreview({ attachment, ownerId, sourceLabel }: { attachment: TchatAttachment; ownerId: string; sourceLabel: string }) {
  const [saved, setSaved] = useState(false)

  function saveToVault() {
    saveAttachmentToVault(ownerId, attachment, 'mail', sourceLabel)
    setSaved(true)
  }
  if (attachment.kind === 'image') {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <a href={attachment.url} target="_blank" rel="noreferrer" className="block overflow-hidden">
          <img src={attachment.url} alt={attachment.name} className="h-56 w-full object-cover" />
        </a>
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-slate-950/40 px-3 py-3">
          <a href={attachment.url} download={attachment.name} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-white/5">Appareil</a>
          <button type="button" onClick={saveToVault} className="rounded-xl bg-[color:var(--primary)] px-3 py-2 text-xs font-medium text-white">Coffre</button>
          {saved && <span className="text-[11px] text-emerald-300">Enregistre dans le coffre</span>}
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <div className="flex items-start gap-3">
        <span className="text-lg">{PREVIEW_DOCUMENT_ICON}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{attachment.name}</p>
        <p className="text-[11px] text-slate-400">{attachmentLabel(attachment)} · {formatAttachmentSize(attachment.size)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a href={attachment.url} download={attachment.name} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-white/5">Appareil</a>
        <button type="button" onClick={saveToVault} className="rounded-xl bg-[color:var(--primary)] px-3 py-2 text-xs font-medium text-white">Coffre</button>
        {saved && <span className="text-[11px] text-emerald-300">Enregistre dans le coffre</span>}
      </div>
    </div>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'slate' | 'emerald' }) {
  const toneClass = tone === 'blue' ? 'from-blue-500/20 to-blue-500/5 text-blue-100' : tone === 'emerald' ? 'from-emerald-500/20 to-emerald-500/5 text-emerald-100' : 'from-slate-500/20 to-slate-500/5 text-slate-100'
  return (
    <div className={`rounded-2xl border bg-gradient-to-br px-4 py-4 ${toneClass}`} style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function messageTextClasses(style: TchatTextStyle) {
  const alignClass = style.align === 'center' ? 'text-center' : style.align === 'right' ? 'text-right' : 'text-left'
  const sizeClass = style.size === 'sm' ? 'text-xs' : style.size === 'lg' ? 'text-base' : 'text-sm'
  const weightClass = style.bold ? 'font-semibold' : ''
  const italicClass = style.italic ? 'italic' : ''
  const familyClass = style.fontFamily === 'serif' ? 'font-serif' : style.fontFamily === 'mono' ? 'font-mono' : ''
  return ['whitespace-pre-wrap', 'leading-relaxed', 'text-slate-100', alignClass, sizeClass, weightClass, italicClass, familyClass].join(' ')
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (diff === 1) return 'Hier'
  if (diff < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}
