import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const principles = [
  {
    title: 'Terrain first',
    body: 'Chaque fonctionnalité est pensée depuis les contraintes réelles des exploitants, planificateurs et dirigeants transport.',
  },
  {
    title: 'Clarté opérationnelle',
    body: 'L information critique doit être visible immédiatement pour réduire les angles morts et accélérer la décision.',
  },
  {
    title: 'Technologie utile',
    body: 'L innovation n a de valeur que si elle simplifie le quotidien et améliore la rentabilité des entreprises.',
  },
] as const

const pressAssets = [
  'Présentation institutionnelle NEXORA Truck (PDF)',
  'Kit média logo et captures produit',
  'Communiqué vision marché transport francophone',
  'Contact presse et partenariats sectoriels',
] as const

export default function AboutPage() {
  useSiteMeta({
    title: 'À Propos NEXORA Truck',
    description: 'Découvrez l histoire, la vision et l expertise NEXORA Truck pour moderniser durablement le transport routier dans l espace francophone.',
    canonicalPath: '/a-propos',
    keywords: 'à propos Nexora Truck, startup transport Marseille, vision ERP transport, modernisation transport routier',
  })

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-[#dbeafe] bg-[linear-gradient(140deg,#ffffff_0%,#eff6ff_55%,#e0f2fe_100%)] p-7 shadow-[0_24px_80px_rgba(30,64,175,0.14)] sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#1d4ed8]">À propos</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-[3.05rem] sm:leading-[1.06]">
          Construire depuis Marseille la référence technologique du transport francophone
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700">
          NEXORA Truck naît d une conviction forte: les transporteurs méritent un système d exploitation moderne, unifié et
          orienté résultat. Notre mission est d offrir une plateforme qui simplifie la complexité quotidienne sans sacrifier la profondeur métier.
        </p>
      </section>

      <SiteSection
        eyebrow="Vision"
        title="Une approche humaine et technologique"
        description="Nous développons un produit robuste, mais aussi une relation durable avec les équipes terrain."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {principles.map(item => (
            <article key={item.title} className="rounded-[1.45rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Espace presse"
        title="Ressources pour partenaires, médias et événements"
        description="Un point d accès unique pour valoriser NEXORA Truck dans vos communications sectorielles."
        muted
      >
        <div className="grid gap-3">
          {pressAssets.map(item => (
            <div key={item} className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </SiteSection>

      <section className="rounded-[1.8rem] border border-slate-200 bg-slate-950 p-7 text-white sm:p-9">
        <h2 className="text-3xl font-semibold tracking-tight">Parlons de votre feuille de route digitale transport</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
          Nous préparons avec vous une trajectoire réaliste: quick wins opérationnels, montée en puissance planning, puis extension progressive des modules.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/contact" className="rounded-full bg-[#fb923c] px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-[#fdba74]">
            Contacter l équipe
          </Link>
          <Link to="/solution" className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
            Revoir la solution
          </Link>
        </div>
      </section>
    </div>
  )
}
