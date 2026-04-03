import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import { sitePhotos } from '@/site/lib/sitePhotos'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(80px, 12vw, 160px)' }

const modules = [
  { tag: 'Exploitation', title: 'Cockpit opérationnel en temps réel', body: 'OT, statuts, incidents et priorités sont centralisés dans un seul espace pour décider vite sans perdre le fil de la journée.' },
  { tag: 'Flotte', title: 'Gestion camions, remorques et maintenance', body: 'La flotte est reliée au planning et aux missions, avec une vision directe sur la disponibilité et les alertes atelier.' },
  { tag: 'Personnel', title: 'Conducteurs, RH et conformité', body: 'Dossiers chauffeurs, suivi documentaire, conformité et obligations terrain restent connectés aux opérations.' },
  { tag: 'Finance', title: 'Du transport livré à la facturation', body: 'Les données d\'exécution alimentent la facturation et la lecture de marge pour réduire les ressaisies.' },
  { tag: 'Communication', title: 'Coordination interne et client', body: 'Les échanges critiques restent reliés aux courses et au planning pour éviter la perte d\'information.' },
  { tag: 'API', title: 'Ouverture vers votre écosystème', body: 'Portail client, connectivité inter-ERP, automatisations et intégrations métier sont prévus dans l\'architecture.' },
] as const

const useCases = [
  'Réduire les retards en priorisant automatiquement les missions critiques.',
  'Gagner en lisibilité sur la charge hebdomadaire conducteurs et flotte.',
  'Mieux anticiper conformité, documents et échéances réglementaires.',
  'Piloter la rentabilité avec des données opérationnelles fiables.',
] as const

export default function SolutionPage() {
  useSiteMeta({
    title: 'La Solution ERP Transport — NEXORA Truck',
    description: 'NEXORA Truck réunit exploitation, flotte, personnel, finance et communication dans un seul système pour transporteurs francophones.',
    canonicalPath: '/solution',
    keywords: 'solution ERP transport, logiciel transport routier, plateforme TMS complète, gestion exploitation transport',
  })

  return (
    <>
      {/* ── HERO ── */}
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
      </section>

      {/* ── MODULES ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Modules</p>
        <h2 className="mt-4 max-w-3xl font-semibold leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}>
          Une architecture pensée pour les transporteurs
        </h2>
        <div className="mt-16 grid gap-x-20 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
          {modules.map(m => (
            <div key={m.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: '#2563EB' }}>{m.tag}</p>
              <h3 className="mt-2 text-xl font-semibold" style={{ color: '#000000' }}>{m.title}</h3>
              <p className="mt-3" style={{ color: '#6E6E73' }}>{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CAS D'USAGE ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Cas d'usage</p>
        <h2 className="mt-4 max-w-3xl font-semibold leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}>
          Ce que les dirigeants veulent améliorer rapidement
        </h2>
        <div className="mt-12 max-w-3xl grid gap-6">
          {useCases.map(uc => (
            <p key={uc} style={{ color: '#1D1D1F', borderLeft: '2px solid #E5E5E5', paddingLeft: '16px' }}>{uc}</p>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-4">
          <Link to="/fonctionnalites" className="text-sm font-semibold" style={{ color: '#2563EB' }}>Voir toutes les fonctionnalités</Link>
          <Link to="/planning-intelligent" className="text-sm font-semibold" style={{ color: '#2563EB' }}>Découvrir le planning intelligent</Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="w-full text-center" style={{ background: '#F5F5F7', ...sectionPx, paddingBlock: 'clamp(100px, 14vw, 200px)' }}>
        <h2 className="mx-auto max-w-3xl text-balance font-semibold leading-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#000000' }}>
          Prêt à unifier votre exploitation ?
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/connexion-erp" className="site-btn-primary px-6 py-3 text-sm transition-colors">Essai gratuit</Link>
          <Link to="/contact" className="text-sm font-semibold" style={{ color: '#2563EB' }}>Parler à un expert</Link>
        </div>
      </section>
    </>
  )
}
