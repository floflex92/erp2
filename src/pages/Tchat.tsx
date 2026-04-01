import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  countUnreadDemoMessages,
  getDemoConversationLastMessage,
  getDemoConversationRecords,
  getDemoMessageRecords,
  markAllDemoMessagesRead,
  markDemoConversationRead,
  openOrCreateDemoConversation,
  sendDemoMessage,
  subscribeDemoChatUpdates,
} from '@/lib/demoChat'
import { DEMO_PROFILES, isDemoProfil } from '@/lib/demoUsers'
import { supabase } from '@/lib/supabase'
import { DEFAULT_TCHAT_STYLE, parseTchatPayload, serializeTchatPayload, tchatMessageSummary, type TchatDraftAttachment, type TchatTextStyle } from '@/lib/tchatMessage'
import type { TchatConversation, TchatMessage } from '@/lib/tchatTypes'
import { ROLE_LABELS, canChatWith, type Profil, type Role, useAuth } from '@/lib/auth'
import { getChatPresenceMap, subscribeChatPresenceUpdates, updateChatPresence, type ChatPresenceProfile } from '@/lib/chatPresence'
import { countImportantKeywordMatches, matchesImportantPerson, readCommunicationImportance, subscribeCommunicationImportance, type CommunicationImportanceSettings } from '@/lib/communicationImportance'
import { TchatConversationPanel } from '@/components/tchat/TchatConversationPanel'
import { TchatSidebar } from '@/components/tchat/TchatSidebar'

type ParticipantRow = { conversation_id: string; profil_id: string; profils: Profil }
type ParticipantIdRow = { conversation_id: string; profil_id: string }

const displayName = (profile: Profil) => (profile.prenom || profile.nom ? [profile.prenom, profile.nom].filter(Boolean).join(' ') : ROLE_LABELS[profile.role] ?? profile.role)
const formatTime = (iso: string) => {
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (diff === 1) return 'Hier'
  if (diff < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}
const conversationTitle = (conversation: TchatConversation) => conversation.participants.length <= 1 ? displayName(conversation.participants[0]) : `${displayName(conversation.participants[0])} +${conversation.participants.length - 1}`
const conversationSubtitle = (conversation: TchatConversation) => conversation.participants.length <= 1 ? (ROLE_LABELS[conversation.participants[0].role] ?? conversation.participants[0].role) : `Groupe: ${conversation.participants.slice(1, 3).map(displayName).join(', ')}${conversation.participants.length > 3 ? `, +${conversation.participants.length - 3}` : ''}`
const sameSet = (left: string[], right: string[]) => [...left].sort().join('|') === [...right].sort().join('|')

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function mapDemoMessage(message: ReturnType<typeof getDemoMessageRecords>[number], profileId: string): TchatMessage {
  const otherReadAt = Object.entries(message.read_at_by).find(([id]) => id !== message.sender_id)?.[1] ?? null
  return { id: message.id, conversation_id: message.conversation_id, sender_id: message.sender_id, content: message.content, created_at: message.created_at, read_at: message.sender_id === profileId ? otherReadAt : message.read_at_by[profileId] ?? null }
}

export default function Tchat() {
  const { profil, role, isDemoSession } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [conversations, setConversations] = useState<TchatConversation[]>([])
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<TchatMessage[]>([])
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sending, setSending] = useState(false)
  const [allProfils, setAllProfils] = useState<Profil[]>([])
  const [showNewConv, setShowNewConv] = useState(false)
  const [filterRole, setFilterRole] = useState<string>('tous')
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([])
  const [selectedRoleGroups, setSelectedRoleGroups] = useState<Role[]>([])
  const [composerError, setComposerError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [conversationSearchIndex, setConversationSearchIndex] = useState<Record<string, string>>({})
  const [presenceById, setPresenceById] = useState<Record<string, ChatPresenceProfile>>({})
  const [importanceSettings, setImportanceSettings] = useState<CommunicationImportanceSettings>(readCommunicationImportance())
  const db = supabase
  const selectedConv = conversations.find(conversation => conversation.id === selectedConvId) ?? null
  const demoMode = Boolean(profil && isDemoProfil(profil) && isDemoSession)

  function resetComposer() {
    setSelectedRecipientIds([])
    setSelectedRoleGroups([])
    setComposerError(null)
  }

  function toggleRecipient(profileId: string) {
    setSelectedRecipientIds(current => current.includes(profileId) ? current.filter(id => id !== profileId) : [...current, profileId])
  }

  function toggleRoleGroup(group: Role) {
    setSelectedRoleGroups(current => current.includes(group) ? current.filter(roleItem => roleItem !== group) : [...current, group])
  }

  function addSelectedGroups() {
    const ids = allProfils.filter(candidate => selectedRoleGroups.includes(candidate.role)).map(candidate => candidate.id)
    setSelectedRecipientIds(current => Array.from(new Set([...current, ...ids])))
  }

  const loadAvailableProfils = useCallback(async () => {
    if (!profil || !role) return
    if (demoMode) {
      setAllProfils(DEMO_PROFILES.filter(candidate => candidate.id !== profil.id && canChatWith(role as Role, candidate.role)))
      return
    }
    const { data } = await db.from('profils').select('id, nom, prenom, role').neq('id', profil.id)
    setAllProfils(((data ?? []) as Profil[]).filter(candidate => canChatWith(role as Role, candidate.role)))
  }, [db, demoMode, profil, role])

  const loadConversations = useCallback(async () => {
    if (!profil) return
    setLoadingConvs(true)
    try {
      if (demoMode) {
        const result = getDemoConversationRecords(profil.id).map(record => {
          const participants = DEMO_PROFILES.filter(candidate => record.participant_ids.includes(candidate.id) && candidate.id !== profil.id)
          if (!participants.length) return null
          return { id: record.id, updated_at: record.updated_at, participants, last_message: tchatMessageSummary(getDemoConversationLastMessage(record.id) ?? ''), unread: countUnreadDemoMessages(record.id, profil.id) } satisfies TchatConversation
        }).filter(Boolean) as TchatConversation[]
        setConversations(result)
        return
      }

      const { data: myParts } = await db.from('tchat_participants').select('conversation_id').eq('profil_id', profil.id)
      const convIds = (myParts ?? []).map((item: { conversation_id: string }) => item.conversation_id)
      if (!convIds.length) {
        setConversations([])
        return
      }

      const { data: convs } = await db.from('tchat_conversations').select('id, updated_at').in('id', convIds).order('updated_at', { ascending: false })
      const { data: parts } = await db.from('tchat_participants').select('conversation_id, profil_id, profils(id, nom, prenom, role)').in('conversation_id', convIds).neq('profil_id', profil.id)
      const { data: lastMsgs } = await db.from('tchat_messages').select('conversation_id, content, created_at').in('conversation_id', convIds).order('created_at', { ascending: false })
      const { data: unreadData } = await db.from('tchat_messages').select('conversation_id').in('conversation_id', convIds).neq('sender_id', profil.id).is('read_at', null)

      const lastMsgMap: Record<string, string> = {}
      const unreadMap: Record<string, number> = {}
      const participantsMap: Record<string, Profil[]> = {}
      const seen = new Set<string>()
      for (const item of (lastMsgs ?? []) as Array<{ conversation_id: string; content: string }>) if (!seen.has(item.conversation_id)) { lastMsgMap[item.conversation_id] = tchatMessageSummary(item.content); seen.add(item.conversation_id) }
      for (const item of (unreadData ?? []) as Array<{ conversation_id: string }>) unreadMap[item.conversation_id] = (unreadMap[item.conversation_id] ?? 0) + 1
      for (const item of (parts ?? []) as ParticipantRow[]) participantsMap[item.conversation_id] = [...(participantsMap[item.conversation_id] ?? []), item.profils]

      setConversations(((convs ?? []) as Array<{ id: string; updated_at: string }>).map(conversation => ({ id: conversation.id, updated_at: conversation.updated_at, participants: participantsMap[conversation.id] ?? [], last_message: lastMsgMap[conversation.id], unread: unreadMap[conversation.id] ?? 0 })).filter(conversation => conversation.participants.length > 0))
    } finally {
      setLoadingConvs(false)
    }
  }, [db, demoMode, profil])

  const loadConversationSearchIndex = useCallback(async () => {
    if (!profil) return
    if (demoMode) {
      const index = Object.fromEntries(getDemoConversationRecords(profil.id).map(record => [record.id, getDemoMessageRecords(record.id).map(message => { const payload = parseTchatPayload(message.content); return [payload.text, payload.links.map(link => `${link.title} ${link.description ?? ''}`).join(' ')].join(' ') }).join(' ')]))
      setConversationSearchIndex(index)
      return
    }
    const convIds = conversations.map(conversation => conversation.id)
    if (convIds.length === 0) {
      setConversationSearchIndex({})
      return
    }
    const { data } = await db.from('tchat_messages').select('conversation_id, content').in('conversation_id', convIds)
    const index: Record<string, string> = {}
    for (const item of (data ?? []) as Array<{ conversation_id: string; content: string }>) {
      const payload = parseTchatPayload(item.content)
      index[item.conversation_id] = `${index[item.conversation_id] ?? ''} ${payload.text} ${payload.links.map(link => `${link.title} ${link.description ?? ''}`).join(' ')}`
    }
    setConversationSearchIndex(index)
  }, [conversations, db, demoMode, profil])

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!profil) return
    setLoadingMsgs(true)
    try {
      if (demoMode) {
        markDemoConversationRead(conversationId, profil.id)
        setMessages(getDemoMessageRecords(conversationId).map(message => mapDemoMessage(message, profil.id)))
        setConversations(previous => previous.map(conversation => conversation.id === conversationId ? { ...conversation, unread: 0 } : conversation))
        return
      }
      const { data } = await db.from('tchat_messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true })
      setMessages((data ?? []) as TchatMessage[])
      await db.from('tchat_messages').update({ read_at: new Date().toISOString() }).eq('conversation_id', conversationId).neq('sender_id', profil.id).is('read_at', null)
      setConversations(previous => previous.map(conversation => conversation.id === conversationId ? { ...conversation, unread: 0 } : conversation))
    } finally {
      setLoadingMsgs(false)
    }
  }, [db, demoMode, profil])

  async function maybeSendDemoAutoReplies(conversationId: string) {
    if (!selectedConv) return
    const existingMessages = getDemoMessageRecords(conversationId)
    const now = Date.now()
    for (const participant of selectedConv.participants) {
      const presence = presenceById[participant.id]
      if (!presence?.vacationEnabled || !presence.autoReplyMessage.trim()) continue
      const lastAutoReply = [...existingMessages].reverse().find(message => message.sender_id === participant.id && parseTchatPayload(message.content).meta.autoReply === true)
      if (lastAutoReply && now - new Date(lastAutoReply.created_at).getTime() < 8 * 60 * 60 * 1000) continue
      const content = serializeTchatPayload(presence.autoReplyMessage, [], DEFAULT_TCHAT_STYLE, { autoReply: true })
      sendDemoMessage(conversationId, participant.id, content)
    }
  }

  async function sendEnrichedMessage(text: string, attachments: TchatDraftAttachment[], style: TchatTextStyle) {
    if (!selectedConvId || !profil || sending) return
    setSending(true)
    const content = serializeTchatPayload(text, attachments, style)
    try {
      if (demoMode) {
        sendDemoMessage(selectedConvId, profil.id, content)
        await maybeSendDemoAutoReplies(selectedConvId)
        await loadConversations()
        await loadConversationSearchIndex()
        await loadMessages(selectedConvId)
        return
      }
      await db.from('tchat_messages').insert({ conversation_id: selectedConvId, sender_id: profil.id, content })
      await loadConversationSearchIndex()
    } finally {
      setSending(false)
    }
  }

  const openOrCreateConversation = useCallback(async (targetIds: string[]) => {
    if (!profil) return
    const recipientIds = Array.from(new Set(targetIds.filter(id => id !== profil.id)))
    if (!recipientIds.length) return
    setShowNewConv(false)
    resetComposer()
    if (demoMode) {
      const convId = openOrCreateDemoConversation(profil.id, recipientIds)
      await loadConversations()
      await loadConversationSearchIndex()
      setSelectedConvId(convId)
      return
    }
    const wanted = [profil.id, ...recipientIds]
    const { data: myParts } = await db.from('tchat_participants').select('conversation_id').eq('profil_id', profil.id)
    const myConvIds = (myParts ?? []).map((item: { conversation_id: string }) => item.conversation_id)
    if (myConvIds.length) {
      const { data: allParts } = await db.from('tchat_participants').select('conversation_id, profil_id').in('conversation_id', myConvIds)
      const participantMap: Record<string, string[]> = {}
      for (const item of (allParts ?? []) as ParticipantIdRow[]) participantMap[item.conversation_id] = [...(participantMap[item.conversation_id] ?? []), item.profil_id]
      const existing = Object.entries(participantMap).find(([, ids]) => sameSet(ids, wanted))?.[0]
      if (existing) {
        setSelectedConvId(existing)
        return
      }
    }
    const { data: conversation, error } = await db.from('tchat_conversations').insert({}).select('id').single()
    if (error || !conversation) return
    await db.from('tchat_participants').insert(wanted.map(profileId => ({ conversation_id: conversation.id, profil_id: profileId })))
    await loadConversations()
    await loadConversationSearchIndex()
    setSelectedConvId(conversation.id)
  }, [db, demoMode, loadConversationSearchIndex, loadConversations, profil])

  useEffect(() => { void loadAvailableProfils() }, [loadAvailableProfils])
  useEffect(() => { if (selectedConvId) void loadMessages(selectedConvId) }, [loadMessages, selectedConvId])
  useEffect(() => { void loadConversationSearchIndex() }, [loadConversationSearchIndex])

  useEffect(() => {
    if (!profil) return
    const profileId = profil.id
    async function openInbox() {
      if (demoMode) markAllDemoMessagesRead(profileId)
      else await db.from('tchat_messages').update({ read_at: new Date().toISOString() }).neq('sender_id', profileId).is('read_at', null)
      await loadConversations()
      await loadConversationSearchIndex()
    }
    void openInbox()
  }, [db, demoMode, loadConversationSearchIndex, loadConversations, profil])

  useEffect(() => {
    if (!profil || !demoMode) return
    return subscribeDemoChatUpdates(() => {
      void loadConversations()
      void loadConversationSearchIndex()
      if (selectedConvId) void loadMessages(selectedConvId)
    })
  }, [demoMode, loadConversationSearchIndex, loadConversations, loadMessages, profil, selectedConvId])

  useEffect(() => {
    if (!selectedConvId || !profil || demoMode) return
    const channel = db.channel(`tchat_conv_${selectedConvId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tchat_messages', filter: `conversation_id=eq.${selectedConvId}` }, (payload: { new: TchatMessage }) => {
      const message = payload.new
      setMessages(previous => [...previous, message])
      if (message.sender_id !== profil.id) void db.from('tchat_messages').update({ read_at: new Date().toISOString() }).eq('id', message.id)
      void loadConversations()
      void loadConversationSearchIndex()
    }).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tchat_messages', filter: `conversation_id=eq.${selectedConvId}` }, (payload: { new: TchatMessage }) => {
      const updated = payload.new
      setMessages(previous => previous.map(message => message.id === updated.id ? { ...message, read_at: updated.read_at } : message))
    }).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [db, demoMode, loadConversationSearchIndex, loadConversations, profil, selectedConvId])

  useEffect(() => {
    if (!profil || demoMode) return
    const channel = db.channel('tchat_new_convs').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tchat_conversations' }, () => {
      void loadConversations()
      void loadConversationSearchIndex()
    }).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [db, demoMode, loadConversationSearchIndex, loadConversations, profil])

  useEffect(() => {
    if (!profil) return
    const profileId = profil.id
    function refreshPresence() {
      const ids = Array.from(new Set([profileId, ...allProfils.map(candidate => candidate.id), ...conversations.flatMap(conversation => conversation.participants.map(participant => participant.id))]))
      setPresenceById(getChatPresenceMap(ids))
    }
    refreshPresence()
    return subscribeChatPresenceUpdates(refreshPresence)
  }, [profil, allProfils, conversations])

  useEffect(() => {
    function refreshImportance() {
      setImportanceSettings(readCommunicationImportance())
    }
    refreshImportance()
    return subscribeCommunicationImportance(refreshImportance)
  }, [])

  const roleOptions = Array.from(new Set(conversations.flatMap(conversation => conversation.participants.map(participant => participant.role))))
  const composerRoleOptions = Array.from(new Set(allProfils.map(candidate => candidate.role))) as Role[]
  const composerProfiles = selectedRoleGroups.length === 0 ? allProfils : allProfils.filter(candidate => selectedRoleGroups.includes(candidate.role))
  const selectedRecipients = allProfils.filter(candidate => selectedRecipientIds.includes(candidate.id))
  const groupSelectionCount = allProfils.filter(candidate => selectedRoleGroups.includes(candidate.role)).length
  const normalizedSearch = normalizeSearch(searchTerm)

  useEffect(() => {
    if (!profil || allProfils.length === 0) return

    const recipientHintRaw = searchParams.get('recipient')?.trim()
    const recipientId = searchParams.get('recipientId')?.trim()
    const shouldAutostart = searchParams.get('autostart') === '1'
    if (!shouldAutostart) return

    let targetIds: string[] = []
    if (recipientId) {
      targetIds = allProfils.some(candidate => candidate.id === recipientId) ? [recipientId] : []
    }

    if (targetIds.length === 0 && recipientHintRaw) {
      const hint = normalizeSearch(recipientHintRaw)
      const matches = allProfils.filter(candidate => {
        const fullName = normalizeSearch([candidate.prenom, candidate.nom].filter(Boolean).join(' '))
        return fullName.includes(hint)
      })
      if (matches.length > 0) {
        targetIds = [matches[0].id]
      }
    }

    if (targetIds.length > 0) {
      void openOrCreateConversation(targetIds)
      setShowNewConv(false)
    } else {
      setShowNewConv(true)
      if (recipientHintRaw) setSearchTerm(recipientHintRaw)
    }

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('autostart')
    setSearchParams(nextParams, { replace: true })
  }, [allProfils, openOrCreateConversation, profil, searchParams, setSearchParams])

  const filteredConvs = useMemo(() => {
    const list = conversations.filter(conversation => filterRole === 'tous' || conversation.participants.some(participant => participant.role === filterRole))
    return list.map(conversation => {
      const title = conversationTitle(conversation)
      const subtitle = conversationSubtitle(conversation)
      const searchable = [title, subtitle, conversation.last_message ?? '', conversationSearchIndex[conversation.id] ?? ''].join(' ')
      const payload = normalizeSearch(searchable)
      const important = matchesImportantPerson(conversation.participants.map(participant => participant.id), conversation.participants.map(displayName), importanceSettings)
        || countImportantKeywordMatches(searchable, importanceSettings.keywords) > 0
      if (normalizedSearch && !payload.includes(normalizedSearch)) return null
      let score = important ? 10 : 1
      if (normalizedSearch) {
        if (normalizeSearch(title).startsWith(normalizedSearch)) score += 8
        else if (normalizeSearch(title).includes(normalizedSearch)) score += 5
        if (normalizeSearch(subtitle).includes(normalizedSearch)) score += 3
        if (normalizeSearch(conversation.last_message ?? '').includes(normalizedSearch)) score += 2
        if (normalizeSearch(conversationSearchIndex[conversation.id] ?? '').includes(normalizedSearch)) score += 1
      }
      return { conversation, score }
    }).filter(Boolean).sort((left, right) => (right?.score ?? 0) - (left?.score ?? 0)).map(item => item!.conversation)
  }, [conversations, filterRole, normalizedSearch, conversationSearchIndex, importanceSettings])

  const ownPresence = profil ? presenceById[profil.id] ?? null : null
  const hasSelection = Boolean(selectedConvId)

  return (
    <div className="space-y-4">
      <div className="flex min-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-2xl border md:h-[calc(100vh-5rem)] md:min-h-0 md:flex-row" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.7)' }}>
        <TchatSidebar
          className={hasSelection ? 'hidden md:flex' : 'flex'}
          demoMode={demoMode}
          ownPresence={ownPresence}
          onUpdateOwnPresence={patch => { if (profil) updateChatPresence(profil.id, patch) }}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          filteredConvs={filteredConvs}
          loadingConvs={loadingConvs}
          selectedConvId={selectedConvId}
          setSelectedConvId={setSelectedConvId}
          showNewConv={showNewConv}
          setShowNewConv={updater => setShowNewConv(current => updater(current))}
          filterRole={filterRole}
          setFilterRole={setFilterRole}
          roleOptions={roleOptions}
          composerRoleOptions={composerRoleOptions}
          selectedRoleGroups={selectedRoleGroups}
          toggleRoleGroup={toggleRoleGroup}
          addSelectedGroups={addSelectedGroups}
          groupSelectionCount={groupSelectionCount}
          selectedRecipients={selectedRecipients}
          toggleRecipient={toggleRecipient}
          composerProfiles={composerProfiles}
          selectedRecipientIds={selectedRecipientIds}
          openOrCreateConversation={openOrCreateConversation}
          resetComposer={resetComposer}
          composerError={composerError}
          presenceById={presenceById}
          conversationTitle={conversationTitle}
          conversationSubtitle={conversationSubtitle}
          formatTime={formatTime}
          normalizedSearch={normalizedSearch}
          importanceSettings={importanceSettings}
        />

        <TchatConversationPanel
          className={hasSelection ? 'flex' : 'hidden md:flex'}
          conversation={selectedConv}
          messages={messages}
          profilId={profil?.id ?? null}
          demoMode={demoMode}
          loadingMsgs={loadingMsgs}
          sending={sending}
          searchTerm={searchTerm}
          presenceById={presenceById}
          onBackToList={hasSelection ? () => setSelectedConvId(null) : undefined}
          onSend={sendEnrichedMessage}
        />
      </div>
    </div>
  )
}

