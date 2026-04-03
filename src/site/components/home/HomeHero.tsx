import { Link } from 'react-router-dom'

type HomeHeroProps = {
  onOpenScreenshot: () => void
}

export default function HomeHero({ onOpenScreenshot }: HomeHeroProps) {
  return (
    <section className="site-reveal rounded-[2.2rem] border border-[var(--site-border)] bg-[var(--site-surface)] p-6 shadow-[var(--site-shadow-panel)] sm:p-10">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="inline-flex rounded-full border border-[var(--site-border)] bg-white px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--site-primary)] dark:bg-slate-900/60">
            Le cerveau opérationnel du transport
          </p>
          <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight text-[var(--site-text)] sm:text-5xl">
            Arrêtez de subir votre exploitation transport.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--site-text-secondary)] sm:text-lg">
            <span className="block">Gagnez du temps sur le planning.</span>
            <span className="block">Réduisez vos coûts.</span>
            <span className="block">Pilotez votre activité en temps réel.</span>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/connexion-erp"
              className="site-btn-secondary rounded-full px-6 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
            >
              Tester gratuitement
            </Link>
            <Link
              to="/demonstration"
              className="site-btn-primary rounded-full px-6 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
            >
              Demander une démo
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenScreenshot}
          className="group relative overflow-hidden rounded-[1.6rem] border border-[var(--site-border)] bg-[#0f172a] p-2 text-left shadow-[0_28px_80px_rgba(15,23,42,0.28)] transition-transform duration-300 hover:-translate-y-1"
          aria-label="Ouvrir la capture produit en grand"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(59,130,246,0.24),transparent_42%)]" />
          <div className="relative overflow-hidden rounded-[1.1rem] border border-white/15">
            <img
              src="/site/screenshots/planning-dark.png"
              alt="Vue planning de NEXORA Truck"
              className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              loading="eager"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#020617] via-[#020617]/70 to-transparent px-4 py-3 text-xs font-medium text-slate-100">
              Capture réelle du logiciel.
              Planning intelligent et pilotage en temps réel.
            </div>
          </div>
        </button>
      </div>
    </section>
  )
}
