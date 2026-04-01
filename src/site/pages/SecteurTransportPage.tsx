import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const marketFacts = [
  'Pression sur les marges, coûts variables et attentes clients en hausse.',
  'Fragmentation des outils qui ralentit la décision opérationnelle.',
  'Besoin croissant de visibilité temps réel sur l exécution terrain.',
  'Obligations réglementaires plus complexes à suivre au quotidien.',
] as const

const regions = [
  {
    title: 'France',
    body: 'Marché dense et concurrentiel, avec un besoin fort de digitalisation opérationnelle et de fiabilisation de la marge.',
  },
  {
    title: 'Belgique & Suisse',
    body: 'Structures exigeantes sur la qualité de service, la conformité et la traçabilité des opérations transfrontalières.',
  },
  {
    title: 'Canada francophone',
    body: 'Enjeu de coordination multi-sites et de pilotage de la performance dans des territoires logistiques étendus.',
  },
  {
    title: 'Afrique francophone',
    body: 'Potentiel élevé pour des solutions robustes, simples à déployer et capables de structurer une croissance rapide.',
  },
] as const

export default function SecteurTransportPage() {
  useSiteMeta({
    title: 'Secteur Transport Francophone',
    description: 'Analyse du marché transport francophone, défis du secteur routier et vision NEXORA Truck pour moderniser le pilotage des entreprises.',
    canonicalPath: '/secteur-transport',
    keywords: 'marché transport francophone, transformation digitale transport routier, enjeux transporteurs, innovation logistique',
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-[#dbeafe] bg-[linear-gradient(145deg,#0f172a_0%,#1e3a8a_45%,#0f172a_100%)] p-7 text-white shadow-[0_28px_90px_rgba(15,23,42,0.35)] sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#fb923c]">Secteur transport</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-[3.1rem] sm:leading-[1.06]">
          Une industrie en mutation rapide qui cherche enfin des outils à la hauteur
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-100">
          Le transport routier francophone fait face à une équation complexe: plus d exigences, plus de pression et des outils encore
          trop éclatés. NEXORA Truck apporte une réponse unifiée, pensée métier.
        </p>
      </section>

      <SiteSection
        eyebrow="Constat"
        title="Les défis structurels du secteur"
        description="Comprendre les points de friction permet de prioriser les leviers qui créent un impact immédiat."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {marketFacts.map(item => (
            <article key={item} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
              <p className="text-sm leading-7 text-slate-700">{item}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Marché cible"
        title="Une stratégie orientée pays francophones"
        description="NEXORA Truck est conçu à Marseille pour répondre aux réalités de terrain dans tout l espace francophone."
        muted
      >
        <div className="grid gap-4 md:grid-cols-2">
          {regions.map(item => (
            <article key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <section className="rounded-[1.8rem] border border-[#fed7aa] bg-[#fff7ed] p-7 sm:p-9">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Positionner NEXORA Truck comme la référence technologique sectorielle</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
          Notre approche combine content marketing métier, SEO ciblé transport et démonstrations personnalisées pour convertir des dirigeants qualifiés.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/demonstration" className="rounded-full bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1e40af]">
            Demander une démonstration
          </Link>
          <Link to="/a-propos" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-white">
            Découvrir notre vision
          </Link>
        </div>
      </section>
    </div>
  )
}
