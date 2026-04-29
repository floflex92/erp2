import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const inlineLinkClassName = 'font-semibold text-[#2563EB]'

const pricingFactors = [
  {
    title: 'Taille de flotte et nombre d utilisateurs',
    body: 'Le besoin ne se dimensionne pas pareil pour 8 vehicules et pour 80. Le prix depend du perimetre reel de pilotage.',
  },
  {
    title: 'Modules actives',
    body: 'Exploitation, planning, flotte, conformite, documents, finance ou integrations n ont pas tous le meme niveau de couverture.',
  },
  {
    title: 'Niveau d accompagnement',
    body: 'Un cadrage simple n a pas le meme effort qu une reprise de donnees, une configuration avancee ou un deploiement multi-equipes.',
  },
]

const commonQuestions = [
  'A partir de combien de chauffeurs la centralisation devient-elle rentable ?',
  'Quel volume de ressaisie voulez-vous supprimer entre exploitants et facturation ?',
  'La telematique et les contraintes conformite doivent-elles remonter dans le meme flux ?',
  'Le projet vise-t-il seulement le dispatch ou une plateforme plus large de pilotage ?',
]

export default function PricingPage() {
  useSiteMeta({
    title: 'Tarifs ERP transport : comprendre le prix',
    description:
      'Tarifs ERP transport NEXORA Truck : comprendre comment se construit le prix selon la flotte, les modules, les integrations et le niveau d accompagnement.',
    canonicalPath: '/tarifs-erp-transport',
    keywords:
      'tarifs ERP transport, prix logiciel transport, prix TMS transport, cout ERP transport routier, devis ERP transport',
    ogType: 'article',
    author: 'NEXORA Truck',
    breadcrumbs: [{ name: 'Tarifs ERP transport', path: '/tarifs-erp-transport' }],
    faqItems: [
      {
        question: 'Pourquoi les tarifs ERP transport sont-ils souvent sur devis ?',
        answer:
          'Parce que le cout depend du nombre d utilisateurs, du perimetre fonctionnel, des integrations et du niveau d accompagnement necessaire au deploiement.',
      },
      {
        question: 'Que faut-il comparer dans un tarif ERP transport ?',
        answer:
          'Il faut comparer le perimetre reel couvert: exploitation, planning, flotte, conducteurs, conformite, documents, facturation, ainsi que les ressaisies qui restent ou disparaissent.',
      },
      {
        question: 'Le moins cher est-il le plus rentable ?',
        answer:
          'Pas forcement. Une solution moins chere mais fragmentee peut couter plus en coordination, erreurs et temps perdu qu un systeme mieux integre.',
      },
    ],
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Tarifs</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          Tarifs ERP transport : ce qu il faut comparer avant de demander un devis
        </h1>
        <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-[var(--site-text-secondary)]">
          <p>
            Chercher des <strong>tarifs ERP transport</strong> sans cadrer le besoin donne rarement une reponse utile. Le prix
            depend moins du mot ERP que du niveau de continuite attendu entre exploitation, planning, flotte, conducteurs et
            facturation.
          </p>
          <p>
            Cette page ne donne pas de faux bareme. Elle clarifie les variables qui font varier un devis et ce qu il faut
            comparer entre solutions. Pour la vision produit, consultez aussi{' '}
            <Link to="/plateforme-erp-transport" className={inlineLinkClassName}>
              la plateforme ERP transport
            </Link>
            .
          </p>
        </div>
      </section>

      <SiteSection
        eyebrow="Variables"
        title="Ce qui fait vraiment varier le prix"
        description="Le tarif depend du perimetre reel a couvrir, pas seulement d un nombre de licences."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {pricingFactors.map(factor => (
            <article key={factor.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
              <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">{factor.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{factor.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Comparer"
        title="Un tarif bas n a de sens que si le systeme remplace vraiment les couts caches"
        description="Le bon comparatif ne porte pas seulement sur le logiciel. Il porte sur les frictions qu il supprime."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Ce que le prix visible ne dit pas</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Ressaisies de fin de mois, revalidations quotidiennes, erreurs de contexte, mission mal cloturee ou absence de
              preuve d execution sont aussi des couts. Ils ne figurent pas dans la licence mais ils pesent sur la marge.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--site-text)]">Ce qu il faut demander en demo</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">
              Faites simuler une urgence, une reaffectation, une contrainte conducteur, puis la cloture et la facturation. Si
              le flux casse, le tarif devra etre reinterprete avec les couts caches restants.
            </p>
          </article>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Cadrage"
        title="Les questions utiles avant un devis ERP transport"
        description="Ces questions permettent d obtenir un chiffrage plus juste et plus comparable."
      >
        <ul className="grid gap-3">
          {commonQuestions.map(question => (
            <li key={question} className="rounded-[1.2rem] border border-slate-200/80 bg-white px-5 py-4 text-sm leading-7 text-[var(--site-text)]">
              {question}
            </li>
          ))}
        </ul>
      </SiteSection>

      <SiteSection
        eyebrow="Suite"
        title="Demander un tarif utile plutot qu un prix de facade"
        description="Un bon devis commence par un cadrage de l exploitation et par une demo du flux reel."
      >
        <div className="space-y-4 text-sm leading-7 text-[var(--site-text-secondary)] sm:text-base">
          <p>
            Si vous voulez cadrer un budget ERP transport, le plus simple est de partir d une{' '}
            <Link to="/demonstration" className={inlineLinkClassName}>
              demonstration
            </Link>{' '}
            puis de confronter la solution a vos cas concrets. Vous pouvez aussi lire le{' '}
            <Link to="/comparatif-erp-transport" className={inlineLinkClassName}>
              comparatif ERP transport
            </Link>{' '}
            pour structurer la comparaison.
          </p>
        </div>
      </SiteSection>
    </div>
  )
}
