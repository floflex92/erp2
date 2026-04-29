import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const inlineLinkClassName = 'font-semibold text-[#2563EB]'

const capabilityBlocks = [
  {
    title: 'Ordres de transport et dispatch',
    body: 'Creation des missions, affectation, statuts, urgences et suivi d execution depuis une seule interface.',
  },
  {
    title: 'Planning, flotte et conducteurs',
    body: 'Disponibilites, contraintes, conformite et ressources terrain restent visibles au moment de la decision.',
  },
  {
    title: 'Facturation et continuite de donnees',
    body: 'Le meme flux relie l execution, la preuve de livraison et la facturation sans ressaisie.',
  },
]

const evaluationPoints = [
  'Temps passe a revalider les memes donnees entre planning, dispatch et finance.',
  'Capacite a reaffecter une mission urgente sans casser la journee.',
  'Visibilité réelle sur la disponibilité flotte et la conformité conducteur avant validation.',
  'Qualite de la trace laissee par chaque arbitrage et chaque incident terrain.',
]

export default function ErpTransportTmsPage() {
  useSiteMeta({
    title: 'ERP transport TMS pour PME',
    description:
      'Guide ERP transport TMS pour comprendre comment relier dispatch, planning, flotte, conducteurs et facturation dans un seul système adapté aux PME transport.',
    canonicalPath: '/erp-transport-tms',
    keywords:
      'ERP transport TMS, guide ERP transport, TMS pour PME transport, logiciel exploitation transport, ERP TMS transport routier',
    ogType: 'article',
    author: 'NEXORA Truck',
    breadcrumbs: [{ name: 'ERP transport TMS', path: '/erp-transport-tms' }],
    faqItems: [
      {
        question: 'ERP transport TMS : quelle difference ?',
        answer:
          'Un TMS couvre surtout les ordres de transport et le dispatch. Un ERP transport relie en plus la flotte, les conducteurs, la conformité et la facturation. Un ERP transport TMS combine ces deux niveaux dans un seul système.',
      },
      {
        question: 'Quand une PME transport a-t-elle besoin d un ERP transport TMS ?',
        answer:
          'Quand le planning, les missions, la flotte et la facturation sont eparpilles dans plusieurs outils et que chaque changement de mission cree des appels, des messages et des ressaisies.',
      },
      {
        question: 'Peut-on deployer un ERP transport TMS sans projet informatique lourd ?',
        answer:
          'Oui, si la solution est pensée pour l exploitation et si elle permet de démarrer sur un socle utile: missions, planning, flotte, conformité et finance, avec une progression module par module.',
      },
    ],
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Guide SEO</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          ERP transport TMS : comment unifier exploitation, planning et facturation
        </h1>
        <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-[var(--site-text-secondary)]">
          <p>
            Beaucoup de transporteurs cherchent un <strong>ERP transport TMS</strong> sans toujours savoir s ils doivent choisir
            un TMS pur, un ERP generaliste ou une plateforme metier reliee au terrain. Le vrai sujet n est pas l etiquette:
            c est la continuite entre ordre de transport, planning, flotte, conducteurs et facturation.
          </p>
          <p>
            Si vous cherchez une lecture plus canonique, consultez aussi{' '}
            <Link to="/erp-transport" className={inlineLinkClassName}>
              ERP transport
            </Link>{' '}
            et{' '}
            <Link to="/tms-transport" className={inlineLinkClassName}>
              TMS transport
            </Link>
            . Cette page sert de pont entre les deux intentions.
          </p>
        </div>
      </section>

      <SiteSection
        eyebrow="Definition"
        title="Ce que recouvre un ERP transport TMS"
        description="Le terme designe un systeme unique qui couvre a la fois le dispatch et la continuite de gestion autour de la mission."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {capabilityBlocks.map(block => (
            <article key={block.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">{block.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{block.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Pourquoi changer"
        title="Le probleme n est pas le nombre d outils, c est la rupture entre eux"
        description="Une PME transport peut vivre avec plusieurs logiciels tant que les donnees suivent. En pratique, elles se contredisent souvent."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Le planning est mis a jour dans un tableur, le statut mission circule par telephone, la disponibilite flotte depend
            d un autre ecran, puis la facturation repart dans un outil separe. Le cout vient de cette rupture: verification
            manuelle, arbitrage tardif, erreur de contexte, preuve d execution manquante et cloture de mission incomplete.
          </p>
          <p>
            Un ERP transport TMS utile ne cherche pas a faire plus. Il cherche a garder le fil de la mission. C est cette
            logique qui fait gagner du temps aux exploitants et qui rend la marge plus lisible.
          </p>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Evaluation"
        title="Comment evaluer une solution ERP transport TMS"
        description="Les bons criteres sont operationnels. Ils doivent etre visibles dans une demo reelle, pas seulement dans une brochure."
      >
        <ul className="grid gap-3">
          {evaluationPoints.map(point => (
            <li key={point} className="rounded-[1.2rem] border border-slate-200/80 bg-white px-5 py-4 text-sm leading-7 text-[var(--site-text)]">
              {point}
            </li>
          ))}
        </ul>
      </SiteSection>

      <SiteSection
        eyebrow="Positionnement"
        title="Pourquoi NEXORA Truck est pense comme un ERP transport TMS"
        description="Le produit est structure autour de l exploitation terrain, pas autour de silos fonctionnels."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            NEXORA Truck relie le cockpit exploitation, le planning, la flotte, les conducteurs, la conformite et la
            facturation dans la meme logique. Cette approche evite de choisir entre un TMS operationnel mais coupe du reste, et
            un ERP generaliste mal adapte au transport routier.
          </p>
          <p>
            Pour aller plus loin, vous pouvez consulter la page{' '}
            <Link to="/plateforme-erp-transport" className={inlineLinkClassName}>
              plateforme ERP transport
            </Link>{' '}
            puis demander une{' '}
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
