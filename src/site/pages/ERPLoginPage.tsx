import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import { sitePhotos } from '@/site/lib/sitePhotos'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(80px, 12vw, 160px)' }

export default function ERPLoginPage() {
  useSiteMeta({
    title: 'Essai gratuit — NEXORA Truck',
    description: 'Testez NEXORA Truck gratuitement pendant 14 jours. Aucune carte bancaire requise. Accédez à l\'ensemble de la plateforme ERP transport.',
  })

  return (
    <>
      {/* ── HERO — immersif et émotionnel ── */}
      <section
        className="relative flex min-h-[80vh] w-full flex-col items-center justify-center overflow-hidden text-center"
        style={{ ...sectionPx, ...sectionPy }}
      >
        <img
          src={sitePhotos.truckMountainRoad.src(1600)}
          alt="Camion de transport sur route ouverte sans marquage commercial" aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
        <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Essai gratuit
        </p>
        <h1
          className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#FFFFFF', letterSpacing: '-0.025em' }}
        >
          Votre exploitation mérite un outil à la hauteur.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '20px', lineHeight: 1.6 }}>
          14 jours pour découvrir comment NEXORA Truck peut transformer votre quotidien. Sans carte bancaire, sans engagement.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/login"
            className="site-btn-primary px-8 py-4 text-base transition-colors"
          >
            Commencer l'essai gratuit
          </Link>
          <Link
            to="/demonstration"
            className="text-sm font-semibold transition-colors"
            style={{ color: '#93C5FD' }}
          >
            Voir la démo d'abord ▶
          </Link>
        </div>
        </div>
      </section>

      {/* ── IMAGE IMMERSIVE ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPy }}>
        <div className="mx-auto" style={{ width: '90vw', maxWidth: '1200px' }}>
          <img
            src={sitePhotos.truckRoadWide.src(1400)}
            alt="Poids lourds en circulation sur un axe logistique"
            className="w-full rounded-lg object-cover"
            loading="lazy"
            style={{ aspectRatio: '21/9' }}
          />
        </div>
        <p className="mt-6 text-center text-sm" style={{ color: '#86868B' }}>
          Rejoignez +120 transporteurs qui ont déjà simplifié leur exploitation.
        </p>
      </section>

      {/* ── WHAT YOU GET ── */}
      <section
        className="w-full bg-white"
        style={{ ...sectionPx, ...sectionPy }}
      >
        <h2
          className="font-semibold leading-tight"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}
        >
          Ce qui vous attend
        </h2>
        <p className="mt-4 max-w-2xl" style={{ color: '#6E6E73' }}>
          Un accès complet à la plateforme, sans restriction. Explorez chaque module à votre rythme.
        </p>

        <div className="mt-16 grid gap-x-20 gap-y-12 md:grid-cols-3">
          {([
            ['Accès immédiat', 'Votre espace est prêt en quelques minutes. Importez vos données ou explorez avec les exemples fournis.'],
            ['Plateforme complète', 'Planning, flotte, conducteurs, facturation, conformité — tous les modules sont déverrouillés.'],
            ['Accompagnement garanti', 'Notre équipe vous guide pendant l\'essai pour que vous tiriez le maximum de NEXORA Truck.'],
          ] as const).map(([title, desc]) => (
            <div key={title}>
              <h3 className="text-xl font-semibold" style={{ color: '#000000' }}>{title}</h3>
              <p className="mt-3" style={{ color: '#6E6E73' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section
        className="w-full text-center"
        style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}
      >
        <div className="grid gap-8 md:grid-cols-3">
          {([
            ['+120', 'transporteurs nous font confiance'],
            ['72 h', 'pour être opérationnel'],
            ['4.8/5', 'satisfaction utilisateurs'],
          ] as const).map(([value, label]) => (
            <div key={value}>
              <p
                className="font-extrabold"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#000000', lineHeight: 1 }}
              >
                {value}
              </p>
              <p className="mt-3" style={{ color: '#6E6E73', fontSize: '16px' }}>{label}</p>
            </div>
          ))}
        </div>

        <blockquote className="mx-auto mt-20 max-w-2xl">
          <p
            className="font-light italic leading-relaxed"
            style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)', color: '#1D1D1F' }}
          >
            L'essai gratuit m'a convaincu en 3 jours. L'interface est claire, le planning est intuitif et mon équipe a adopté NEXORA sans formation.
          </p>
          <footer className="mt-5 text-base" style={{ color: '#6E6E73' }}>
            — Sophie M., Exploitante, Transport Durance (28 véhicules)
          </footer>
        </blockquote>
      </section>

      {/* ── FINAL CTA ── */}
      <section
        className="w-full bg-white text-center"
        style={{ ...sectionPx, paddingBlock: 'clamp(100px, 14vw, 200px)' }}
      >
        <h2
          className="mx-auto max-w-3xl text-balance font-semibold leading-tight"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#000000' }}
        >
          Prêt à simplifier votre exploitation ?
        </h2>
        <p className="mx-auto mt-6 max-w-xl" style={{ color: '#6E6E73' }}>
          14 jours d'essai gratuit. Sans carte bancaire. Sans engagement.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/login"
            className="site-btn-primary px-8 py-4 text-base transition-colors"
          >
            Commencer maintenant
          </Link>
          <Link
            to="/contact"
            className="text-sm font-semibold transition-colors"
            style={{ color: '#2563EB' }}
          >
            Parler à un expert
          </Link>
        </div>
      </section>
    </>
  )
}
