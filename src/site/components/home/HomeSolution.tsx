import { homeBenefits } from '@/site/components/home/homeContent'

export default function HomeSolution() {
  return (
    <section className="site-reveal grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
      <div className="rounded-[2rem] border border-[var(--site-border)] bg-[var(--site-surface)] p-6 shadow-[var(--site-shadow-card)] sm:p-8">
        <p className="site-eyebrow">La réponse NEXORA Truck</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--site-text)] sm:text-[2.2rem]">
          Centralisez vos opérations.
          Automatisez l’essentiel.
          Pilotez votre rentabilité.
        </h2>
        <p className="mt-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          NEXORA remplace vos outils dispersés.
          Vous décidez plus vite.
          Vous évitez les erreurs.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {homeBenefits.map((item, index) => (
          <article
            key={item.title}
            className="site-reveal rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-5 shadow-[var(--site-shadow-card)]"
            style={{ animationDelay: `${120 + index * 60}ms` }}
          >
            <h3 className="text-base font-semibold text-[var(--site-text)]">{item.title}</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
