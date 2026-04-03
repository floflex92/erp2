export default function HomeDifferentiation() {
  return (
    <section className="site-reveal rounded-[2rem] border border-[var(--site-border)] bg-[var(--site-surface)] p-6 shadow-[var(--site-shadow-card)] sm:p-8">
      <div className="max-w-3xl">
        <p className="site-eyebrow">Différenciation</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--site-text)] sm:text-[2.2rem]">
          Pourquoi NEXORA est différent
        </h2>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface-soft)] p-5">
          <h3 className="text-base font-semibold text-[var(--site-text)]">Pensé par un exploitant</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
            Chaque écran répond à une contrainte terrain réelle.
          </p>
        </article>

        <article className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface-soft)] p-5">
          <h3 className="text-base font-semibold text-[var(--site-text)]">Pas un logiciel générique</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
            NEXORA est conçu pour le transport routier.
            Planning, flotte, conducteurs, facturation.
          </p>
        </article>

        <article className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface-soft)] p-5">
          <h3 className="text-base font-semibold text-[var(--site-text)]">Orienté résultats</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
            Moins de friction opérationnelle.
            Plus de marge.
            Plus de contrôle.
          </p>
        </article>
      </div>
    </section>
  )
}
