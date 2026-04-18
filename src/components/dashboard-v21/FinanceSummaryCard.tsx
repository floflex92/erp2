import { memo } from 'react'

interface FinanceSummaryCardProps {
  factured: number
  cashed: number
  toInvoice: number
  fixedCosts: number
  variableCosts: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value)
}

function FinanceSummaryCardBase({ factured, cashed, toInvoice, fixedCosts, variableCosts }: FinanceSummaryCardProps) {
  const cashCoverage = factured > 0 ? (cashed / factured) * 100 : 0

  return (
    <section
      className="nx-card rounded-[20px] border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <h3 className="text-sm font-semibold text-[color:var(--text-heading)]">Synthese finance</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3 sm:gap-3">
        <div className="rounded-xl border border-blue-300 px-3 py-3" style={{ background: 'var(--surface-soft)', color: 'var(--text-primary)' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">Facture</p>
          <p className="mt-1 text-lg font-semibold">{formatCurrency(factured)}</p>
        </div>
        <div className="rounded-xl border border-emerald-300 px-3 py-3" style={{ background: 'var(--surface-soft)', color: 'var(--text-primary)' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">Encaisse</p>
          <p className="mt-1 text-lg font-semibold">{formatCurrency(cashed)}</p>
        </div>
        <div className="rounded-xl border border-amber-300 px-3 py-3" style={{ background: 'var(--surface-soft)', color: 'var(--text-primary)' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">A facturer</p>
          <p className="mt-1 text-lg font-semibold">{formatCurrency(toInvoice)}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-[color:var(--text-primary)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">Charges fixes</p>
          <p className="mt-1 text-base font-semibold">{formatCurrency(fixedCosts)}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-[color:var(--text-primary)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">Charges variables</p>
          <p className="mt-1 text-base font-semibold">{formatCurrency(variableCosts)}</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ background: 'color-mix(in srgb, var(--border) 60%, var(--surface) 40%)' }}>
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, cashCoverage))}%` }} />
      </div>
      <p className="mt-2 text-xs font-semibold text-[color:var(--text-secondary)]">Taux d encaissement: {cashCoverage.toFixed(1)}%</p>
    </section>
  )
}

export const FinanceSummaryCard = memo(FinanceSummaryCardBase)
