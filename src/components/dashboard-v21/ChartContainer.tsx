import { memo, type ReactNode } from 'react'

interface ChartContainerProps {
  title: string
  subtitle?: string
  rightSlot?: ReactNode
  children: ReactNode
}

function ChartContainerBase({ title, subtitle, rightSlot, children }: ChartContainerProps) {
  return (
    <section
      className="nx-card rounded-[20px] border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--text-heading)]">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-[color:var(--text-secondary)]">{subtitle}</p> : null}
        </div>
        {rightSlot}
      </header>
      <div>{children}</div>
    </section>
  )
}

export const ChartContainer = memo(ChartContainerBase)
