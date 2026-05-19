import { homeWorkflow } from '@/site/components/home/homeContent'

export default function HomeWorkflow() {
  return (
    <section className="site-reveal rounded-[2rem] border border-[var(--site-border)] bg-[var(--site-surface-soft)] p-6 shadow-[var(--site-shadow-card)] sm:p-8">
      <div className="max-w-3xl">
        <p className="site-eyebrow">Workflow produit</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--site-text)] sm:text-[2.2rem]">
          Créer une mission.
          Planifier.
          Suivre.
          Analyser.
          Facturer.
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          Votre cycle opérationnel complet, lisible en 5 secondes.
        </p>
      </div>

      <ol className="mt-7 grid gap-4 md:grid-cols-5">
        {homeWorkflow.map((step, index) => (
          <li
            key={step.title}
            className="site-reveal relative rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-5"
            style={{ animationDelay: `${120 + index * 70}ms` }}
          >
            <div className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--site-primary)] text-xs font-semibold text-white">
              {index + 1}
            </div>
            <h3 className="text-sm font-semibold text-[var(--site-text)]">{step.title}</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
