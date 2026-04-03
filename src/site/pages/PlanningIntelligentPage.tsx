import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import { sitePhotos } from '@/site/lib/sitePhotos'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(80px, 12vw, 160px)' }

const pillars = [
  { title: 'Vue charge globale', body: 'Lecture instantanée des ressources, des créneaux critiques et des missions sensibles sur la semaine.' },
  { title: 'Arbitrage assisté', body: 'Réaffectation rapide selon disponibilité, contraintes conducteur, flotte et priorité client.' },
  { title: 'Groupage maîtrisé', body: 'Préparation multi-courses avec capacité à figer ou délier les lots selon les aléas terrain.' },
  { title: 'Traçabilité complète', body: 'Chaque décision planning est historisée pour fiabiliser l\'exécution et les analyses post-opération.' },
] as const

const outcomes = [
  { value: '-27 %', label: 'retards évitables', detail: 'grâce à une priorisation proactive des conflits planning' },
  { value: '+19 %', label: 'taux de remplissage', detail: 'avec groupage intelligent et meilleure affectation des ressources' },
  { value: '-35 %', label: 'temps de coordination', detail: 'moins d\'allers-retours entre exploitation, chauffeurs et atelier' },
] as const

export default function PlanningIntelligentPage() {
  useSiteMeta({
    title: 'Planning Intelligent Transport — NEXORA Truck',
    description: 'Découvrez le planning intelligent NEXORA Truck : affectations dynamiques, groupage maîtrisé et pilotage en temps réel des opérations transport.',
    canonicalPath: '/planning-intelligent',
    keywords: 'planning transport intelligent, optimisation tournées transport, planning chauffeurs camions, groupage transport routier',
  })

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative flex min-h-[75vh] w-full flex-col items-center justify-center overflow-hidden text-center" style={{ ...sectionPx, ...sectionPy }}>
        <img src={sitePhotos.truckMountainRoad.src(1600)} alt="Camion de transport sur route dégagée pour tournée planifiée" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.5 }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 100%)' }} />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Planning intelligent</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#000000', letterSpacing: '-0.025em' }}>
            Le cœur du système pour orchestrer chaque mission sans friction
          </h1>
          <p className="mx-auto mt-6 max-w-2xl" style={{ color: '#6E6E73', fontSize: '20px', lineHeight: 1.6 }}>
            Visualisez la charge, anticipez les conflits et réorganisez l'exploitation en quelques clics, même sous pression.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/demonstration" className="site-btn-primary px-6 py-3 text-sm transition-colors">Voir une démo planning</Link>
            <Link to="/contact" className="text-sm font-semibold" style={{ color: '#2563EB' }}>Planifier un échange</Link>
          </div>
        </div>
      </section>

      {/* ── 4 LEVIERS ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Fonctionnement</p>
        <h2 className="mt-4 max-w-3xl font-semibold leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}>
          Quatre leviers pour un planning réellement opérationnel
        </h2>
        <p className="mt-4 max-w-2xl" style={{ color: '#6E6E73' }}>La valeur ne vient pas seulement de l'affichage, mais de la capacité à décider vite et juste.</p>
        <div className="mt-16 grid gap-x-20 gap-y-12 md:grid-cols-2">
          {pillars.map((p, i) => (
            <div key={p.title}>
              <p className="text-sm font-semibold" style={{ color: '#2563EB' }}>Levier {i + 1}</p>
              <h3 className="mt-2 text-xl font-semibold" style={{ color: '#000000' }}>{p.title}</h3>
              <p className="mt-3" style={{ color: '#6E6E73' }}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── IMPACT ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Impact</p>
        <h2 className="mt-4 max-w-3xl font-semibold leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}>
          Résultats attendus sur un parc de 5 à 100+ véhicules
        </h2>
        <div className="mt-16 grid gap-8 text-center md:grid-cols-3">
          {outcomes.map(o => (
            <div key={o.label}>
              <p className="font-extrabold" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#000000', lineHeight: 1 }}>{o.value}</p>
              <p className="mt-2 text-sm font-semibold uppercase tracking-wide" style={{ color: '#2563EB' }}>{o.label}</p>
              <p className="mt-2" style={{ color: '#6E6E73' }}>{o.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="w-full text-center" style={{ background: '#F5F5F7', ...sectionPx, paddingBlock: 'clamp(100px, 14vw, 200px)' }}>
        <h2 className="mx-auto max-w-3xl text-balance font-semibold leading-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#000000' }}>
          Transformez votre planning en poste de commandement.
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/connexion-erp" className="site-btn-primary px-6 py-3 text-sm transition-colors">Essai gratuit</Link>
          <Link to="/avantages-roi" className="text-sm font-semibold" style={{ color: '#2563EB' }}>Voir le ROI attendu</Link>
        </div>
      </section>
    </>
  )
}
