import { Link } from 'react-router-dom'

export default function HomeFinalCta() {
  return (
    <section className="site-reveal overflow-hidden rounded-[2rem] border border-[color:color-mix(in_srgb,var(--site-primary)_28%,var(--site-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--site-primary)_10%,white),var(--site-surface)_52%,color-mix(in_srgb,var(--site-primary)_6%,var(--site-surface)))] p-6 shadow-[var(--site-shadow-panel)] sm:p-10 dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.24),rgba(15,23,42,0.95))]">
      <div className="max-w-3xl">
        <p className="site-eyebrow">Passez à l’action</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--site-text)] sm:text-[2.3rem]">
          Reprenez le contrôle de votre exploitation.
          Dès aujourd’hui.
        </h2>
        <p className="mt-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          Testez gratuitement.
          Ou réservez une démo ciblée sur vos opérations.
        </p>
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          to="/connexion-erp"
          className="site-btn-primary rounded-full px-6 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
        >
          Tester gratuitement
        </Link>
        <Link
          to="/demonstration"
          className="site-btn-secondary rounded-full px-6 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
        >
          Réserver une démo
        </Link>
      </div>
    </section>
  )
}
