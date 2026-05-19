/**
 * patch-hero-sections.mjs
 * Removes opacity/gradient overlays from photo-hero sections.
 * Converts each hero to a solid dark-navy background with white text.
 * Adds a full-width image strip after the hero (for pages with sitePhotos).
 */
import { readFileSync, writeFileSync } from 'fs'

// ── FeaturesPage ─────────────────────────────────────────────────────────────
{
  const p = 'src/site/pages/FeaturesPage.tsx'
  let c = readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
  const oldHero = `      {/* ── HERO ── */}
      <section className="relative flex min-h-[75vh] w-full flex-col items-center justify-center overflow-hidden text-center" style={{ ...sectionPx, ...sectionPy }}>
        <img
          src={sitePhotos.featuresHero.src(1600)}
          srcSet={sitePhotos.featuresHero.srcSet([768, 1200, 1600])}
          sizes="100vw"
          alt="Camions en ville de nuit dans une ambiance urbaine cinématographique"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.5 }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 100%)' }} />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Fonctionnalités</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#000000', letterSpacing: '-0.025em' }}>
            Tout ce dont votre exploitation a besoin. En un seul outil.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl" style={{ color: '#6E6E73', fontSize: '20px', lineHeight: 1.6 }}>
            12 modules intégrés pour piloter planning, flotte, conducteurs, facturation et conformité sans changer d'écran.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/connexion-erp" className="site-btn-primary px-6 py-3 text-sm transition-colors">Essai gratuit — 14 jours</Link>
            <Link
              to="/demonstration"
              className="site-btn-primary px-6 py-3 text-sm transition-colors"
            >
              Voir la démonstration ▶
            </Link>
            <Link
              to="/toutes-les-fonctionnalites"
              className="site-btn-primary px-6 py-3 text-sm transition-colors"
              style={{ background: '#F97316', borderColor: '#F97316' }}
            >
              Toutes les fonctionnalités →
            </Link>
          </div>
        </div>
      </section>`

  const newHero = `      {/* ── HERO ── */}
      <section className="flex w-full flex-col items-center justify-center text-center" style={{ background: '#0f172a', ...sectionPx, ...sectionPy }}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#94a3b8' }}>Fonctionnalités</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#ffffff', letterSpacing: '-0.025em' }}>
            Tout ce dont votre exploitation a besoin. En un seul outil.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl" style={{ color: '#94a3b8', fontSize: '20px', lineHeight: 1.6 }}>
            12 modules intégrés pour piloter planning, flotte, conducteurs, facturation et conformité sans changer d'écran.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/connexion-erp" className="site-btn-primary px-6 py-3 text-sm transition-colors">Essai gratuit — 14 jours</Link>
            <Link
              to="/demonstration"
              className="site-btn-primary px-6 py-3 text-sm transition-colors"
            >
              Voir la démonstration ▶
            </Link>
            <Link
              to="/toutes-les-fonctionnalites"
              className="site-btn-primary px-6 py-3 text-sm transition-colors"
              style={{ background: '#F97316', borderColor: '#F97316' }}
            >
              Toutes les fonctionnalités →
            </Link>
          </div>
      </section>
      {/* ── HERO IMAGE ── */}
      <div className="w-full overflow-hidden" style={{ maxHeight: '380px' }}>
        <img
          src={sitePhotos.featuresHero.src(1600)}
          srcSet={sitePhotos.featuresHero.srcSet([768, 1200, 1600])}
          sizes="100vw"
          alt="Camions en ville de nuit dans une ambiance urbaine cinématographique"
          className="h-[380px] w-full object-cover"
          loading="eager"
        />
      </div>`

  if (!c.includes(oldHero)) { console.error('FeaturesPage: hero not found'); process.exit(1) }
  writeFileSync(p, c.replace(oldHero, newHero))
  console.log('patched FeaturesPage')
}

// ── SolutionPage ─────────────────────────────────────────────────────────────
{
  const p = 'src/site/pages/SolutionPage.tsx'
  let c = readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
  const oldHero = `      {/* ── HERO ── */}
      <section className="relative flex min-h-[75vh] w-full flex-col items-center justify-center overflow-hidden text-center" style={{ ...sectionPx, ...sectionPy }}>
        <img src={sitePhotos.truckRoadWide.src(1600)} alt="Poids lourds en transit sur un axe de transport" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.5 }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 100%)' }} />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>La solution</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#000000', letterSpacing: '-0.025em' }}>
            Le système d'exploitation complet du transport routier francophone
          </h1>
          <p className="mx-auto mt-6 max-w-2xl" style={{ color: '#6E6E73', fontSize: '20px', lineHeight: 1.6 }}>
            NEXORA Truck remplace la fragmentation des outils par une plateforme unique : opérationnel, planning, flotte, RH, conformité et finance avancent ensemble.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/demonstration" className="site-btn-primary px-6 py-3 text-sm transition-colors">Voir la démonstration</Link>
            <Link to="/avantages-roi" className="text-sm font-semibold" style={{ color: '#2563EB' }}>Analyser le ROI</Link>
          </div>
        </div>
      </section>`

  const newHero = `      {/* ── HERO ── */}
      <section className="flex w-full flex-col items-center justify-center text-center" style={{ background: '#0f172a', ...sectionPx, ...sectionPy }}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#94a3b8' }}>La solution</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#ffffff', letterSpacing: '-0.025em' }}>
            Le système d'exploitation complet du transport routier francophone
          </h1>
          <p className="mx-auto mt-6 max-w-2xl" style={{ color: '#94a3b8', fontSize: '20px', lineHeight: 1.6 }}>
            NEXORA Truck remplace la fragmentation des outils par une plateforme unique : opérationnel, planning, flotte, RH, conformité et finance avancent ensemble.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/demonstration" className="site-btn-primary px-6 py-3 text-sm transition-colors">Voir la démonstration</Link>
            <Link to="/avantages-roi" className="text-sm font-semibold" style={{ color: '#93c5fd' }}>Analyser le ROI</Link>
          </div>
      </section>
      {/* ── HERO IMAGE ── */}
      <div className="w-full overflow-hidden" style={{ maxHeight: '380px' }}>
        <img
          src={sitePhotos.truckRoadWide.src(1600)}
          srcSet={sitePhotos.truckRoadWide.srcSet([768, 1200, 1600])}
          sizes="100vw"
          alt="Poids lourds en transit sur un axe de transport"
          className="h-[380px] w-full object-cover"
          loading="eager"
        />
      </div>`

  if (!c.includes(oldHero)) { console.error('SolutionPage: hero not found'); process.exit(1) }
  writeFileSync(p, c.replace(oldHero, newHero))
  console.log('patched SolutionPage')
}

// ── RoiPage ──────────────────────────────────────────────────────────────────
{
  const p = 'src/site/pages/RoiPage.tsx'
  let c = readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
  const oldHero = `      <section className="relative flex min-h-[70vh] w-full flex-col items-center justify-center overflow-hidden text-center" style={{ ...sectionPx, ...sectionPy }}>
        <img src={sitePhotos.truckSoloRoad.src(1600)} alt="Poids lourd sur route pour illustrer la performance transport" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.5 }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 100%)' }} />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Avantages et ROI</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', color: '#000000', letterSpacing: '-0.025em' }}>
            Prouvez la valeur business de votre transformation digitale transport
          </h1>
          <p className="mx-auto mt-6 max-w-2xl" style={{ color: '#6E6E73', fontSize: '20px', lineHeight: 1.6 }}>
            Moins de pertes invisibles, plus de maîtrise opérationnelle et une lecture financière fiable pour piloter la croissance.
          </p>
        </div>
      </section>`

  const newHero = `      <section className="flex w-full flex-col items-center justify-center text-center" style={{ background: '#0f172a', ...sectionPx, ...sectionPy }}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#94a3b8' }}>Avantages et ROI</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', color: '#ffffff', letterSpacing: '-0.025em' }}>
            Prouvez la valeur business de votre transformation digitale transport
          </h1>
          <p className="mx-auto mt-6 max-w-2xl" style={{ color: '#94a3b8', fontSize: '20px', lineHeight: 1.6 }}>
            Moins de pertes invisibles, plus de maîtrise opérationnelle et une lecture financière fiable pour piloter la croissance.
          </p>
      </section>
      {/* ── HERO IMAGE ── */}
      <div className="w-full overflow-hidden" style={{ maxHeight: '340px' }}>
        <img
          src={sitePhotos.truckSoloRoad.src(1600)}
          srcSet={sitePhotos.truckSoloRoad.srcSet([768, 1200, 1600])}
          sizes="100vw"
          alt="Poids lourd sur route pour illustrer la performance transport"
          className="h-[340px] w-full object-cover"
          loading="eager"
        />
      </div>`

  if (!c.includes(oldHero)) { console.error('RoiPage: hero not found'); process.exit(1) }
  writeFileSync(p, c.replace(oldHero, newHero))
  console.log('patched RoiPage')
}

// ── SecteurTransportPage ──────────────────────────────────────────────────────
{
  const p = 'src/site/pages/SecteurTransportPage.tsx'
  let c = readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
  const oldHero = `      {/* ── HERO ── */}
      <section className="relative flex min-h-[75vh] w-full flex-col items-center justify-center overflow-hidden text-center" style={{ ...sectionPx, ...sectionPy }}>
        <img src={sitePhotos.truckRoadWide.src(1600)} alt="Poids lourds sur un corridor de transport sans logos visibles" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.5 }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 100%)' }} />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Secteur transport</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', color: '#000000', letterSpacing: '-0.025em' }}>
            Une industrie en mutation rapide qui cherche enfin des outils à la hauteur
          </h1>
          <p className="mx-auto mt-6 max-w-2xl" style={{ color: '#6E6E73', fontSize: '20px', lineHeight: 1.6 }}>
            Le transport routier francophone fait face à une équation complexe : plus d'exigences, plus de pression et des outils encore trop éclatés.
          </p>
        </div>
      </section>`

  const newHero = `      {/* ── HERO ── */}
      <section className="flex w-full flex-col items-center justify-center text-center" style={{ background: '#0f172a', ...sectionPx, ...sectionPy }}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#94a3b8' }}>Secteur transport</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', color: '#ffffff', letterSpacing: '-0.025em' }}>
            Une industrie en mutation rapide qui cherche enfin des outils à la hauteur
          </h1>
          <p className="mx-auto mt-6 max-w-2xl" style={{ color: '#94a3b8', fontSize: '20px', lineHeight: 1.6 }}>
            Le transport routier francophone fait face à une équation complexe : plus d'exigences, plus de pression et des outils encore trop éclatés.
          </p>
      </section>
      {/* ── HERO IMAGE ── */}
      <div className="w-full overflow-hidden" style={{ maxHeight: '380px' }}>
        <img
          src={sitePhotos.truckRoadWide.src(1600)}
          srcSet={sitePhotos.truckRoadWide.srcSet([768, 1200, 1600])}
          sizes="100vw"
          alt="Poids lourds sur un corridor de transport sans logos visibles"
          className="h-[380px] w-full object-cover"
          loading="eager"
        />
      </div>`

  if (!c.includes(oldHero)) { console.error('SecteurTransportPage: hero not found'); process.exit(1) }
  writeFileSync(p, c.replace(oldHero, newHero))
  console.log('patched SecteurTransportPage')
}

// ── AboutPage ─────────────────────────────────────────────────────────────────
{
  const p = 'src/site/pages/AboutPage.tsx'
  let c = readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
  const oldHero = `      {/* ── HERO ── */}
      <section
        className="relative w-full overflow-hidden text-center"
        style={{ ...sectionPx, ...sectionPy }}
      >
        <img
          src={sitePhotos.aboutHero.src(1600)}
          srcSet={sitePhotos.aboutHero.srcSet([768, 1200, 1600])}
          sizes="100vw"
          alt="Camions de transport sur une route ouverte avec paysage dégagé" aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.5 }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 100%)' }} />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>
            À propos
          </p>
          <h1
            className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', color: '#000000', letterSpacing: '-0.025em' }}
          >
            Construire depuis Marseille la référence technologique du transport francophone
          </h1>
          <p className="mx-auto mt-6 max-w-2xl" style={{ color: '#6E6E73', fontSize: '20px', lineHeight: 1.6 }}>
            NEXORA Truck naît d'une conviction forte : les transporteurs méritent un système d'exploitation moderne, unifié et orienté résultat.
          </p>
        </div>
      </section>`

  const newHero = `      {/* ── HERO ── */}
      <section
        className="flex w-full flex-col items-center justify-center text-center"
        style={{ background: '#0f172a', ...sectionPx, ...sectionPy }}
      >
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#94a3b8' }}>
            À propos
          </p>
          <h1
            className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', color: '#ffffff', letterSpacing: '-0.025em' }}
          >
            Construire depuis Marseille la référence technologique du transport francophone
          </h1>
          <p className="mx-auto mt-6 max-w-2xl" style={{ color: '#94a3b8', fontSize: '20px', lineHeight: 1.6 }}>
            NEXORA Truck naît d'une conviction forte : les transporteurs méritent un système d'exploitation moderne, unifié et orienté résultat.
          </p>
      </section>
      {/* ── HERO IMAGE ── */}
      <div className="w-full overflow-hidden" style={{ maxHeight: '380px' }}>
        <img
          src={sitePhotos.aboutHero.src(1600)}
          srcSet={sitePhotos.aboutHero.srcSet([768, 1200, 1600])}
          sizes="100vw"
          alt="Camions de transport sur une route ouverte avec paysage dégagé"
          className="h-[380px] w-full object-cover"
          loading="eager"
        />
      </div>`

  if (!c.includes(oldHero)) { console.error('AboutPage: hero not found'); process.exit(1) }
  writeFileSync(p, c.replace(oldHero, newHero))
  console.log('patched AboutPage')
}

// ── AllFeaturesPage ───────────────────────────────────────────────────────────
{
  const p = 'src/site/pages/AllFeaturesPage.tsx'
  let c = readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

  // Hero section
  const oldHero = `      <section className="relative flex min-h-[60vh] w-full flex-col items-center justify-center overflow-hidden text-center" style={{ ...sectionPx, ...sectionPy }}>
        <img
          src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt="Equipe produit et exploitation en atelier de travail sur les fonctionnalites"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.35 }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 100%)' }} />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#606065' }}>Roadmap produit</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 6vw, 4.5rem)', color: '#000000', letterSpacing: '-0.025em' }}>
            Plus de 80 fonctionnalités pour piloter votre exploitation transport.
          </h1>
          <p className="mt-4 text-xl font-semibold" style={{ color: '#1D1D1F', letterSpacing: '-0.01em' }}>
            Et une plateforme conçue pour évoluer.
          </p>
          <p className="mx-auto mt-5 max-w-2xl" style={{ color: '#606065', fontSize: '18px', lineHeight: 1.65 }}>
            NEXORA centralise l'ensemble des opérations transport et évolue vers un système connecté et intelligent.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/fonctionnalites" className="site-btn-primary px-6 py-3 text-sm transition-colors">Retour page fonctionnalités</Link>
            <Link to="/contact" className="text-sm font-semibold" style={{ color: '#2563EB' }}>Échanger avec l'équipe produit</Link>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border px-4 py-3 text-left" style={{ borderColor: '#E5E7EB', background: 'rgba(255,255,255,0.92)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#64748B' }}>Développé</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: '#0F172A' }}>{developedFeatures.length}</p>
            </div>
            <div className="rounded-xl border px-4 py-3 text-left" style={{ borderColor: '#E5E7EB', background: 'rgba(255,255,255,0.92)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#64748B' }}>En cours</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: '#0F172A' }}>{inProgressFeatures.length}</p>
            </div>
            <div className="rounded-xl border px-4 py-3 text-left" style={{ borderColor: '#E5E7EB', background: 'rgba(255,255,255,0.92)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#64748B' }}>Features</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: '#0F172A' }}>{upcomingFeatures.length}</p>
            </div>
          </div>
        </div>
      </section>`

  const newHero = `      <section className="flex w-full flex-col items-center justify-center text-center" style={{ background: '#0f172a', ...sectionPx, ...sectionPy }}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#94a3b8' }}>Roadmap produit</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 6vw, 4.5rem)', color: '#ffffff', letterSpacing: '-0.025em' }}>
            Plus de 80 fonctionnalités pour piloter votre exploitation transport.
          </h1>
          <p className="mt-4 text-xl font-semibold" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
            Et une plateforme conçue pour évoluer.
          </p>
          <p className="mx-auto mt-5 max-w-2xl" style={{ color: '#94a3b8', fontSize: '18px', lineHeight: 1.65 }}>
            NEXORA centralise l'ensemble des opérations transport et évolue vers un système connecté et intelligent.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/fonctionnalites" className="site-btn-primary px-6 py-3 text-sm transition-colors">Retour page fonctionnalités</Link>
            <Link to="/contact" className="text-sm font-semibold" style={{ color: '#93c5fd' }}>Échanger avec l'équipe produit</Link>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border px-4 py-3 text-left" style={{ borderColor: '#334155', background: '#1e293b' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#94a3b8' }}>Développé</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: '#ffffff' }}>{developedFeatures.length}</p>
            </div>
            <div className="rounded-xl border px-4 py-3 text-left" style={{ borderColor: '#334155', background: '#1e293b' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#94a3b8' }}>En cours</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: '#ffffff' }}>{inProgressFeatures.length}</p>
            </div>
            <div className="rounded-xl border px-4 py-3 text-left" style={{ borderColor: '#334155', background: '#1e293b' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#94a3b8' }}>Features</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: '#ffffff' }}>{upcomingFeatures.length}</p>
            </div>
          </div>
      </section>`

  if (!c.includes(oldHero)) { console.error('AllFeaturesPage: hero not found'); process.exit(1) }
  writeFileSync(p, c.replace(oldHero, newHero))
  console.log('patched AllFeaturesPage')
}

console.log('All hero sections patched.')
