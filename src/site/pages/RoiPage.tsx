import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import { sitePhotos } from '@/site/lib/sitePhotos'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(80px, 12vw, 160px)' }

const kpis = [
  { label: 'Heures administratives', before: '42 h/semaine', after: '25 h/semaine' },
  { label: 'Courses en retard', before: '14 %', after: '8 %' },
  { label: 'Ressaisies facturation', before: 'élevées', after: 'réduites de 60 %' },
  { label: 'Marge non tracée', before: 'fréquente', after: 'sous contrôle' },
] as const

const caseStudies = [
  { company: 'Transport régional — 28 véhicules', gain: 'ROI en 6 mois', detail: 'Centralisation exploitation + planning + suivi conformité, avec baisse des coûts cachés liés aux doublons et retards.' },
  { company: 'Groupe multisites — 83 véhicules', gain: 'ROI en 9 mois', detail: 'Vision consolidée sur 3 agences et harmonisation des process de dispatch, affectation et facturation.' },
  { company: 'Flotte spécialisée frigorifique', gain: 'ROI en 7 mois', detail: 'Amélioration du taux de service client et réduction des pénalités grâce au pilotage temps réel des incidents.' },
] as const

export default function RoiPage() {
  useSiteMeta({
    title: 'Avantages et ROI — NEXORA Truck',
    description: 'Mesurez le ROI de NEXORA Truck : gains opérationnels, réduction des ressaisies et meilleure rentabilité pour les transporteurs francophones.',
    canonicalPath: '/avantages-roi',
    keywords: 'ROI logiciel transport, gains ERP transport, optimisation coûts transport routier, rentabilité TMS',
  })

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative flex min-h-[70vh] w-full flex-col items-center justify-center overflow-hidden text-center" style={{ ...sectionPx, ...sectionPy }}>
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
      </section>

      {/* ── BENCHMARK AVANT/APRÈS ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Benchmark</p>
        <h2 className="mt-4 max-w-3xl font-semibold leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}>
          Avant / après centralisation du pilotage
        </h2>
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {kpis.map(k => (
            <div key={k.label}>
              <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#6E6E73' }}>{k.label}</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div style={{ borderLeft: '3px solid #EF4444', paddingLeft: '12px' }}>
                  <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>Avant</p>
                  <p className="mt-1 font-semibold" style={{ color: '#1D1D1F' }}>{k.before}</p>
                </div>
                <div style={{ borderLeft: '3px solid #22C55E', paddingLeft: '12px' }}>
                  <p className="text-xs font-semibold" style={{ color: '#22C55E' }}>Après</p>
                  <p className="mt-1 font-semibold" style={{ color: '#1D1D1F' }}>{k.after}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ÉTUDES DE CAS ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Études de cas</p>
        <h2 className="mt-4 max-w-3xl font-semibold leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}>
          Trois profils d'entreprises, trois trajectoires de gains
        </h2>
        <div className="mt-16 grid gap-x-20 gap-y-12 md:grid-cols-3">
          {caseStudies.map(cs => (
            <div key={cs.company}>
              <p className="text-sm font-semibold" style={{ color: '#2563EB' }}>{cs.company}</p>
              <h3 className="mt-2 text-2xl font-bold" style={{ color: '#000000' }}>{cs.gain}</h3>
              <p className="mt-3" style={{ color: '#6E6E73' }}>{cs.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="w-full text-center" style={{ background: '#F5F5F7', ...sectionPx, paddingBlock: 'clamp(100px, 14vw, 200px)' }}>
        <h2 className="mx-auto max-w-3xl text-balance font-semibold leading-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#000000' }}>
          Calculez votre ROI sur vos propres données.
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/demonstration" className="site-btn-primary px-6 py-3 text-sm transition-colors">Réserver une démonstration</Link>
          <Link to="/contact" className="text-sm font-semibold" style={{ color: '#2563EB' }}>Parler à un expert</Link>
        </div>
      </section>
    </>
  )
}
