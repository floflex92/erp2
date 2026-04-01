import type { PromoReel } from '@/site/content'

type PromoReelCardProps = PromoReel

export default function PromoReelCard({ title, audience, duration, summary, outcome, chapters }: PromoReelCardProps) {
  return (
    <article className="rounded-[1.7rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-rose-700">Reel promotionnel</p>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
        </div>
        <div className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
          {duration}
        </div>
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(145deg,#fff1f2,#ffffff)] p-4">
        <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          <span>Storyboard</span>
          <span>{audience}</span>
        </div>
        <div className="site-reel-track mt-4 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
          <div className="site-reel-progress h-full w-full rounded-full bg-[linear-gradient(90deg,#fb7185,#f97316,#38bdf8)]" />
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-600">{summary}</p>
        <div className="mt-4 grid gap-3">
          {chapters.map((chapter, index) => (
            <div key={chapter} className="flex items-center gap-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">0{index + 1}</span>
              <p className="text-sm leading-6 text-slate-700">{chapter}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-600">{outcome}</p>
    </article>
  )
}