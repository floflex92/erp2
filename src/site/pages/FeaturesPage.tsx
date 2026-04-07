import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import { sitePhotos } from '@/site/lib/sitePhotos'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(80px, 12vw, 160px)' }

const modules = [
  { title: 'Exploitation & courses', desc: 'Créez, suivez et clôturez vos ordres de transport depuis un cockpit unique. Statuts en temps réel, alertes de retard, historique complet.', kpi: '+120 OT/jour gérés en moyenne' },
  { title: 'Planning intelligent', desc: 'Affectez conducteurs et véhicules en glisser-déposer. Vue charge, arbitrage assisté, groupage et absorption des urgences.', kpi: '-31 % de temps passé sur le planning' },
  { title: 'Gestion de flotte', desc: 'Disponibilité temps réel, alertes CT/VGP, suivi kilométrique, maintenance préventive. Tout le parc roulant dans un seul écran.', kpi: '98,7 % de disponibilité opérationnelle' },
  { title: 'Conducteurs & conformité', desc: 'Dossier conducteur complet : documents, permis, FIMO/FCO, visite médicale, heures de service, historique missions.', kpi: '-42 % de non-conformités documentaires' },
  { title: 'Facturation & finance', desc: 'Générez vos factures depuis les OT validés. Relances automatiques, exports comptables, suivi de la marge par mission.', kpi: '-60 % de temps sur la facturation' },
  { title: 'API & intégrations', desc: 'Connectez Webfleet, tachygraphe numérique, portail client et flux fret. Architecture ouverte pour automatiser les tâches répétitives.', kpi: '+14 % de marge opérationnelle' },
] as const

const extras = [
  'Tableau de bord temps réel avec KPIs exploitation',
  'Carte live des véhicules avec géolocalisation',
  'Gestion des remorques et équipements',
  'Chronotachygraphe et données de conduite',
  'PV et amendes : suivi et contestation',
  'Ressources humaines : entretiens, documents, paie',
  'Communication interne : tchat et notifications',
  'Portail client et portail affréteur',
  'Coffre-fort numérique pour documents sensibles',
  'Prospection commerciale et CRM intégré',
] as const

export default function FeaturesPage() {
  useSiteMeta({
    title: 'Fonctionnalités ERP transport : planning, flotte, facturation, API',
    description: 'Découvrez les fonctionnalités de l’ERP transport NEXORA Truck : planning intelligent, gestion flotte, suivi conducteurs, facturation transport, télématique, chronotachygraphe, IA et API.',
    canonicalPath: '/fonctionnalites',
    keywords: 'fonctionnalités ERP transport, planning transport, gestion flotte, facturation transport, conformité conducteurs, TMS transport, logiciel exploitation transport, IA transport',
  })

  return (
    <>
      {/* ── HERO ── */}
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
            12 modules intégrés pour piloter planning, flotte, conducteurs, facturation et conformité sans changer d’écran.
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
      </section>

      {/* ── 6 MODULES ── */}
      <section id="toutes-fonctionnalites" className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Modules</p>
        <h2 className="mt-4 max-w-3xl font-semibold leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}>
          Six piliers pour couvrir l’intégralité de votre métier
        </h2>
        <div className="mt-16 grid gap-x-20 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
          {modules.map(m => (
            <div key={m.title}>
              <h3 className="text-xl font-semibold" style={{ color: '#000000' }}>{m.title}</h3>
              <p className="mt-3" style={{ color: '#6E6E73' }}>{m.desc}</p>
              <p className="mt-3 text-sm font-semibold" style={{ color: '#2563EB' }}>{m.kpi}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ÉCOSYSTÈME ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Écosystème</p>
        <h2 className="mt-4 max-w-3xl font-semibold leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}>Et bien plus encore</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {extras.map(e => (
            <p key={e} style={{ color: '#1D1D1F', borderLeft: '2px solid #2563EB', paddingLeft: '16px', paddingBlock: '8px' }}>{e}</p>
          ))}
        </div>
      </section>

      {/* ── PAR PROFIL ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Par profil</p>
        <h2 className="mt-4 max-w-3xl font-semibold leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}>Un même outil, trois visions</h2>
        <div className="mt-16 grid gap-x-20 gap-y-12 md:grid-cols-3">
          {([
            ['Exploitant', 'Cockpit temps réel, ordres de transport, alertes, planning et suivi de livraison. L’exploitant pilote sa journée sans quitter NEXORA.'],
            ['Direction', 'KPIs stratégiques, marge par mission, conformité globale, rentabilité par client. Le dirigeant prend des décisions éclairées.'],
            ['Conducteurs & RH', 'Dossier conducteur, documents à jour, heures de service, planning missions. L’équipe terrain reste connectée et conforme.'],
          ] as const).map(([t, d]) => (
            <div key={t}><h3 className="text-xl font-semibold" style={{ color: '#000000' }}>{t}</h3><p className="mt-3" style={{ color: '#6E6E73' }}>{d}</p></div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="w-full bg-white text-center" style={{ ...sectionPx, paddingBlock: 'clamp(100px, 14vw, 200px)' }}>
        <h2 className="mx-auto max-w-3xl text-balance font-semibold leading-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#000000' }}>
          Explorez chaque fonctionnalité par vous-même.
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/connexion-erp" className="site-btn-primary px-6 py-3 text-sm transition-colors">Essai gratuit</Link>
          <Link to="/contact" className="text-sm font-semibold" style={{ color: '#2563EB' }}>Parler à un expert</Link>
        </div>
      </section>

    </>
  )
}
