import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { countUnreadDemoMessages, getDemoConversationLastMessage, getDemoConversationRecords } from '@/lib/demoChat'
import { DEMO_PROFILES } from '@/lib/demoUsers'
import { countUnreadDemoMails, ensureDemoMailbox, listDemoMailRecords } from '@/lib/demoMail'
import { addImportantKeyword, countImportantKeywordMatches, matchesImportantPerson, readCommunicationImportance, removeImportantKeyword, subscribeCommunicationImportance, toggleImportantPerson, type CommunicationImportanceSettings } from '@/lib/communicationImportance'
import { parseTchatPayload } from '@/lib/tchatMessage'
import { ROLE_LABELS, canChatWith, type Profil, type Role, useAuth } from '@/lib/auth'
import { looseSupabase } from '@/lib/supabaseLoose'

function displayName(profile: Profil) {
  return profile.prenom || profile.nom ? [profile.prenom, profile.nom].filter(Boolean).join(' ') : ROLE_LABELS[profile.role] ?? profile.role
}

export default function Communication() {
  const { profil, role, isDemoSession } = useAuth()
  const [allProfils, setAllProfils] = useState<Profil[]>([])
  const [settings, setSettings] = useState<CommunicationImportanceSettings>(readCommunicationImportance())
  const [keywordDraft, setKeywordDraft] = useState('')
  const [chatUnread, setChatUnread] = useState(0)
  const [mailUnread, setMailUnread] = useState(0)
  const [recentChatItems, setRecentChatItems] = useState<Array<{ id: string; title: string; excerpt: string; unread: number; important: boolean }>>([])
  const [recentMailItems, setRecentMailItems] = useState<Array<{ id: string; title: string; excerpt: string; unread: boolean; important: boolean }>>([])
  const demoMode = Boolean(profil?.isDemo && isDemoSession)

  useEffect(() => {
    if (!profil || !role) return
    if (demoMode) {
      setAllProfils(DEMO_PROFILES.filter(candidate => candidate.id !== profil.id && canChatWith(role as Role, candidate.role)))
      return
    }
    void looseSupabase.from('profils').select('id, nom, prenom, role').neq('id' as any, profil.id as any).then(({ data }: any) => {
      setAllProfils((data ?? []).filter((candidate: Profil) => canChatWith(role as Role, candidate.role)))
    })
  }, [profil, role, demoMode])

  useEffect(() => {
    function refreshSettings() {
      setSettings(readCommunicationImportance())
    }
    refreshSettings()
    return subscribeCommunicationImportance(refreshSettings)
  }, [])

  useEffect(() => {
    if (!profil) return
    ensureDemoMailbox(profil)
    const mailBox = listDemoMailRecords(profil.id)
    const mailItems = mailBox.slice(0, 6).map(mail => {
      const payload = parseTchatPayload(mail.body)
      const important = matchesImportantPerson(
        [],
        [mail.from_name, mail.from_email],
        settings,
      ) || countImportantKeywordMatches(`${mail.subject} ${payload.text}`, settings.keywords) > 0
      return {
        id: mail.id,
        title: mail.subject,
        excerpt: payload.text || mail.from_email,
        unread: !mail.read && mail.folder === 'inbox',
        important,
      }
    }).sort((left, right) => Number(right.important) - Number(left.important))
    setRecentMailItems(mailItems)
    setMailUnread(countUnreadDemoMails(profil.id))

    if (demoMode) {
      const convItems = getDemoConversationRecords(profil.id).map(record => {
        const participants = DEMO_PROFILES.filter(candidate => record.participant_ids.includes(candidate.id) && candidate.id !== profil.id)
        const title = participants.length > 1 ? `${displayName(participants[0])} +${participants.length - 1}` : displayName(participants[0])
        const excerpt = getDemoConversationLastMessage(record.id) ?? 'Nouvelle discussion'
        const important = matchesImportantPerson(
          participants.map(participant => participant.id),
          participants.map(displayName),
          settings,
        ) || countImportantKeywordMatches(`${title} ${excerpt}`, settings.keywords) > 0
        return {
          id: record.id,
          title,
          excerpt,
          unread: countUnreadDemoMessages(record.id, profil.id),
          important,
        }
      }).sort((left, right) => Number(right.important) - Number(left.important))
      setRecentChatItems(convItems.slice(0, 6))
      setChatUnread(convItems.reduce((sum, item) => sum + item.unread, 0))
      return
    }

    void looseSupabase.from('tchat_participants').select('conversation_id').eq('profil_id' as any, profil.id as any).then(async ({ data: myParts }: any) => {
      const convIds = ((myParts ?? []) as any[]).map(item => item.conversation_id)
      if (convIds.length === 0) {
        setRecentChatItems([])
        setChatUnread(0)
        return
      }
      const [{ data: parts }, { data: unreadData }, { data: lastMsgs }] = await Promise.all([
        looseSupabase.from('tchat_participants').select('conversation_id, profils(id, nom, prenom, role)').in('conversation_id' as any, convIds as any).neq('profil_id' as any, profil.id as any),
        looseSupabase.from('tchat_messages').select('conversation_id').in('conversation_id' as any, convIds as any).neq('sender_id' as any, profil.id as any).is('read_at' as any, null as any),
        looseSupabase.from('tchat_messages').select('conversation_id, content, created_at').in('conversation_id' as any, convIds as any).order('created_at', { ascending: false }),
      ])
      const unreadMap: Record<string, number> = {}
      for (const item of ((unreadData ?? []) as any[])) unreadMap[item.conversation_id] = (unreadMap[item.conversation_id] ?? 0) + 1
      const participantsMap: Record<string, Profil[]> = {}
      for (const item of ((parts ?? []) as any[])) participantsMap[item.conversation_id] = [...(participantsMap[item.conversation_id] ?? []), item.profils]
      const seen = new Set<string>()
      const items = []
      for (const item of ((lastMsgs ?? []) as any[])) {
        if (seen.has(item.conversation_id)) continue
        seen.add(item.conversation_id)
        const participants = participantsMap[item.conversation_id] ?? []
        if (participants.length === 0) continue
        const title = participants.length > 1 ? `${displayName(participants[0])} +${participants.length - 1}` : displayName(participants[0])
        const excerpt = parseTchatPayload(item.content).text || 'Message'
        const important = matchesImportantPerson(participants.map(participant => participant.id), participants.map(displayName), settings) || countImportantKeywordMatches(`${title} ${excerpt}`, settings.keywords) > 0
        items.push({ id: item.conversation_id, title, excerpt, unread: unreadMap[item.conversation_id] ?? 0, important })
      }
      items.sort((left, right) => Number(right.important) - Number(left.important))
      setRecentChatItems(items.slice(0, 6))
      setChatUnread(items.reduce((sum, item) => sum + item.unread, 0))
    })
  }, [profil, settings, demoMode])

  const importantPeople = useMemo(() => {
    return allProfils.filter(candidate => settings.peopleIds.includes(candidate.id) || settings.peopleLabels.includes(displayName(candidate)))
  }, [allProfils, settings])

  if (!profil) return null

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard label="Messages internes" value={String(chatUnread)} detail="Non lus" tone="blue" />
        <StatCard label="Mails" value={String(mailUnread)} detail="Non lus" tone="amber" />
        <StatCard label="Personnes importantes" value={String(settings.peopleIds.length)} detail="Surveillees" tone="emerald" />
        <StatCard label="Mots suivis" value={String(settings.keywords.length)} detail="Prioritaires" tone="violet" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.7)' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Hub communication</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Ce qui doit remonter tout de suite</h2>
            </div>
            <div className="flex gap-2">
              <Link to="/tchat" className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/5">Ouvrir Messagerie</Link>
              <Link to="/mail" className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500">Ouvrir Mail</Link>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <PriorityList title="Conversations prioritaires" items={recentChatItems} hrefPrefix="/tchat" />
            <PriorityList title="Mails prioritaires" items={recentMailItems} hrefPrefix="/mail" />
          </div>
        </section>

        <section className="rounded-3xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.7)' }}>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Importance</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Qui et quoi doit rester visible</h2>

          <div className="mt-5 space-y-5">
            <div>
              <p className="text-sm font-medium text-slate-200">Mots-clés à surveiller</p>
              <div className="mt-3 flex gap-2">
                <input
                  value={keywordDraft}
                  onChange={event => setKeywordDraft(event.target.value)}
                  placeholder="Ex: urgent, facture, retard, quai"
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    addImportantKeyword(keywordDraft)
                    setKeywordDraft('')
                  }}
                  className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500"
                >
                  Ajouter
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {settings.keywords.length === 0 && <p className="text-sm text-slate-500">Aucun mot-clé important pour le moment.</p>}
                {settings.keywords.map(keyword => (
                  <button key={keyword} type="button" onClick={() => removeImportantKeyword(keyword)} className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100">
                    <span>{keyword}</span>
                    <span className="opacity-70">x</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-200">Personnes à faire remonter</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {allProfils.map(candidate => {
                  const active = settings.peopleIds.includes(candidate.id) || settings.peopleLabels.includes(displayName(candidate))
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => toggleImportantPerson(candidate.id, displayName(candidate))}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${active ? 'bg-blue-600 text-white' : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                    >
                      {displayName(candidate)}
                    </button>
                  )
                })}
              </div>

              {importantPeople.length > 0 && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Actuellement suivis</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {importantPeople.map(candidate => (
                      <span key={candidate.id} className="rounded-full bg-blue-600/20 px-3 py-1 text-xs font-semibold text-blue-100">
                        {displayName(candidate)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function StatCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: 'blue' | 'amber' | 'emerald' | 'violet' }) {
  const toneClass = tone === 'blue'
    ? 'from-blue-500/20 to-blue-500/5 text-blue-100'
    : tone === 'amber'
      ? 'from-amber-500/20 to-amber-500/5 text-amber-100'
      : tone === 'emerald'
        ? 'from-emerald-500/20 to-emerald-500/5 text-emerald-100'
        : 'from-violet-500/20 to-violet-500/5 text-violet-100'
  return (
    <div className={`rounded-3xl border bg-gradient-to-br px-5 py-5 ${toneClass}`} style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-slate-300">{detail}</p>
    </div>
  )
}

function PriorityList({ title, items, hrefPrefix }: { title: string; items: Array<{ id: string; title: string; excerpt: string; unread: number | boolean; important: boolean }>; hrefPrefix: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-medium text-slate-100">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length === 0 && <p className="text-sm text-slate-500">Aucun element a surveiller.</p>}
        {items.map(item => (
          <Link key={item.id} to={hrefPrefix} className={`block rounded-2xl border px-3 py-3 transition-colors ${item.important ? 'border-amber-400/30 bg-amber-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-white">{item.title}</p>
              {item.important && <span className="rounded-full bg-amber-400/20 px-2 py-1 text-[10px] font-semibold text-amber-100">Important</span>}
            </div>
            <p className="mt-1 truncate text-xs text-slate-400">{item.excerpt}</p>
            {Boolean(item.unread) && <p className="mt-2 text-[11px] text-sky-300">{typeof item.unread === 'number' ? `${item.unread} non lu(s)` : 'Non lu'}</p>}
          </Link>
        ))}
      </div>
    </div>
  )
}
