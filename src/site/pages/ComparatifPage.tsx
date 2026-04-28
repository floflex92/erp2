import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const inlineLinkClassName = 'font-semibold text-[#2563EB]'

const compareRows = [
  {
    label: 'Ordres de transport et statuts',
    genericErp: 'Partiel ou adapte avec effort',
    standaloneTms: 'Couvert',
    nexora: 'Couvert nativement avec vision exploitation',
  },
  {
    label: 'Planning flotte et conducteurs',
    genericErp: 'Souvent hors coeur produit',
    standaloneTms: 'Variable selon le produit',
    nexora: 'Relie au meme flux de decision',
  },
  {
    label: 'Conformite terrain',
    genericErp: 'Traitee a part',
    standaloneTms: 'Souvent limitee',
    nexora: 'Visible dans le pilotage quotidien',
  },
  {
    label: 'Continuite jusqu a la facturation',
    genericErp: 'Possible mais parfois lourde',
    standaloneTms: 'Souvent incomplete',
    nexora: 'Pensee comme une chaine unique',
  },
]

export default function ComparatifPage() {
  useSiteMeta({
    title: 'Comparatif ERP transport : quoi comparer en 2026',
    description:
      'Comparatif ERP transport pour PME et TPE transport : quoi comparer entre ERP generaliste, TMS isole et plateforme metier orientee exploitation.',
    canonicalPath: '/comparatif-erp-transport',
    keywords:
      'comparatif ERP transport, comparer logiciel transport, ERP transport vs TMS, meilleur ERP transport routier, comparatif TMS transport',
    ogType: 'article',
    author: 'NEXORA Truck',
    breadcrumbs: [{ name: 'Comparatif ERP transport', path: '/comparatif-erp-transport' }],
    faqItems: [
      {
        question: 'Que faut-il comparer entre deux ERP transport ?',
        answer:
          'Il faut comparer la capacite a garder un flux continu entre mission, planning, flotte, conducteurs, conformite et facturation, pas seulement une liste de modules.',
      },
      {
        question: 'ERP generaliste ou TMS specialise : que choisir ?',
        answer:
          'Un ERP generaliste peut couvrir plus large mais etre moins adapte au terrain transport. Un TMS specialise peut etre tres bon sur le dispatch mais rester coupe du reste. L enjeu est la continuite de pilotage.',
      },
      {
        question: 'Comment eviter un mauvais comparatif logiciel transport ?',
        answer:
          'En testant des cas reels: urgence, reaffectation, indisponibilite flotte, cloture de mission et passage a la facturation. C est la que les differences apparaissent.',
      },
    ],
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Comparatif</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          Comparatif ERP transport : les criteres qui comptent vraiment pour une PME transport
        </h1>
        <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-[var(--site-text-secondary)]">
          <p>
            Un <strong>comparatif ERP transport</strong> utile ne doit pas opposer des listes de fonctionnalites, mais des
            logiques de pilotage. Le vrai choix se fait souvent entre trois familles: ERP generaliste, TMS isole ou plateforme
            metier orientee exploitation.
          </p>
          <p>
            Cette page sert a structurer la comparaison avant demo. Si vous cherchez plutot une vision budget, lisez aussi{' '}
            <Link to="/tarifs-erp-transport" className={inlineLinkClassName}>
              tarifs ERP transport
            </Link>
            .
          </p>
        </div>
      </section>

      <SiteSection
        eyebrow="Lecture rapide"
        title="Comparer les systemes sur le fil de la mission"
        description="Du dispatch a la facturation, chaque rupture cree des couts caches. C est ce fil qu il faut comparer."
      >
        <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1.1fr] border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
            <div className="px-4 py-3">Critere</div>
            <div className="px-4 py-3">ERP generaliste</div>
            <div className="px-4 py-3">TMS seul</div>
            <div className="px-4 py-3">NEXORA Truck</div>
          </div>
          {compareRows.map(row => (
            <div key={row.label} className="grid grid-cols-[1.2fr_1fr_1fr_1.1fr] border-b border-slate-100 text-sm last:border-0">
              <div className="px-4 py-4 font-medium text-slate-900">{row.label}</div>
              <div className="px-4 py-4 text-[var(--site-text-secondary)]">{row.genericErp}</div>
              <div className="px-4 py-4 text-[var(--site-text-secondary)]">{row.standaloneTms}</div>
              <div className="px-4 py-4 text-slate-900">{row.nexora}</div>
            </div>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Methode"
        title="Ce qu une demo doit obligatoirement montrer"
        description="Un comparatif solide se construit sur des cas reels et non sur un catalogue."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Scenario 1 : urgence d exploitation</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Changez une mission a la derniere minute. Regardez si le planning, la disponibilite ressource, le conducteur et
              le suivi mission se mettent a jour dans le meme flux.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Scenario 2 : cloture et facturation</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Demandez comment la mission cloturee alimente la preuve d execution, puis la facturation. C est souvent la ou les
              solutions fragmentent encore les donnees.
            </p>
          </article>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Decision"
        title="Quand NEXORA Truck a du sens dans un comparatif"
        description="Le produit est pertinent si votre enjeu principal est de reduire la coordination et les ressaisies autour de l exploitation."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            NEXORA Truck se positionne la ou la fragmentation fait perdre du temps: pilotage des missions, planning, flotte,
            conducteurs, conformite et finance. Si votre besoin est seulement un module administratif ou seulement un dispatch
            minimaliste, la comparaison sera differente.
          </p>
          <p>
            Pour cadrer votre besoin, vous pouvez poursuivre avec{' '}
            <Link to="/erp-transport-tms" className={inlineLinkClassName}>
              le guide ERP transport TMS
            </Link>{' '}
            ou demander une{' '}
            <Link to="/demonstration" className={inlineLinkClassName}>
              demonstration
            </Link>
            .
          </p>
        </div>
      </SiteSection>
    </div>
  )
}
