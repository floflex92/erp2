import type { ReactNode } from 'react'

type SiteSectionProps = {
  eyebrow?: string
  title: string
  headingLevel?: 1 | 2
  description?: string
  actions?: ReactNode
  children: ReactNode
  muted?: boolean
}

export default function SiteSection({
  eyebrow,
  title,
  headingLevel = 2,
  description,
  actions,
  children,
  muted = false,
}: SiteSectionProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'

  return (
    <section className={`rounded-[2.2rem] border px-6 py-8 shadow-[0_26px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10 ${muted ? 'bg-slate-50' : 'bg-white'}`} style={{ borderColor: '#e2e8f0' }}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-700">{eyebrow}</p>
          ) : null}
          <Heading className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">{title}</Heading>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  )
}
