import { memo } from 'react'

interface LatePaymentItem {
  id: string
  reference: string
  client: string
  amount: number
  dueDate: string
  daysLate: number
}

interface LatePaymentWidgetProps {
  items: LatePaymentItem[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value)
}

function LatePaymentWidgetBase({ items }: LatePaymentWidgetProps) {
  const sorted = [...items].sort((a, b) => b.daysLate - a.daysLate).slice(0, 6)

  return (
    <section
      className="nx-card rounded-[20px] border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[color:var(--text-heading)]">Retards de paiement</h3>
        <span className="rounded-full bg-red-700 px-2 py-1 text-[11px] font-semibold text-white">{items.length} critique(s)</span>
      </div>

      <div className="mt-3 space-y-2">
        {sorted.length === 0 ? (
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-xs text-[color:var(--text-secondary)]">
            Aucun retard de paiement en cours.
          </div>
        ) : (
          sorted.map(item => (
            <article
              key={item.id}
              className="rounded-xl border border-red-300 px-3 py-3"
              style={{ background: 'var(--surface-soft)', color: 'var(--text-primary)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-heading)]">{item.reference}</p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--text-heading)]">{item.client}</p>
                  <p className="mt-1 text-xs text-[color:var(--text-secondary)]">Echeance: {item.dueDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[color:var(--text-heading)]">{formatCurrency(item.amount)}</p>
                  <p className="text-xs font-semibold text-red-700">{item.daysLate} j de retard</p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export const LatePaymentWidget = memo(LatePaymentWidgetBase)
