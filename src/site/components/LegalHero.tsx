type LegalHeroProps = {
  eyebrow: string
  title: string
  description: string
  lastUpdate: string
  highlights: readonly string[]
}

export default function LegalHero({ eyebrow, title, description, lastUpdate, highlights }: LegalHeroProps) {
  return (
    <section className="rounded-[2rem] border border-[#dbeafe] bg-[linear-gradient(140deg,#ffffff_0%,#eff6ff_50%,#e0f2fe_100%)] p-7 shadow-[0_24px_80px_rgba(30,64,175,0.14)] sm:p-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#1d4ed8]">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-[3.05rem] sm:leading-[1.06]">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700">{description}</p>
        </div>
        <div className="rounded-[1.4rem] border border-[#bfdbfe] bg-white/80 px-5 py-4 text-sm text-slate-700 shadow-sm backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#627078]">Mise a jour</p>
          <p className="mt-2 font-medium text-slate-900">{lastUpdate}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {highlights.map(item => (
          <span key={item} className="rounded-full border border-sky-100 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm">
            {item}
          </span>
        ))}
      </div>
    </section>
  )
}