import { memo } from 'react'

export type AlertLevel = 'info' | 'warning' | 'critical'

export interface AlertItem {
  id: string
  title: string
  detail: string
  level: AlertLevel
}

interface AlertBoxProps {
  items: AlertItem[]
  title?: string
}

const levelStyles: Record<AlertLevel, { shell: string; chip: string }> = {
  info: { shell: 'border-blue-300', chip: 'bg-blue-700 text-white' },
  warning: { shell: 'border-amber-300', chip: 'bg-amber-700 text-white' },
  critical: { shell: 'border-red-300', chip: 'bg-red-700 text-white' },
}

function AlertBoxBase({ items, title = 'Alertes' }: AlertBoxProps) {
  return (
    <section
      className="nx-card rounded-[20px] border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <h3 className="text-sm font-semibold text-[color:var(--text-heading)]">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-xs text-[color:var(--text-secondary)]">
            Aucun signal critique sur cette periode.
          </div>
        ) : (
          items.map(item => {
            const style = levelStyles[item.level]
            return (
            <article
              key={item.id}
              className={`rounded-xl border px-3 py-3 ${style.shell}`}
              style={{ background: 'var(--surface)', color: 'var(--text-primary)' }}
            >
              <p className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${style.chip}`}>{item.level}</p>
              <p className="mt-2 text-sm font-semibold text-[color:var(--text-heading)]">{item.title}</p>
              <p className="mt-1 text-xs text-[color:var(--text-secondary)]">{item.detail}</p>
            </article>
            )
          })
        )}
      </div>
    </section>
  )
}

export const AlertBox = memo(AlertBoxBase)
