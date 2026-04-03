import type { ReactNode } from 'react'

type SiteSectionProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  muted?: boolean
}

export default function SiteSection({
  eyebrow,
  title,
  description,
  actions,
  children,
  muted = false,
}: SiteSectionProps) {
  return (
    <section className={`rounded-[2.2rem] border px-6 py-8 shadow-[0_26px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10 ${muted ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(241,245,249,0.78))]' : 'bg-white'}`} style={{ borderColor: 'rgba(148, 163, 184, 0.18)' }}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-700">{eyebrow}</p>
          ) : null}
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">{title}</h2>
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