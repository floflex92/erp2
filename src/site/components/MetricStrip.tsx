type Metric = {
  value: string
  label: string
  detail: string
}

export default function MetricStrip({ items }: { items: Metric[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map(item => (
        <article key={item.label} className="rounded-[1.75rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] px-6 py-5 text-white shadow-[0_28px_70px_rgba(15,23,42,0.24)]">
          <p className="text-3xl font-semibold tracking-tight text-sky-300">{item.value}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">{item.label}</p>
          <p className="mt-3 text-sm leading-6 text-slate-200">{item.detail}</p>
        </article>
      ))}
    </div>
  )
}