import { memo } from 'react'

type KpiTone = 'info' | 'success' | 'warning' | 'critical'

export interface KpiCardProps {
  label: string
  value: string
  delta?: string
  note?: string
  tone?: KpiTone
}

const toneStyles: Record<KpiTone, { ring: string; chip: string }> = {
  info: { ring: 'border-blue-300', chip: 'bg-blue-700 text-white' },
  success: { ring: 'border-emerald-300', chip: 'bg-emerald-700 text-white' },
  warning: { ring: 'border-amber-300', chip: 'bg-amber-700 text-white' },
  critical: { ring: 'border-red-300', chip: 'bg-red-700 text-white' },
}

function KpiCardBase({ label, value, delta, note, tone = 'info' }: KpiCardProps) {
  const style = toneStyles[tone]

  return (
    <article
      className={`rounded-2xl border px-3 py-3 shadow-sm sm:px-4 sm:py-4 ${style.ring}`}
      style={{ background: 'var(--surface)', color: 'var(--text-primary)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-secondary)]">{label}</p>
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${style.chip}`}>{tone}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold leading-none sm:text-3xl">{value}</p>
      {delta ? <p className="mt-2 text-xs font-semibold text-[color:var(--text-heading)]">{delta}</p> : null}
      {note ? <p className="mt-1 text-xs text-[color:var(--text-secondary)]">{note}</p> : null}
    </article>
  )
}

export const KpiCard = memo(KpiCardBase)
