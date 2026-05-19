import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const inlineLinkClassName = 'font-semibold text-[#2563EB]'

const pains = [
  'Les sous-traitants sont suivis par e-mail et téléphone : aucune traçabilité fiable sur les courses confiées.',
  'Le prix de revient de l\'affrètement n\'est pas confronté au tarif client facturé — la marge disparaît sans signal d\'alerte.',
  'L\'affréteur externe ne dispose d\'aucune visibilité temps réel sur l\'avancement des livraisons qu\'il supervise.',
  'La liasse documentaire (CMR, bon de livraison, confirmations) circule par e-mail et se perd régulièrement.',
]

const features = [
  {
    title: 'Carnet de sous-traitants centralisé',
    body: 'Référentiel transporteurs tiers avec agréments, tarifs négociés, historique de performance et documents réglementaires.',
  },
  {
    title: 'Commande d\'affrètement liée à l\'OT',
    body: 'Chaque course affrétée génère une commande rattachée à l\'ordre de transport. Le prix de revient est connu avant confirmation.',
  },
  {
    title: 'Portail affréteur intégré',
    body: 'Accès sécurisé pour que le sous-traitant confirme la prise en charge, met à jour le statut et dépose ses documents directement.',
  },
  {
    title: 'Traçabilité et alertes temps réel',
    body: 'Suivi de la progression des courses sous-traitées dans le même tableau de bord que les courses propres. Alertes sur retards.',
  },
  {
    title: 'Refacturation automatique',
    body: 'Le prix d\'achat de l\'affrètement est comparé au tarif de vente. La refacturation au client intègre la marge affrètement sans calcul manuel.',
  },
]

const relatedLinks = [
  { to: '/tms-transport', label: 'TMS transport', desc: 'Dispatch et suivi des ordres de transport' },
  { to: '/erp-transport', label: 'ERP transport', desc: 'Plateforme tout-en-un pour les transporteurs' },
  { to: '/logiciel-transport', label: 'Logiciel transport', desc: 'Critères de choix d\'un logiciel de transport opérationnel' },
  { to: '/facturation-transport', label: 'Facturation transport', desc: 'De l\'ordre de transport à la facture sans ressaisie' },
]

export default function AffretementTransportPage() {
  useSiteMeta({
    title: 'Affrètement transport : gérez vos sous-traitants depuis l\'ERP',
    description:
      'Gestion de l\'affrètement transport avec NEXORA Truck : carnet sous-traitants, commandes liées aux OT, portail affréteur, suivi temps réel et refacturation automatique.',
    canonicalPath: '/affretement-transport',
    keywords:
      'affrètement transport, gestion sous-traitants transport routier, logiciel affrètement transport, portail affréteur, suivi sous-traitance transport, TMS affrètement',
    ogType: 'article',
    author: 'NEXORA Truck',
    breadcrumbs: [{ name: 'Affrètement transport', path: '/affretement-transport' }],
    faqItems: [
      {
        question: "Comment g\u00e9rer l\u2019affrètement et la sous-traitance dans un ERP transport\u00a0?",
        answer: "En centralisant le carnet de sous-traitants, les commandes d\u2019affrètement et le suivi des livraisons dans le même outil que les courses propres. NEXORA Truck relie chaque commande sous-traitée \u00e0 l\u2019ordre de transport source\u00a0: prix d\u2019achat, statut et documents au même endroit.",
      },
      {
        question: "Qu\u2019est-ce qu\u2019un portail affréteur dans un logiciel transport\u00a0?",
        answer: "C\u2019est un acc\u00e8s sécurisé fourni au sous-traitant (transporteur tiers) pour qu\u2019il confirme la prise en charge, mette \u00e0 jour le statut de la livraison et d\u00e9pose ses documents (CMR, BL) sans passer par e-mail. Cela \u00e9limine les relances manuelles et centralise la traçabilité.",
      },
      {
        question: "Comment calculer la marge sur l\u2019affrètement transport\u00a0?",
        answer: "NEXORA Truck compare en temps r\u00e9el le prix d\u2019achat de la course sous-trait\u00e9e (confirm\u00e9 \u00e0 la commande) et le tarif facturable au client. La marge est visible avant confirmation de la commande d\u2019affrètement, ce qui permet de d\u00e9cider en connaissance de cause.",
      },
      {
        question: "Peut-on suivre les courses affrétées dans le même tableau de bord que les courses propres\u00a0?",
        answer: "Oui. Avec NEXORA Truck, toutes les missions \u2014 propres et sous-traitées \u2014 apparaissent dans un tableau de bord unique avec leur statut en temps r\u00e9el. Les alertes de retard s\u2019appliquent indiff\u00e9remment aux deux types.",
      },
    ],
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Page SEO secondaire</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          Affrètement transport : gérez vos sous-traitants depuis l'ERP
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--site-text-secondary)]">
          L'affrètement est incontournable dans le transport routier moderne — mais pour beaucoup d'exploitations, il reste géré par e-mail, téléphone et tableur.
          NEXORA Truck intègre la gestion de l'affrètement directement dans le <Link to="/tms-transport" className={inlineLinkClassName}>TMS</Link> :
          commandes liées aux ordres de transport, suivi temps réel depuis le portail affréteur et refacturation automatique au client.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/connexion-erp" className="site-btn-primary px-5 py-3 text-sm transition-colors">
            Tester gratuitement
          </Link>
          <Link to="/demonstration" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-[var(--site-text)] hover:bg-white">
            Voir la démo
          </Link>
        </div>
      </section>

      <SiteSection
        eyebrow="Problèmes courants"
        title="Pourquoi l'affrètement devient incontrôlable sans outil dédié"
      >
        <ul className="mt-6 space-y-4">
          {pains.map((pain, i) => (
            <li key={i} className="flex items-start gap-3 text-base leading-7 text-[var(--site-text-secondary)]">
              <span className="mt-1 h-5 w-5 shrink-0 rounded-full bg-red-50 text-center text-xs font-bold leading-5 text-red-600">✕</span>
              {pain}
            </li>
          ))}
        </ul>
      </SiteSection>

      <SiteSection
        eyebrow="Fonctionnalités"
        title="Affrètement intégré au TMS et à la facturation"
      >
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(f => (
            <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-[var(--site-text)]">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--site-text-secondary)]">{f.body}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Résultats observés"
        title="L'impact sur l'exploitation et les marges"
      >
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            { kpi: '100 %', label: 'de traçabilité sous-traitants', detail: 'statut, documents et historique dans un seul outil' },
            { kpi: '-4 h', label: 'de gestion par semaine', detail: 'grâce à l\'élimination des relances e-mail et des ressaisies' },
            { kpi: '+3 %', label: 'de marge affrètement visible', detail: 'calcul automatique prix d\'achat vs. tarif client avant confirmation' },
          ].map(({ kpi, label, detail }) => (
            <div key={kpi} className="rounded-2xl bg-sky-50 p-6 text-center">
              <p className="text-3xl font-bold text-sky-700">{kpi}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--site-text)]">{label}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--site-text-secondary)]">{detail}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      <SiteSection eyebrow="Voir aussi" title="Pages liées">
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {relatedLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--site-text)]">{l.label}</p>
                <p className="text-xs text-[var(--site-text-secondary)]">{l.desc}</p>
              </div>
              <svg className="h-4 w-4 text-[var(--site-text-secondary)]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 5l5 5-5 5"/></svg>
            </Link>
          ))}
        </div>
      </SiteSection>
    </div>
  )
}
