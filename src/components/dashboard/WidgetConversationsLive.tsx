import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { parseTchatPayload } from '@/lib/tchatMessage'
import { looseSupabase } from '@/lib/supabaseLoose'
import { DEMO_PROFILES } from '@/lib/demoUsers'
import { countUnreadDemoMessages, getDemoConversationLastMessage, getDemoConversationRecords } from '@/lib/demoChat'

type ConversationIdRow = { conversation_id: string }

type ParticipantRow = ConversationIdRow & {
  profils: {
    id: string
    nom: string | null
    prenom: string | null
  }
}

type MessageRow = ConversationIdRow & {
  content: string
  created_at: string
}

interface LiveConversation {
  id: string
  title: string
  excerpt: string
  unread: number
}

function displayProfileName(profile: { nom: string | null; prenom: string | null }) {
  const fullName = [profile.prenom, profile.nom].filter(Boolean).join(' ')
  return fullName || 'Interlocuteur'
}

function avatarFromTitle(title: string) {
  return title.trim().slice(0, 2).toUpperCase()
}

export function WidgetConversationsLive() {
  const { profil, isDemoSession } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<LiveConversation[]>([])

  useEffect(() => {
    async function load() {
      if (!profil) {
        setRows([])
        setLoading(false)
        return
      }

      if (isDemoSession) {
        const demoRows = getDemoConversationRecords(profil.id)
          .map(conversation => {
            const participants = DEMO_PROFILES.filter(candidate => conversation.participant_ids.includes(candidate.id) && candidate.id !== profil.id)
            const main = participants[0]
            const title = main ? [main.prenom, main.nom].filter(Boolean).join(' ') || 'Interlocuteur' : 'Interlocuteur'
            const last = getDemoConversationLastMessage(conversation.id) ?? 'Nouvelle discussion'
            return {
              id: conversation.id,
              title,
              excerpt: last,
              unread: countUnreadDemoMessages(conversation.id, profil.id),
            }
          })
          .sort((a, b) => b.unread - a.unread)
          .slice(0, 5)

        setRows(demoRows)
        setLoading(false)
        return
      }

      const { data: conversationData } = await looseSupabase
        .from('tchat_participants')
        .select('conversation_id')
        .eq('profil_id', profil.id)

      const conversationIds = ((conversationData ?? []) as ConversationIdRow[]).map(item => item.conversation_id)
      if (conversationIds.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      const [{ data: participantsData }, { data: unreadData }, { data: messagesData }] = await Promise.all([
        looseSupabase
          .from('tchat_participants')
          .select('conversation_id, profils(id, nom, prenom)')
          .in('conversation_id', conversationIds)
          .neq('profil_id', profil.id),
        looseSupabase
          .from('tchat_messages')
          .select('conversation_id')
          .in('conversation_id', conversationIds)
          .neq('sender_id', profil.id)
          .is('read_at', null),
        looseSupabase
          .from('tchat_messages')
          .select('conversation_id, content, created_at')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false }),
      ])

      const unreadMap: Record<string, number> = {}
      for (const item of ((unreadData ?? []) as ConversationIdRow[])) {
        unreadMap[item.conversation_id] = (unreadMap[item.conversation_id] ?? 0) + 1
      }

      const participantsMap: Record<string, ParticipantRow['profils'][]> = {}
      for (const item of ((participantsData ?? []) as ParticipantRow[])) {
        participantsMap[item.conversation_id] = [...(participantsMap[item.conversation_id] ?? []), item.profils]
      }

      const seen = new Set<string>()
      const nextRows: LiveConversation[] = []
      for (const msg of ((messagesData ?? []) as MessageRow[])) {
        if (seen.has(msg.conversation_id)) continue
        seen.add(msg.conversation_id)
        const participants = participantsMap[msg.conversation_id] ?? []
        const first = participants[0]
        const title = first ? displayProfileName(first) : 'Interlocuteur'
        nextRows.push({
          id: msg.conversation_id,
          title,
          excerpt: parseTchatPayload(msg.content).text || 'Message',
          unread: unreadMap[msg.conversation_id] ?? 0,
        })
      }

      nextRows.sort((a, b) => b.unread - a.unread)
      setRows(nextRows.slice(0, 5))
      setLoading(false)
    }

    void load()
  }, [profil, isDemoSession])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-discreet">Personnes qui te joignent</p>
        <Link to="/tchat" className="text-xs font-semibold text-[color:var(--primary)] hover:underline">Ouvrir tchat</Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface-soft p-4 text-center text-sm text-discreet">
          Aucune conversation recente.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(row => (
            <div key={row.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition-colors hover:bg-surface-soft">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
                {avatarFromTitle(row.title)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-heading">{row.title}</p>
                  {row.unread > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{row.unread} non lu(s)</span>}
                </div>
                <p className="truncate text-xs text-discreet">{row.excerpt}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link to="/tchat" className="rounded-lg border border-line px-3 py-2 text-center text-xs font-medium text-foreground transition-colors hover:bg-surface-soft">Messagerie</Link>
        <Link to="/communication" className="rounded-lg bg-[color:var(--primary)] px-3 py-2 text-center text-xs font-medium text-white opacity-95 transition-opacity hover:opacity-100">Hub communication</Link>
      </div>
    </div>
  )
}
