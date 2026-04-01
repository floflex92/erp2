import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import FeatureCard from '@/site/components/FeatureCard'
import MetricStrip from '@/site/components/MetricStrip'
import ProcessStepCard from '@/site/components/ProcessStepCard'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const metrics = [
  { value: '5-100+', label: 'véhicules pilotés', detail: 'pour des structures régionales, multisites ou spécialisées' },
  { value: '1 cockpit', label: 'vision globale', detail: 'exploitation, planning, flotte, RH et finance dans un seul système' },
  { value: 'francophone', label: 'marché cible', detail: 'France, Belgique, Suisse, Canada et Afrique francophone' },
]

const pillars = [
  {
    tag: 'Impact',
    title: 'Décider plus vite avec une vision unifiée',
    body: 'Fini les arbitrages à l aveugle entre mails, tableaux et outils isolés.',
  },
  {
    tag: 'Rentabilité',
    title: 'Sécuriser la marge opérationnelle',
    body: 'Les données terrain alimentent enfin les décisions business et la facturation.',
  },
  {
    tag: 'Scalabilité',
    title: 'Grandir sans refaire votre organisation',
    body: 'Le socle NEXORA Truck absorbe la complexité à mesure que votre flotte évolue.',
  },
]

const workflow = [
  {
    step: '01',
    title: 'Capter les données utiles',
    body: 'Ordres de transport, ressources et contraintes entrent dans un référentiel unique.',
    timing: 'Dès la prise de mission',
  },
  {
    step: '02',
    title: 'Orchestrer l exécution',
    body: 'Le planning intelligent priorise, affecte et ajuste en continu selon la réalité terrain.',
    timing: 'Pendant toute l exploitation',
  },
  {
    step: '03',
    title: 'Mesurer pour progresser',
    body: 'Les performances deviennent lisibles pour améliorer les marges et la qualité de service.',
    timing: 'Chaque fin de cycle',
  },
]

export default function HomePage() {
  useSiteMeta({
    title: 'ERP Transport Routier Francophone',
    description: 'NEXORA Truck est le système d exploitation complet du transport routier: planning intelligent, pilotage flotte, conformité et performance business.',
    canonicalPath: '/',
    keywords: 'ERP transport routier, logiciel transport francophone, planning intelligent transport, TMS tout-en-un',
  })

  useEffect(() => {
    const organizationScript = document.createElement('script')
    organizationScript.type = 'application/ld+json'
    organizationScript.id = 'home-organization-jsonld'
    organizationScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'NEXORA Truck',
      url: 'https://nexora-truck.fr',
      areaServed: ['FR', 'BE', 'CH', 'CA'],
      sameAs: [],
    })
    document.head.appendChild(organizationScript)

    return () => {
      organizationScript.remove()
    }
  }, [])

  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="site-reveal grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="rounded-[2.2rem] border border-[#bfdbfe] bg-[linear-gradient(145deg,#ffffff_0%,#eff6ff_58%,#fff7ed_100%)] px-7 py-9 shadow-[0_30px_95px_rgba(29,78,216,0.16)] sm:px-9 sm:py-11">
          <p className="inline-flex rounded-full border border-[#dbeafe] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#1d4ed8]">
            Votre projet en un coup d oeil
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-[3.5rem] sm:leading-[1.02]">
            NEXORA Truck modernise le pilotage transport, de Marseille à tout le marché francophone.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700">
            Une plateforme tout-en-un pour remplacer la fragmentation des outils et donner aux dirigeants une vision globale,
            lisible et actionnable de leur activité transport.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/demonstration" className="rounded-full bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1e40af]">
              Demander une démonstration
            </Link>
            <Link to="/solution" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-white">
              Explorer la solution
            </Link>
          </div>
        </div>

        <div className="site-reveal rounded-[2rem] border border-[#fdba74] bg-[linear-gradient(145deg,#0b1736,#132c6a_55%,#1d4ed8)] p-7 text-white shadow-[0_28px_95px_rgba(15,23,42,0.28)] sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#fdba74]">Vision stratégique</p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">Devenir la référence technologique du transport routier</h2>
          <p className="mt-4 text-sm leading-7 text-slate-200">
            Le site vitrine est conçu pour convertir des dirigeants qualifiés en prospects: preuve produit, vision marché,
            ROI et parcours de prise de rendez-vous ciblé.
          </p>
          <div className="mt-6 grid gap-3">
            <div className="rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm">Audience: entreprises de 5 à 100+ véhicules</div>
            <div className="rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm">Cible: décideurs transport en quête de modernisation</div>
            <div className="rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm">Canal: SEO métier + démonstrations personnalisées</div>
          </div>
        </div>
      </section>

      <MetricStrip items={metrics} />

      <SiteSection
        eyebrow="Méthode"
        title="Un parcours conçu pour convaincre vite et bien"
        description="Chaque étape répond à une question clé du décideur: que fait le produit, que gagne-t-on et comment on démarre."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {workflow.map(step => (
            <ProcessStepCard key={step.step} {...step} />
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Différenciation"
        title="Trois raisons de choisir NEXORA Truck"
        description="Une proposition claire pour des dirigeants qui veulent des résultats, pas une énième couche logicielle."
        muted
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {pillars.map(item => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </SiteSection>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-7 py-8 shadow-[0_24px_70px_rgba(15,23,42,0.1)] sm:px-9 sm:py-10">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.5rem]">Prêt à transformer votre pilotage transport?</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">
          Planifions une démonstration orientée sur votre réalité terrain: exploitation, planning, conformité et performance financière.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/demonstration" className="rounded-full bg-[#fb923c] px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-[#fdba74]">
            Réserver un créneau
          </Link>
          <Link to="/secteur-transport" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Voir notre vision marché
          </Link>
        </div>
      </section>
    </div>
  )
}