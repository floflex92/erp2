import { type ChatPresenceProfile, type ChatPresenceState } from '@/lib/chatPresence'

type Props = {
  presence: ChatPresenceProfile
  onChange: (patch: Partial<ChatPresenceProfile>) => void
}

const STATUS_OPTIONS: Array<{ value: ChatPresenceState; label: string; className: string }> = [
  { value: 'online', label: 'Connecte', className: 'bg-emerald-500/12 text-emerald-200' },
  { value: 'away', label: 'Absent', className: 'bg-amber-500/12 text-amber-200' },
  { value: 'offline', label: 'Hors ligne', className: 'bg-slate-500/14 text-slate-300' },
  { value: 'dnd', label: 'Ne pas deranger', className: 'bg-rose-500/12 text-rose-200' },
]

export function TchatPresenceCard({ presence, onChange }: Props) {
  return (
    <div className="space-y-3 border-b px-3 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Presence</p>
        <p className="mt-1 text-xs text-slate-400">Statut visible dans les discussions et pour les groupes.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map(option => {
          const active = presence.state === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ state: option.value })}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${active ? option.className : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-slate-400">Statut ecrit</span>
        <input
          type="text"
          value={presence.customStatus}
          onChange={event => onChange({ customStatus: event.target.value.slice(0, 90) })}
          placeholder="Ex: En tournee jusqu'a 17h"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
        />
      </label>

      <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-slate-100">Mode vacances</p>
          <p className="text-[11px] text-slate-500">Envoie une reponse automatique dans les tests.</p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ vacationEnabled: !presence.vacationEnabled })}
          className={`relative h-7 w-12 rounded-full transition-colors ${presence.vacationEnabled ? 'bg-blue-500' : 'bg-slate-700'}`}
        >
          <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-all ${presence.vacationEnabled ? 'opacity-100 scale-100' : 'opacity-85 scale-90'}`} />
        </button>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-slate-400">Reponse automatique</span>
        <textarea
          value={presence.autoReplyMessage}
          onChange={event => onChange({ autoReplyMessage: event.target.value.slice(0, 240) })}
          rows={3}
          placeholder="Je suis en vacances, retour prevu mardi prochain."
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
        />
      </label>
    </div>
  )
}
