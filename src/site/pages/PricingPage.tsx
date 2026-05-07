import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import { EVENTS, trackEvent, trackPageView } from '@/site/lib/analytics'

const inlineLinkClassName = 'font-semibold text-[#2563EB]'

const pricingFactors = [
  {
    title: 'Taille de flotte et nombre d utilisateurs',
    body: 'Le besoin ne se dimensionne pas pareil pour 8 vehicules et pour 80. Le prix depend du perimetre reel de pilotage.',
  },
  {
    title: 'Modules actives',
    body: 'Exploitation, planning, flotte, conformité, documents, finance ou intégrations n ont pas tous le même niveau de couverture.',
  },
  {
    title: 'Niveau d accompagnement',
    body: 'Un cadrage simple n a pas le meme effort qu une reprise de donnees, une configuration avancee ou un deploiement multi-equipes.',
  },
]

const commonQuestions = [
  'A partir de combien de chauffeurs la centralisation devient-elle rentable ?',
  'Quel volume de ressaisie voulez-vous supprimer entre exploitants et facturation ?',
  'La télématique et les contraintes conformité doivent-elles remonter dans le même flux ?',
  'Le projet vise-t-il seulement le dispatch ou une plateforme plus large de pilotage ?',
]

export default function PricingPage() {
  useSiteMeta({
    title: 'Tarifs ERP transport : comprendre le prix',
    description:
      'Tarifs ERP transport NEXORA Truck : comprendre comment se construit le prix selon la flotte, les modules, les intégrations et le niveau d accompagnement.',
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
          'Parce que le coût dépend du nombre d utilisateurs, du périmètre fonctionnel, des intégrations et du niveau d accompagnement nécessaire au déploiement.',
      },
      {
        question: 'Que faut-il comparer dans un tarif ERP transport ?',
        answer:
          'Il faut comparer le périmètre réel couvert: exploitation, planning, flotte, conducteurs, conformité, documents, facturation, ainsi que les ressaisies qui restent ou disparaissent.',
      },
      {
        question: 'Le moins cher est-il le plus rentable ?',
        answer:
          'Pas forcément. Une solution moins chère mais fragmentée peut coûter plus en coordination, erreurs et temps perdu qu un système mieux intégré.',
      },
    ],
  })

  useEffect(() => {
    trackPageView('/tarifs-erp-transport')
  }, [])

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

      {/* ── PLANS TARIFAIRES ── */}
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-10 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Formules</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[2.4rem] sm:leading-[1.06]">
          Trois niveaux d'accès à la plateforme
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--site-text-secondary)]">
          Chaque formule inclut l'onboarding, les mises à jour et l'hébergement RGPD Europe. Pas de frais cachés.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {/* Essentiel */}
          <article className="flex flex-col rounded-[1.8rem] border border-slate-200 bg-slate-50 p-7">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Essentiel</p>
            <p className="mt-4 text-[2.6rem] font-bold leading-none tracking-tight text-[var(--site-text)]">
              390 <span className="text-xl font-semibold text-slate-400">€ / mois</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">jusqu'à 20 véhicules · 5 utilisateurs</p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-700">
              {[
                'Planning & dispatch',
                'Gestion flotte et véhicules',
                'Dossiers conducteurs',
                'Facturation et bons de livraison',
                'Conformité de base (CT, VGP)',
                'Tableau de bord exploitation',
                'Support email sous 48h',
              ].map(f => (
                <li key={f} className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/demonstration"
              onClick={() => trackEvent(EVENTS.MARKETING_CTA_CLICK, { placement: 'pricing_essentiel', target: '/demonstration' })}
              className="mt-8 block rounded-xl border border-sky-700 bg-white px-5 py-3 text-center text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-50"
            >
              Demander un devis
            </Link>
          </article>

          {/* Opérateur — mis en avant */}
          <article className="relative flex flex-col rounded-[1.8rem] border-2 border-sky-600 bg-white p-7 shadow-[0_16px_48px_rgba(14,165,233,0.14)]">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-sky-600 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
              Le plus choisi
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">Opérateur</p>
            <p className="mt-4 text-[2.6rem] font-bold leading-none tracking-tight text-[var(--site-text)]">
              790 <span className="text-xl font-semibold text-slate-400">€ / mois</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">jusqu'à 80 véhicules · 20 utilisateurs</p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-700">
              {[
                'Tout Essentiel, plus :',
                'Planning groupage & tournées',
                'Module atelier / maintenance',
                'Carburant et TCO',
                'RH, absences et paie partielle',
                'Frais et notes de frais',
                'Portail client et affrété',
                'Comptabilité et trésorerie',
                'Support prioritaire sous 8h',
              ].map(f => (
                <li key={f} className={`flex items-start gap-2 ${f.endsWith(':') ? 'font-semibold text-slate-900' : ''}`}>
                  {!f.endsWith(':') && (
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  )}
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/demonstration"
              onClick={() => trackEvent(EVENTS.MARKETING_CTA_CLICK, { placement: 'pricing_operateur', target: '/demonstration' })}
              className="mt-8 block rounded-xl bg-sky-600 px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-sky-700"
            >
              Demander un devis
            </Link>
          </article>

          {/* Entreprise */}
          <article className="flex flex-col rounded-[1.8rem] border border-slate-200 bg-slate-50 p-7">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Entreprise</p>
            <p className="mt-4 text-[2.6rem] font-bold leading-none tracking-tight text-[var(--site-text)]">
              Sur devis
            </p>
            <p className="mt-1 text-sm text-slate-500">flotte &gt; 80 véhicules · utilisateurs illimités</p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-700">
              {[
                'Tout Opérateur, plus :',
                'Multi-dépôts / multi-entités',
                'Intégrations ERP / WMS / TMS tiers',
                'API publique documentée',
                'Webhooks configurables',
                'SSO SAML / LDAP',
                'SLA garanti 99,9 %',
                'Customer success dédié',
              ].map(f => (
                <li key={f} className={`flex items-start gap-2 ${f.endsWith(':') ? 'font-semibold text-slate-900' : ''}`}>
                  {!f.endsWith(':') && (
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  )}
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/contact"
              onClick={() => trackEvent(EVENTS.MARKETING_CTA_CLICK, { placement: 'pricing_entreprise', target: '/contact' })}
              className="mt-8 block rounded-xl border border-sky-700 bg-white px-5 py-3 text-center text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-50"
            >
              Nous contacter
            </Link>
          </article>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Tarifs HT. Engagement annuel. Essai gratuit 30 jours sans carte bancaire.{' '}
          <Link
            to="/demonstration"
            onClick={() => trackEvent(EVENTS.MARKETING_CTA_CLICK, { placement: 'pricing_footer_trial', target: '/demonstration' })}
            className="font-semibold text-sky-600 hover:underline"
          >
            Tester la plateforme →
          </Link>
        </p>
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
