import { Link } from 'react-router-dom'
import FeatureCard from '@/site/components/FeatureCard'
import FrameDashboard from '@/site/components/frames/FrameDashboard'
import FramePlanning from '@/site/components/frames/FramePlanning'
import ProcessStepCard from '@/site/components/ProcessStepCard'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import { coreCapabilities, platformModules, productPillars, workflowSteps } from '@/site/content'

export default function ProductPage() {
  useSiteMeta({
    title: 'Produit',
    description: 'NEXORA Truck: ERP transport pour l exploitation, le planning, la flotte, la conformité et la traçabilité des missions. Socle actif et en évolution continue.',
  })

  return (
    <div className="space-y-8">
      <SiteSection
        eyebrow="Le produit"
        title="Un ERP transport pour piloter l exploitation, la flotte et les équipes"
        description="NEXORA Truck centralise ce que les transporteurs routiers gèrent en général dans plusieurs outils: ordres de transport, planning, chauffeurs, flotte, conformité, documents et facturation. Dans un seul cockpit."
        actions={
          <>
            <Link to="/demo" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Voir le logiciel
            </Link>
            <Link to="/fonctionnalites" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-white">
              Toutes les fonctionnalités
            </Link>
          </>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {productPillars.map(item => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </SiteSection>

      {/* Aperçu logiciel en contexte produit */}
      <SiteSection
        eyebrow="Le logiciel en action"
        title="Deux vues qui concentrent la valeur quotidienne du produit"
        description="Voici à quoi ressemble le cockpit exploitation et le planning conducteurs dans NEXORA Truck. Les données sont représentées avec fidélité aux écrans réels."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-slate-950 shadow-[0_22px_60px_rgba(15,23,42,0.16)]">
            <div className="border-b border-white/8 px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-200">Dashboard exploitation</p>
            </div>
            <div className="p-4">
              <FrameDashboard />
            </div>
          </div>
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-slate-950 shadow-[0_22px_60px_rgba(15,23,42,0.16)]">
            <div className="border-b border-white/8 px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-200">Planning flotte et conducteurs</p>
            </div>
            <div className="p-4">
              <FramePlanning />
            </div>
          </div>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Comment ça marche"
        title="Du transport commandé à la livraison tracée"
        description="Trois étapes qui résument le cœur du logiciel: de la création de l OT à son exécution, en passant par le planning et la coordination terrain."
        muted
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {workflowSteps.map(item => (
            <ProcessStepCard key={item.step} {...item} />
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Plateforme"
        title="Les quatre piliers du socle NEXORA Truck"
        description="Le produit est structuré en quatre grandes zones: cockpit exploitation, planning ressources, conformité RH et ouverture financière et API."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {platformModules.map(item => (
            <article key={item.title} className="rounded-[1.65rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">{item.meta}</p>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Modules"
        title="Ce que le produit couvre aujourd hui"
        description="Les domaines suivants sont actifs ou en cours de développement dans l application."
        muted
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {coreCapabilities.map(item => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </SiteSection>
    </div>
  )
}