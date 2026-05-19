type ScreenshotPlaceholderProps = {
  title: string
  caption: string
  format: string
  label: string
  status: string
  highlights: string[]
}

export default function ScreenshotPlaceholder({ title, caption, format, label, status, highlights }: ScreenshotPlaceholderProps) {
  return (
    <article className="site-showcase-scan relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.92))] p-6 text-white shadow-[0_22px_60px_rgba(15,23,42,0.2)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_28%)]" aria-hidden="true" />
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200">Capture produit guidée</p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight">{title}</h3>
          </div>
          <span className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
            {format}
          </span>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
          <span className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1 text-sky-100">{label}</span>
          <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-emerald-100">{status}</span>
        </div>
        <div className="mt-6 rounded-[1.35rem] border border-white/12 bg-white/6 p-5">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-[1.1rem] border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                  <span>Lecture écran</span>
                  <span>NEXORA Truck</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {highlights.map(item => (
                    <div key={item} className="rounded-[0.95rem] border border-white/8 bg-white/5 p-3">
                      <div className="h-1.5 w-10 rounded-full bg-sky-300/70" />
                      <p className="mt-3 text-xs leading-6 text-slate-200">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">Focus lecture</p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">{caption}</p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">Usage public</p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">Cette frame joue le rôle du screenshot réel à insérer ensuite quand les captures finales seront exportées.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(30,41,59,0.28))] p-4">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                <span>Indices visibles</span>
                <span>Temps réel</span>
              </div>
              <div className="mt-4 space-y-3">
                {highlights.map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-[0.95rem] border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-100">{item}</p>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-200">Vue {index + 1}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="site-reel-progress h-full rounded-full bg-[linear-gradient(90deg,#38bdf8,#2563eb)]" style={{ width: `${72 - index * 12}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
