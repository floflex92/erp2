/**
 * SiteFallback — skeleton léger affiché pendant le Suspense des routes publiques.
 *
 * Objectif : donner un FCP immédiat avec la structure de la nav + un placeholder
 * de contenu hero, au lieu d'afficher le skeleton ERP (RouteFallback) qui est
 * visuellement incohérent et heurte le score FCP Lighthouse.
 *
 * Le composant est intentionnellement petit (<2 KB) et ne doit pas importer
 * d'autres composants lazy pour éviter d'ajouter un round-trip supplémentaire.
 */
export default function SiteFallback() {
  return (
    <div
      className="site-shell flex min-h-screen flex-col"
      style={{ background: 'var(--bg-site, #FFFFFF)' }}
      aria-hidden="true"
    >
      {/* Nav skeleton */}
      <header
        className="fixed left-0 right-0 top-0 z-40 flex h-20 items-center justify-between"
        style={{ paddingInline: 'clamp(24px, 8vw, 160px)', background: 'transparent' }}
      >
        {/* Logo placeholder */}
        <div
          className="nx-skeleton h-10 w-36 rounded-lg"
          style={{ '--skeleton-base': 'rgba(0,0,0,0.07)', '--skeleton-shine': 'rgba(0,0,0,0.12)' } as React.CSSProperties}
        />
        {/* Nav links placeholder */}
        <div className="hidden items-center gap-8 lg:flex">
          {[80, 96, 72, 64].map((w, i) => (
            <div
              key={i}
              className="nx-skeleton h-4 rounded"
              style={{ width: w, '--skeleton-base': 'rgba(0,0,0,0.06)', '--skeleton-shine': 'rgba(0,0,0,0.10)' } as React.CSSProperties}
            />
          ))}
        </div>
        {/* CTA placeholder */}
        <div
          className="nx-skeleton h-9 w-28 rounded-full"
          style={{ '--skeleton-base': 'rgba(37,99,235,0.12)', '--skeleton-shine': 'rgba(37,99,235,0.20)' } as React.CSSProperties}
        />
      </header>

      {/* Hero area skeleton — correspond à la hauteur above-the-fold du hero HomePage */}
      <div
        className="flex flex-col items-start justify-center lg:flex-row lg:items-center"
        style={{
          marginTop: '5rem',
          minHeight: '82vh',
          paddingInline: 'clamp(24px, 8vw, 160px)',
          paddingBlock: 'clamp(40px, 5vw, 88px)',
          gap: '2rem',
        }}
      >
        {/* Left column */}
        <div className="flex flex-1 flex-col gap-4">
          <div
            className="nx-skeleton h-4 w-24 rounded"
            style={{ '--skeleton-base': 'rgba(37,99,235,0.10)', '--skeleton-shine': 'rgba(37,99,235,0.18)' } as React.CSSProperties}
          />
          <div
            className="nx-skeleton h-10 w-full max-w-md rounded-xl"
            style={{ '--skeleton-base': 'rgba(0,0,0,0.07)', '--skeleton-shine': 'rgba(0,0,0,0.12)' } as React.CSSProperties}
          />
          <div
            className="nx-skeleton h-10 w-3/4 max-w-sm rounded-xl"
            style={{ '--skeleton-base': 'rgba(0,0,0,0.07)', '--skeleton-shine': 'rgba(0,0,0,0.12)' } as React.CSSProperties}
          />
          <div className="mt-2 flex flex-col gap-2">
            {[100, 90, 80].map((p, i) => (
              <div
                key={i}
                className="nx-skeleton h-4 rounded"
                style={{ width: `${p}%`, '--skeleton-base': 'rgba(0,0,0,0.05)', '--skeleton-shine': 'rgba(0,0,0,0.09)' } as React.CSSProperties}
              />
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <div
              className="nx-skeleton h-12 w-36 rounded-full"
              style={{ '--skeleton-base': 'rgba(37,99,235,0.15)', '--skeleton-shine': 'rgba(37,99,235,0.25)' } as React.CSSProperties}
            />
            <div
              className="nx-skeleton h-12 w-28 rounded-full"
              style={{ '--skeleton-base': 'rgba(0,0,0,0.06)', '--skeleton-shine': 'rgba(0,0,0,0.10)' } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Right column — image placeholder avec ratio 4/3 comme hero */}
        <div className="w-full flex-1">
          <div
            className="nx-skeleton w-full rounded-[2rem]"
            style={{
              aspectRatio: '4/3',
              '--skeleton-base': 'rgba(0,0,0,0.06)',
              '--skeleton-shine': 'rgba(0,0,0,0.10)',
            } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  )
}
