import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import { sitePhotos } from '@/site/lib/sitePhotos'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(80px, 12vw, 160px)' }

const principles = [
  {
    title: 'Ancré terrain',
    body: 'Chaque fonctionnalité est pensée depuis les contraintes réelles des exploitants, planificateurs et dirigeants transport.',
  },
  {
    title: 'Clarté opérationnelle',
    body: 'L\'information critique doit être visible immédiatement pour réduire les angles morts et accélérer la décision.',
  },
  {
    title: 'Technologie utile',
    body: 'L\'innovation n\'a de valeur que si elle simplifie le quotidien et améliore la rentabilité des entreprises.',
  },
] as const

export default function AboutPage() {
  useSiteMeta({
    title: 'À propos — ERP transport routier',
    description: 'Découvrez l\'histoire, la vision et l\'expertise NEXORA Truck pour moderniser durablement le transport routier dans l\'espace francophone.',
    canonicalPath: '/a-propos',
    keywords: 'à propos Nexora Truck, startup transport Marseille, vision ERP transport, modernisation transport routier',
  ogImage: 'https://nexora-truck.fr/site/screenshots/camions.png',
  })

  return (
    <>
      {/* ── HERO ── */}
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
      </div>

      {/* ── IMAGE SECTION ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPy }}>
        <div className="mx-auto" style={{ width: '90vw', maxWidth: '1200px' }}>
          <img
            src={sitePhotos.aboutHeroSecondary.src(1400)}
            srcSet={sitePhotos.aboutHeroSecondary.srcSet([768, 1200, 1400])}
            sizes="(max-width: 768px) 100vw, 90vw"
            alt="Camion de transport sur route de montagne avec paysage naturel"
            className="w-full rounded-lg object-cover"
            loading="lazy"
            style={{ aspectRatio: '21/9' }}
          />
        </div>
        <p className="mt-6 text-center text-sm" style={{ color: '#86868B' }}>
          Notre mission : offrir une plateforme qui simplifie la complexité quotidienne sans sacrifier la profondeur métier.
        </p>
      </section>

      {/* ── VISION / PRINCIPLES ── */}
      <section
        className="w-full bg-white"
        style={{ ...sectionPx, ...sectionPy }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>
          Vision
        </p>
        <h2
          className="mt-4 max-w-2xl font-semibold leading-tight"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}
        >
          Une approche humaine et technologique
        </h2>
        <p className="mt-4 max-w-2xl" style={{ color: '#6E6E73' }}>
          Nous développons un produit robuste, mais aussi une relation durable avec les équipes terrain.
        </p>

        <div className="mt-16 grid gap-x-20 gap-y-12 md:grid-cols-3">
          {principles.map(item => (
            <div key={item.title}>
              <h3 className="text-xl font-semibold" style={{ color: '#000000' }}>{item.title}</h3>
              <p className="mt-3" style={{ color: '#6E6E73' }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRESS / RESOURCES ── */}
      <section
        className="w-full"
        style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>
          Espace presse
        </p>
        <h2
          className="mt-4 max-w-2xl font-semibold leading-tight"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}
        >
          Ressources pour partenaires et médias
        </h2>

        <div className="mt-12 grid gap-4">
          {([
            'Présentation institutionnelle NEXORA Truck (PDF)',
            'Kit média : logo et captures produit',
            'Communiqué vision marché transport francophone',
            'Contact presse et partenariats sectoriels',
          ] as const).map(item => (
            <div key={item} className="rounded-lg bg-white px-5 py-4" style={{ border: '1px solid #E5E5E5', color: '#1D1D1F' }}>
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="w-full bg-white text-center"
        style={{ ...sectionPx, paddingBlock: 'clamp(100px, 14vw, 200px)' }}
      >
        <h2
          className="mx-auto max-w-3xl text-balance font-semibold leading-tight"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#000000' }}
        >
          Parlons de votre feuille de route digitale transport
        </h2>
        <p className="mx-auto mt-6 max-w-xl" style={{ color: '#6E6E73' }}>
          Nous préparons avec vous une trajectoire réaliste : quick wins opérationnels, montée en puissance, puis extension progressive des modules.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/contact"
            className="site-btn-primary px-6 py-3 text-sm transition-colors"
          >
            Contacter l'équipe
          </Link>
          <Link
            to="/solution"
            className="text-sm font-semibold transition-colors"
            style={{ color: '#2563EB' }}
          >
            Revoir la solution
          </Link>
        </div>
      </section>
    </>
  )
}
