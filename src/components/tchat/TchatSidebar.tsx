import type { ChatPresenceProfile } from '@/lib/chatPresence'
import type { CommunicationImportanceSettings } from '@/lib/communicationImportance'
import { ROLE_LABELS, type Profil, type Role } from '@/lib/auth'
import type { TchatConversation } from '@/lib/tchatTypes'
import { TchatPresenceBadge } from './TchatPresenceBadge'
import { TchatPresenceCard } from './TchatPresenceCard'

const ROLE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  admin: { bg: 'bg-slate-700/40', text: 'text-slate-300', dot: 'bg-slate-400' },
  dirigeant: { bg: 'bg-violet-900/40', text: 'text-violet-300', dot: 'bg-violet-400' },
  exploitant: { bg: 'bg-blue-900/40', text: 'text-blue-300', dot: 'bg-blue-400' },
  mecanicien: { bg: 'bg-orange-900/40', text: 'text-orange-300', dot: 'bg-orange-400' },
  commercial: { bg: 'bg-emerald-900/40', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  comptable: { bg: 'bg-slate-800/40', text: 'text-slate-300', dot: 'bg-slate-300' },
  rh: { bg: 'bg-rose-900/40', text: 'text-rose-300', dot: 'bg-rose-400' },
  conducteur: { bg: 'bg-amber-900/40', text: 'text-amber-300', dot: 'bg-amber-400' },
}

const roleColor = (role: string) => ROLE_COLORS[role] ?? { bg: 'bg-slate-700/40', text: 'text-slate-300', dot: 'bg-slate-400' }
const initiales = (profile: Profil) => (`${profile.prenom?.[0] ?? ''}${profile.nom?.[0] ?? ''}`.toUpperCase() || profile.role[0].toUpperCase())
const displayName = (profile: Profil) => (profile.prenom || profile.nom ? [profile.prenom, profile.nom].filter(Boolean).join(' ') : ROLE_LABELS[profile.role] ?? profile.role)

type Props = {
  className?: string
  demoMode: boolean
  ownPresence: ChatPresenceProfile | null
  onUpdateOwnPresence: (patch: Partial<ChatPresenceProfile>) => void
  searchTerm: string
  onSearchTermChange: (value: string) => void
  filteredConvs: TchatConversation[]
  loadingConvs: boolean
  selectedConvId: string | null
  setSelectedConvId: (value: string) => void
  showNewConv: boolean
  setShowNewConv: (updater: (current: boolean) => boolean) => void
  filterRole: string
  setFilterRole: (value: string) => void
  roleOptions: string[]
  composerRoleOptions: Role[]
  selectedRoleGroups: Role[]
  toggleRoleGroup: (group: Role) => void
  addSelectedGroups: () => void
  groupSelectionCount: number
  selectedRecipients: Profil[]
  toggleRecipient: (profileId: string) => void
  composerProfiles: Profil[]
  selectedRecipientIds: string[]
  openOrCreateConversation: (ids: string[]) => Promise<void>
  resetComposer: () => void
  composerError: string | null
  presenceById: Record<string, ChatPresenceProfile>
  conversationTitle: (conversation: TchatConversation) => string
  conversationSubtitle: (conversation: TchatConversation) => string
  formatTime: (iso: string) => string
  normalizedSearch: string
  importanceSettings: CommunicationImportanceSettings
}

export function TchatSidebar({
  className,
  demoMode,
  ownPresence,
  onUpdateOwnPresence,
  searchTerm,
  onSearchTermChange,
  filteredConvs,
  loadingConvs,
  selectedConvId,
  setSelectedConvId,
  showNewConv,
  setShowNewConv,
  filterRole,
  setFilterRole,
  roleOptions,
  composerRoleOptions,
  selectedRoleGroups,
  toggleRoleGroup,
  addSelectedGroups,
  groupSelectionCount,
  selectedRecipients,
  toggleRecipient,
  composerProfiles,
  selectedRecipientIds,
  openOrCreateConversation,
  resetComposer,
  composerError,
  presenceById,
  conversationTitle,
  conversationSubtitle,
  formatTime,
  normalizedSearch,
  importanceSettings,
}: Props) {
  return (
    <div className={`flex w-full shrink-0 flex-col border-b md:w-[23rem] md:border-b-0 md:border-r ${className ?? ''}`} style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between border-b px-4 py-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div>
          <h2 className="text-base font-semibold text-white">Messages</h2>
          {demoMode && <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-sky-200/70">Canal demo</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowNewConv(current => {
            const next = !current
            if (!next) resetComposer()
            return next
          })}
          className="flex h-8 w-8 items-center justify-center rounded-xl border text-muted transition-colors hover:border-white/20 hover:text-white"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}
          title="Nouvelle conversation"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {ownPresence && <TchatPresenceCard presence={ownPresence} onChange={onUpdateOwnPresence} />}

      <div className="border-b px-3 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface/5 px-3 py-2.5">
          <svg className="h-4 w-4 text-discreet" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={event => onSearchTermChange(event.target.value)}
            placeholder="Recherche intelligente dans toutes les discussions"
            className="w-full border-0 bg-transparent p-0 text-sm text-white outline-none placeholder:text-discreet"
          />
        </label>
        {normalizedSearch && (
          <p className="mt-2 text-[11px] text-discreet">{filteredConvs.length} discussion(s) correspondante(s)</p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 border-b px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button
          type="button"
          onClick={() => setFilterRole('tous')}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${filterRole === 'tous' ? 'bg-blue-600 text-white' : 'bg-surface/5 text-muted hover:bg-surface/10'}`}
        >
          Tous
        </button>
        {roleOptions.map(option => {
          const color = roleColor(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => setFilterRole(option === filterRole ? 'tous' : option)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${filterRole === option ? `${color.bg} ${color.text} ring-1 ring-white/20` : 'bg-surface/5 text-muted hover:bg-surface/10'}`}
            >
              {ROLE_LABELS[option as Role] ?? option}
            </button>
          )
        })}
      </div>

      {showNewConv && (
        <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="space-y-3 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-discreet">Nouvelle discussion</p>
                <p className="mt-1 text-xs text-muted">Choisis des utilisateurs ou ajoute plusieurs groupes metier.</p>
              </div>
              <button type="button" onClick={resetComposer} className="text-[11px] font-medium text-muted transition-colors hover:text-slate-200">Vider</button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {composerRoleOptions.map(group => {
                const color = roleColor(group)
                const active = selectedRoleGroups.includes(group)
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => toggleRoleGroup(group)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${active ? `${color.bg} ${color.text} ring-1 ring-white/20` : 'bg-surface/5 text-muted hover:bg-surface/10'}`}
                  >
                    {ROLE_LABELS[group]}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addSelectedGroups}
                disabled={selectedRoleGroups.length === 0 || groupSelectionCount === 0}
                className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-xs font-medium text-white transition-colors hover:border-white/20 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ajouter les groupes selectionnes
              </button>
              {groupSelectionCount > 0 && <span className="text-[11px] text-discreet">{groupSelectionCount} utilisateur(s)</span>}
            </div>

            {selectedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedRecipients.map(candidate => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => toggleRecipient(candidate.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-600/20 px-2.5 py-1 text-[11px] font-medium text-blue-100 transition-colors hover:bg-blue-600/30"
                  >
                    <span>{displayName(candidate)}</span>
                    <span className="opacity-70">x</span>
                  </button>
                ))}
              </div>
            )}

            {composerError && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{composerError}</div>}

            <div className="nx-scrollbar max-h-56 space-y-1 overflow-y-auto">
              {composerProfiles.length === 0 && <p className="px-1 text-xs text-discreet">Aucun utilisateur disponible</p>}
              {composerProfiles.map(candidate => {
                const color = roleColor(candidate.role)
                const selected = selectedRecipientIds.includes(candidate.id)
                const presence = presenceById[candidate.id]
                const important = importanceSettings.peopleIds.includes(candidate.id) || importanceSettings.peopleLabels.includes(displayName(candidate))
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => toggleRecipient(candidate.id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors ${selected ? 'bg-blue-600/12 ring-1 ring-blue-500/30' : 'hover:bg-surface/6'}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${color.bg} ${color.text}`}>{initiales(candidate)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-100">{displayName(candidate)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className={`text-xs ${color.text}`}>{ROLE_LABELS[candidate.role] ?? candidate.role}</p>
                        {presence && <TchatPresenceBadge presence={presence} compact />}
                        {important && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-100">Important</span>}
                      </div>
                    </div>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${selected ? 'border-blue-400 bg-blue-500 text-white' : 'border-white/10 text-discreet'}`}>
                      {selected ? '✓' : '+'}
                    </span>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              disabled={selectedRecipientIds.length === 0}
              onClick={() => void openOrCreateConversation(selectedRecipientIds)}
              className="w-full rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Demarrer la discussion ({selectedRecipientIds.length})
            </button>
          </div>
        </div>
      )}

      <div className="nx-scrollbar flex-1 overflow-y-auto">
        {loadingConvs ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : filteredConvs.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 text-4xl opacity-30">...</div>
            <p className="text-sm text-discreet">{normalizedSearch ? 'Aucun resultat' : 'Aucune conversation'}</p>
            <p className="mt-1 text-xs text-secondary">{normalizedSearch ? 'Essaie un nom, un role, un texte ou un lien partage.' : 'Clique sur + pour demarrer'}</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConvs.map(conversation => {
              const first = conversation.participants[0]
              const color = roleColor(first.role)
              const isActive = conversation.id === selectedConvId
              const presence = presenceById[first.id]
              const important = conversation.participants.some(participant => importanceSettings.peopleIds.includes(participant.id) || importanceSettings.peopleLabels.includes(displayName(participant)))
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedConvId(conversation.id)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-all ${isActive ? 'bg-blue-600/20 ring-1 ring-blue-500/40' : 'hover:bg-surface/5'}`}
                >
                  <div className="relative shrink-0">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${color.bg} ${color.text}`}>{initiales(first)}</span>
                    {conversation.participants.length > 1 ? (
                      <span className="absolute -bottom-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full border border-slate-900 bg-sky-500 px-1 text-[9px] font-bold text-white">{conversation.participants.length}</span>
                    ) : (
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${color.dot}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-100">{conversationTitle(conversation)}</p>
                      <div className="flex items-center gap-2">
                        {important && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-100">Important</span>}
                        <span className="shrink-0 text-[10px] text-discreet">{formatTime(conversation.updated_at)}</span>
                      </div>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-discreet">{conversationSubtitle(conversation)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {presence && <TchatPresenceBadge presence={presence} compact />}
                      <p className="min-w-0 flex-1 truncate text-xs text-discreet">{conversation.last_message ?? 'Nouvelle conversation'}</p>
                      {conversation.unread > 0 && (
                        <span className="ml-auto flex h-4 min-w-[1rem] shrink-0 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">{conversation.unread}</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
