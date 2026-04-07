import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import { sitePhotos } from '@/site/lib/sitePhotos'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(80px, 12vw, 160px)' }

const challenges = [
  { title: 'Marges sous pression', body: 'Coûts variables en hausse, attentes clients plus exigeantes et concurrence accrue sur les prix.' },
  { title: 'Outils fragmentés', body: 'Planning, flotte et finance vivent dans 3 à 4 outils déconnectés qui ralentissent la décision.' },
  { title: 'Visibilité insuffisante', body: 'Besoin croissant de suivi temps réel sur l\'exécution terrain et la disponibilité des ressources.' },
  { title: 'Conformité complexe', body: 'Obligations réglementaires (tachygraphe, HSE, documents) plus complexes à suivre au quotidien.' },
] as const

const regions = [
  { title: 'France', body: 'Marché dense et concurrentiel, avec un besoin fort de digitalisation opérationnelle et de fiabilisation de la marge.' },
  { title: 'Belgique & Suisse', body: 'Structures exigeantes sur la qualité de service, la conformité et la traçabilité des opérations transfrontalières.' },
  { title: 'Canada francophone', body: 'Enjeu de coordination multi-sites et de pilotage de la performance dans des territoires logistiques étendus.' },
  { title: 'Afrique francophone', body: 'Potentiel élevé pour des solutions robustes, simples à déployer et capables de structurer une croissance rapide.' },
] as const

export default function SecteurTransportPage() {
  useSiteMeta({
    title: 'Transport routier francophone : marchés, défis et modernisation',
    description: 'Analyse du marché transport francophone, défis du secteur routier et vision NEXORA Truck pour moderniser le pilotage des entreprises.',
    canonicalPath: '/secteur-transport',
    keywords: 'marché transport francophone, transformation digitale transport routier, enjeux transporteurs, innovation logistique',
  ogImage: 'https://nexora-truck.fr/site/screenshots/camions.png',
  })

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative flex min-h-[75vh] w-full flex-col items-center justify-center overflow-hidden text-center" style={{ ...sectionPx, ...sectionPy }}>
        <img src={sitePhotos.truckRoadWide.src(1600)} alt="Poids lourds sur un corridor de transport sans logos visibles" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.7)' }}>Secteur transport</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', color: '#FFFFFF', letterSpacing: '-0.025em' }}>
            Une industrie en mutation rapide qui cherche enfin des outils à la hauteur
          </h1>
          <p className="mx-auto mt-6 max-w-2xl" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '20px', lineHeight: 1.6 }}>
            Le transport routier francophone fait face à une équation complexe : plus d'exigences, plus de pression et des outils encore trop éclatés.
          </p>
        </div>
      </section>

      {/* ── DÉFIS ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Constat</p>
        <h2 className="mt-4 max-w-3xl font-semibold leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}>
          Les défis structurels du secteur
        </h2>
        <div className="mt-16 grid gap-x-20 gap-y-12 md:grid-cols-2">
          {challenges.map(c => (
            <div key={c.title}>
              <h3 className="text-xl font-semibold" style={{ color: '#000000' }}>{c.title}</h3>
              <p className="mt-3" style={{ color: '#6E6E73' }}>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── RÉGIONS ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Marché cible</p>
        <h2 className="mt-4 max-w-3xl font-semibold leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}>
          Une stratégie orientée pays francophones
        </h2>
        <p className="mt-4 max-w-2xl" style={{ color: '#6E6E73' }}>
          NEXORA Truck est conçu à Marseille pour répondre aux réalités de terrain dans tout l'espace francophone.
        </p>
        <div className="mt-16 grid gap-x-20 gap-y-12 md:grid-cols-2">
          {regions.map(r => (
            <div key={r.title}>
              <h3 className="text-xl font-semibold" style={{ color: '#000000' }}>{r.title}</h3>
              <p className="mt-3" style={{ color: '#6E6E73' }}>{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="w-full text-center" style={{ background: '#F5F5F7', ...sectionPx, paddingBlock: 'clamp(100px, 14vw, 200px)' }}>
        <h2 className="mx-auto max-w-3xl text-balance font-semibold leading-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#000000' }}>
          Positionner NEXORA Truck comme la référence technologique sectorielle.
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/demonstration" className="site-btn-primary px-6 py-3 text-sm transition-colors">Demander une démonstration</Link>
          <Link to="/a-propos" className="text-sm font-semibold" style={{ color: '#2563EB' }}>Découvrir notre vision</Link>
        </div>
      </section>
    </>
  )
}
