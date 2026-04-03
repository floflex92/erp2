type FeatureCardProps = {
  tag: string
  title: string
  body: string
}

export default function FeatureCard({ tag, title, body }: FeatureCardProps) {
  return (
    <article className="group rounded-[1.7rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)] transition-transform duration-200 hover:-translate-y-0.5 hover:border-sky-200">
      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-700">{tag}</p>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--site-text-secondary)]">{body}</p>
    </article>
  )
}