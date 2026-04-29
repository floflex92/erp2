import { Link } from 'react-router-dom'
import FeatureCard from '@/site/components/FeatureCard'
import ProcessStepCard from '@/site/components/ProcessStepCard'
import SiteSection from '@/site/components/SiteSection'
import FrameDashboard from '@/site/components/frames/FrameDashboard'
import FramePlanning from '@/site/components/frames/FramePlanning'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import { coreCapabilities, platformModules, productPillars, workflowSteps } from '@/site/content'

export default function ProductPage() {
  useSiteMeta({
    title: 'Plateforme ERP transport pour PME',
    description:
      'Plateforme ERP transport NEXORA Truck pour centraliser exploitation, planning, flotte, conformite, documents et facturation dans un seul systeme.',
    canonicalPath: '/plateforme-erp-transport',
    keywords:
      'plateforme ERP transport, logiciel exploitation transport, ERP flotte transport, planning transport routier, logiciel transport',
  })

  return (
    <div className="space-y-8">
      <SiteSection
        eyebrow="Le produit"
        title="Une plateforme ERP transport pour piloter l'exploitation, la flotte et les equipes"
        headingLevel={1}
        description="NEXORA Truck centralise ce que les transporteurs routiers gerent souvent dans plusieurs outils: ordres de transport, planning, chauffeurs, flotte, conformite, documents et facturation. Dans un seul cockpit."
        actions={
          <>
            <Link to="/demonstration" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Voir le logiciel
            </Link>
            <Link to="/fonctionnalites" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-[var(--site-text)] hover:bg-white">
              Toutes les fonctionnalites
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

      <SiteSection
        eyebrow="Le logiciel en action"
        title="Deux vues qui concentrent la valeur quotidienne du produit"
        description="Voici a quoi ressemblent le cockpit exploitation et le planning conducteurs dans NEXORA Truck. Les donnees sont representees avec fidelite aux ecrans reels."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-slate-950 shadow-[0_22px_60px_rgba(15,23,42,0.16)]">
            <div className="border-b border-white/8 px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white">Dashboard exploitation</p>
            </div>
            <div className="p-4">
              <FrameDashboard />
            </div>
          </div>
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-slate-950 shadow-[0_22px_60px_rgba(15,23,42,0.16)]">
            <div className="border-b border-white/8 px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white">Planning flotte et conducteurs</p>
            </div>
            <div className="p-4">
              <FramePlanning />
            </div>
          </div>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Comment ca marche"
        title="Du transport commande a la livraison tracee"
        description="Trois etapes qui resumment le coeur du logiciel: de la creation de l'OT a son execution, en passant par le planning et la coordination terrain."
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
        description="Le produit est structure en quatre grandes zones: cockpit exploitation, planning ressources, conformite RH et ouverture financiere et API."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {platformModules.map(item => (
            <article key={item.title} className="rounded-[1.65rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#1d4ed8]">{item.meta}</p>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-[var(--site-text)]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--site-text-secondary)]">{item.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Modules"
        title="Ce que la plateforme couvre aujourd'hui"
        description="Les domaines suivants sont actifs ou en cours de developpement dans l'application."
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
