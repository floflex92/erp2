type ProcessStepCardProps = {
  step: string
  title: string
  body: string
  timing: string
}

export default function ProcessStepCard({ step, title, body, timing }: ProcessStepCardProps) {
  return (
    <article className="relative overflow-hidden rounded-[1.8rem] border border-slate-200/85 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0f172a,#0ea5e9,#22c55e)]" aria-hidden="true" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-sky-700">Simple et clair {step}</p>
      <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--site-text-secondary)]">{body}</p>
      <div className="mt-6 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--site-text-secondary)]">
        {timing}
      </div>
    </article>
  )
}