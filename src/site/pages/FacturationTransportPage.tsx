import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const inlineLinkClassName = 'font-semibold text-[#2563EB]'

const pains = [
  'Les ordres de transport clôturés ne génèrent pas automatiquement les factures : chaque bon de livraison est retranscrit manuellement.',
  'Les tarifs contractuels varient par client mais ne sont nulle part centralisés — chaque facture demande une vérification.',
  'Les avoirs et litiges allongent les délais de paiement et coupent la visibilité sur la trésorerie réelle.',
  'L\'export comptable est un export Excel re-saisi dans le logiciel comptable : double saisie systématique.',
]

const features = [
  {
    title: 'Facturation depuis l\'ordre de transport',
    body: 'Chaque OT clôturé génère automatiquement un brouillon de facture avec les tarifs contractuels du client. Zéro retranscription.',
  },
  {
    title: 'Tarification client centralisée',
    body: 'Grilles tarifaires par client, par type de course, par zone ou par tonnage. La facture applique les bons tarifs sans vérification manuelle.',
  },
  {
    title: 'Gestion des avoirs et litiges',
    body: 'Avoir en un clic depuis la facture émise. Suivi du litige attaché à l\'ordre de transport pour garder le contexte.',
  },
  {
    title: 'Export comptable direct',
    body: 'Export paramétrable vers Sage, EBP, Ciel ou votre outil comptable. Les écritures sont prêtes sans ressaisie.',
  },
  {
    title: 'Suivi des encaissements',
    body: 'Tableau de bord des factures émises, payées, en retard et en litige. Relances automatiques configurables par délai.',
  },
]

const relatedLinks = [
  { to: '/erp-transport', label: 'ERP transport', desc: 'Vue complète de la plateforme tout-en-un' },
  { to: '/tms-transport', label: 'TMS transport', desc: 'Dispatch et suivi des ordres de transport' },
  { to: '/logiciel-transport', label: 'Logiciel transport', desc: 'Comment choisir un logiciel transport opérationnel' },
  { to: '/avantages-roi', label: 'ROI ERP transport', desc: 'Les gains concrets pour les transporteurs routiers' },
]

export default function FacturationTransportPage() {
  useSiteMeta({
    title: 'Facturation transport : de l\'ordre de transport à la facture sans ressaisie',
    description:
      'Facturation ERP transport NEXORA Truck : génération automatique depuis les OT, tarification client centralisée, export comptable et suivi des encaissements sans double saisie.',
    canonicalPath: '/facturation-transport',
    keywords:
      'facturation transport, logiciel facturation transport routier, facturation ERP transport, automatisation facturation transport, gestion avoirs transport, export comptable transport',
    ogType: 'article',
    author: 'NEXORA Truck',
    breadcrumbs: [{ name: 'Facturation transport', path: '/facturation-transport' }],
    faqItems: [
      {
        question: "Comment automatiser la facturation dans le transport routier\u00a0?",
        answer: "En reliant directement les ordres de transport au module facturation\u00a0: chaque OT cl\u00f4tur\u00e9 g\u00e9n\u00e8re un brouillon de facture avec les tarifs contractuels du client. NEXORA Truck \u00e9limine la retranscription manuelle et divise par 3 le temps de facturation.",
      },
      {
        question: "Quelle diff\u00e9rence entre un logiciel TMS et un logiciel de facturation transport\u00a0?",
        answer: "Un TMS g\u00e8re les ordres de transport et le dispatch. Un logiciel de facturation transport prend le relais \u00e0 la cl\u00f4ture de la mission pour \u00e9mettre les factures, suivre les paiements et g\u00e9rer les avoirs. NEXORA Truck int\u00e8gre les deux dans un flux unique.",
      },
      {
        question: "Comment g\u00e9rer les litiges de facturation dans le transport\u00a0?",
        answer: "Avec NEXORA Truck, un avoir est cr\u00e9\u00e9 en un clic depuis la facture concern\u00e9e. Le litige reste attach\u00e9 \u00e0 l\u2019ordre de transport pour conserver le contexte complet\u00a0: mission, conducteur, client et montant dispute.",
      },
      {
        question: "Peut-on exporter les factures transport vers un logiciel comptable\u00a0?",
        answer: "Oui. NEXORA Truck propose un export comptable param\u00e9trable vers Sage, EBP, Ciel et d\u2019autres logiciels. Les \u00e9critures sont pr\u00eates sans ressaisie\u00a0; le format d\u2019export est configurable selon le plan comptable de l\u2019entreprise.",
      },
    ],
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Page SEO secondaire</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--site-text)] sm:text-[3.2rem] sm:leading-[1.04]">
          Facturation transport : de l'ordre de transport à la facture sans ressaisie
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--site-text-secondary)]">
          Dans la plupart des exploitations, la facturation reste le maillon faible : les ordres de transport clôturés s'accumulent, chaque facture est retranscrite manuellement, et l'écart entre la livraison et l'encaissement frôle les 15 jours.
          NEXORA Truck relie directement l'<Link to="/tms-transport" className={inlineLinkClassName}>ordre de transport</Link> à la facturation —
          le brouillon est prêt dès la clôture, avec les tarifs contractuels du client, sans aucune ressaisie.
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
        title="Pourquoi la facturation transport prend autant de temps"
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
        title="Facturation intégrée à l'exploitation"
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
        title="Ce que ça change concrètement"
      >
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            { kpi: '-60 %', label: 'de temps de facturation', detail: 'vs. traitement manuel depuis les bons de livraison' },
            { kpi: '-8 j', label: 'de délai de paiement moyen', detail: 'grâce aux relances automatiques et à la rapidité d\'émission' },
            { kpi: '0 ressaisie', label: 'entre TMS et comptabilité', detail: 'l\'export comptable alimente directement le logiciel comptable' },
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
