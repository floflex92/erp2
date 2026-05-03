import { CHAT_PRESENCE_CONFIG, type ChatPresenceProfile } from '@/lib/chatPresence'

type Props = {
  presence: ChatPresenceProfile
  compact?: boolean
  showCustomStatus?: boolean
}

export function TchatPresenceBadge({ presence, compact = false, showCustomStatus = false }: Props) {
  const config = CHAT_PRESENCE_CONFIG[presence.state]

  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ${config.softClass} ${config.textClass}`}>
        <span className={`h-2 w-2 rounded-full ${config.dotClass}`} />
        {config.label}
      </span>
      {showCustomStatus && presence.customStatus && (
        <p className="text-[11px] text-muted">{presence.customStatus}</p>
      )}
      {showCustomStatus && presence.vacationEnabled && (
        <p className="text-[11px] text-sky-300/80">Reponse auto vacances active</p>
      )}
    </div>
  )
}
