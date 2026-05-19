import { homeProofStats } from '@/site/components/home/homeContent'

export default function HomeProof() {
  return (
    <section className="site-reveal grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
      <div className="rounded-[2rem] border border-[var(--site-border)] bg-[var(--site-surface)] p-6 shadow-[var(--site-shadow-card)] sm:p-8">
        <p className="site-eyebrow">Crédibilité</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--site-text)] sm:text-[2.2rem]">
          Pensé sur le terrain.
          Conçu pour vos résultats.
        </h2>
        <p className="mt-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          NEXORA Truck a été conçu par un exploitant.
          Le produit suit la réalité du transport.
          Pas un logiciel générique.
        </p>
        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--site-border)] bg-[#0f172a] p-2">
          <img
            src="/site/screenshots/map-live-vehicles.webp"
            alt="Vue map live et suivi exploitation NEXORA Truck"
            className="aspect-[16/10] w-full rounded-xl object-cover"
            loading="lazy"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {homeProofStats.map((stat, index) => (
          <article
            key={stat.value + stat.label}
            className="site-reveal rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-5 shadow-[var(--site-shadow-card)]"
            style={{ animationDelay: `${160 + index * 80}ms` }}
          >
            <p className="text-3xl font-semibold tracking-tight text-[var(--site-text)]">{stat.value}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--site-primary)]">{stat.label}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--site-text-secondary)]">{stat.note}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
