import type { HomeFeature } from '@/site/components/home/homeContent'

function PlanningIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M8 2v4M16 2v4M3 9h18M7.5 13.5h3M13.5 13.5h3M7.5 17h3" />
    </svg>
  )
}

function FleetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7h11l3 5h4v4h-2" />
      <path d="M3 7v9h2M8 16h6" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  )
}

function DriversIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20c0-3.3 2.7-6 7-6s7 2.7 7 6" />
      <path d="M4 10h2M18 10h2" />
    </svg>
  )
}

function FinanceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16v10H4z" />
      <path d="M8 12h8M12 9v6" />
      <path d="M4 10c1.5 0 2.5-1 2.5-3M20 10c-1.5 0-2.5-1-2.5-3" />
    </svg>
  )
}

function ApiIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M10 20h4" />
      <rect x="8" y="3" width="8" height="4" rx="1.5" />
      <rect x="8" y="17" width="8" height="4" rx="1.5" />
    </svg>
  )
}

const features: HomeFeature[] = [
  {
    title: 'Planning intelligent',
    description: 'Affectez plus vite, réduisez les trous planning et absorbez les urgences sans chaos.',
    icon: <PlanningIcon />,
  },
  {
    title: 'Suivi flotte',
    description: 'Visualisez disponibilité et maintenance pour éviter l’immobilisation non planifiée.',
    icon: <FleetIcon />,
  },
  {
    title: 'Gestion conducteurs',
    description: 'Gardez les documents à jour, suivez les équipes et limitez les risques opérationnels.',
    icon: <DriversIcon />,
  },
  {
    title: 'Finance et rentabilité',
    description: 'Reliez exécution, coûts et facturation pour protéger votre marge mission par mission.',
    icon: <FinanceIcon />,
  },
  {
    title: 'API et automatisation',
    description: 'Connectez Webfleet, tachy et fret pour automatiser les actions répétitives à faible valeur.',
    icon: <ApiIcon />,
  },
]

export default function HomeFeatures() {
  return (
    <section className="site-reveal rounded-[2rem] border border-[var(--site-border)] bg-[var(--site-surface)] p-6 shadow-[var(--site-shadow-panel)] sm:p-8">
      <div className="max-w-3xl">
        <p className="site-eyebrow">Fonctionnalités clés</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--site-text)] sm:text-[2.2rem]">
          Chaque fonctionnalité vous fait gagner du temps ou de la marge
        </h2>
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {features.map((feature, index) => (
          <article
            key={feature.title}
            className="site-reveal group rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface-soft)] p-5 transition duration-200 hover:-translate-y-1 hover:border-[var(--site-primary)]"
            style={{ animationDelay: `${120 + index * 50}ms` }}
          >
            <div className="inline-flex rounded-xl border border-[var(--site-border)] bg-[var(--site-surface)] p-2.5 text-[var(--site-primary)]">
              {feature.icon}
            </div>
            <h3 className="mt-4 text-base font-semibold text-[var(--site-text)]">{feature.title}</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
