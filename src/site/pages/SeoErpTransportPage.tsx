import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const mainKeywords = [
  'ERP transport routier',
  'logiciel transport',
  'TMS transport',
  'gestion flotte camions',
  'planning chauffeurs',
  'suivi livraison en temps réel',
  'gestion exploitation transport',
]

const targetQueries = [
  'Quel ERP choisir pour une entreprise de transport routier ?',
  'Comment centraliser planning, flotte, chauffeurs et facturation ?',
  'Quel logiciel transport pour suivre les courses en temps réel ?',
  'Comment limiter la ressaisie entre exploitation et facturation ?',
]

const seoFaq = [
  {
    q: 'À quoi sert un ERP transport pour une PME de transport routier ?',
    a: 'Un ERP transport permet de centraliser l exploitation quotidienne: ordres de transport, planning, affectations chauffeurs, flotte, documents, conformite et facturation. L objectif est de reduire les doubles saisies et d accelerer les decisions.',
  },
  {
    q: 'Quelle différence entre un TMS et un ERP transport ?',
    a: 'Un TMS couvre souvent le pilotage transport. Un ERP transport va plus loin en reliant aussi RH, conformite, documents et suivi financier dans un meme socle. Cela evite de multiplier les outils non relies.',
  },
  {
    q: 'Le logiciel convient-il à une exploitation avec groupage et affretement ?',
    a: 'Oui. Le socle NEXORA Truck couvre la gestion des courses et du planning, avec une feuille de route orientee groupage multi-courses et espaces dedies comme l espace affreteur.',
  },
  {
    q: 'Comment améliorer le suivi des livraisons et des statuts client ?',
    a: 'Le suivi temps reel des statuts, alertes et preuves de livraison aide a fiabiliser la communication interne et client. Les donnees restent dans le meme outil pour conserver une trace exploitable.',
  },
]

export default function SeoErpTransportPage() {
  useSiteMeta({
    title: 'ERP transport routier et logiciel TMS',
    description:
      'Page SEO NEXORA Truck: ERP transport routier pour exploitation, planning chauffeurs, flotte, conformite et facturation. Comparez les usages et identifiez le bon logiciel transport.',
    canonicalPath: '/erp-transport-tms',
    keywords: mainKeywords.join(', '),
    ogType: 'article',
  })

  useEffect(() => {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: seoFaq.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'seo-faq-jsonld'
    script.text = JSON.stringify(structuredData)
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  return (
    <div className="space-y-8">
      <section className="rounded-[2.2rem] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(240,249,255,0.94))] px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-800">Guide SEO métier</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-[3.2rem] sm:leading-[1.04]">
          ERP transport routier: comment choisir un logiciel vraiment utile à l exploitation
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
          Cette page répond aux recherches les plus fréquentes autour des mots-clés ERP transport, logiciel transport et TMS transport. L objectif est simple: donner des critères concrets pour choisir une plateforme qui relie terrain, planning, conformité et pilotage financier.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {mainKeywords.map(keyword => (
            <span key={keyword} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-900">
              {keyword}
            </span>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/solution" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Voir la vision produit
          </Link>
          <Link to="/demonstration" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-white">
            Demander une démonstration
          </Link>
        </div>
      </section>

      <SiteSection
        eyebrow="Intentions de recherche"
        title="Les questions que les transporteurs posent vraiment à Google"
        description="Les requêtes ci-dessous correspondent aux besoins opérationnels d une entreprise de transport qui veut mieux piloter son activité."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {targetQueries.map(query => (
            <article key={query} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">{query}</h2>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Choisir un logiciel"
        title="7 critères SEO + métier pour choisir un ERP transport"
        description="Une bonne page SEO doit aussi apporter de la valeur réelle. Cette grille vous aide à évaluer rapidement un logiciel transport."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-[1.6rem] border border-slate-200/80 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">1. Couverture exploitation</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">Ordres de transport, statuts, alertes et priorisation doivent etre visibles dans une lecture unique.</p>
          </article>
          <article className="rounded-[1.6rem] border border-slate-200/80 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">2. Planning et affectations</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">Le planning flotte/chauffeurs doit rester relie a la realite des courses et non dans un outil separe.</p>
          </article>
          <article className="rounded-[1.6rem] border border-slate-200/80 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">3. Conformite transport</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">Tachygraphe, documents, amendes, suivi RH et obligations reglementaires doivent etre traces.</p>
          </article>
          <article className="rounded-[1.6rem] border border-slate-200/80 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">4. Trace de livraison</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">Chaque mission doit laisser une preuve exploitable pour le client, l exploitation et la facturation.</p>
          </article>
          <article className="rounded-[1.6rem] border border-slate-200/80 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">5. Continuite finance</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">Le passage execution vers facturation doit limiter les ressaisies et fiabiliser les marges.</p>
          </article>
          <article className="rounded-[1.6rem] border border-slate-200/80 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-950">6. Evolutivite API</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">Portails clients, interconnexions et automatismes doivent etre prevus sans refondre le socle.</p>
          </article>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="FAQ SEO"
        title="Questions fréquentes sur ERP transport et TMS"
        description="Un format FAQ bien structuré aide les utilisateurs et renforce la pertinence sémantique de la page."
        muted
      >
        <div className="space-y-4">
          {seoFaq.map(item => (
            <article key={item.q} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">{item.q}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.a}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <section className="rounded-[2rem] border border-white/70 bg-[linear-gradient(145deg,#0f172a,#111827)] px-6 py-8 text-white shadow-[0_28px_80px_rgba(15,23,42,0.2)] sm:px-8 sm:py-10">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-[2.45rem]">Aller plus loin sur votre cas transport</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
          Si vous cherchez un ERP transport pour structurer l exploitation et fluidifier la communication entre équipes, la meilleure étape reste une démonstration basée sur vos contraintes réelles.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/contact" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100">
            Contacter l équipe
          </Link>
          <Link to="/planning-intelligent" className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
            Découvrir le planning intelligent
          </Link>
        </div>
      </section>
    </div>
  )
}
