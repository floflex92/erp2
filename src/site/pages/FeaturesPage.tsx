import SiteSection from '@/site/components/SiteSection'
import FeatureCard from '@/site/components/FeatureCard'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import { coreCapabilities, featureStages, roleViews } from '@/site/content'

const extraFeatures = [
  {
    tag: 'Conducteurs',
    title: 'Pilotage des profils, disponibilites et contraintes',
    body: 'Le logiciel relie la ressource humaine aux besoins terrain: affectations, suivi et responsabilites restent visibles au bon endroit.',
  },
  {
    tag: 'Temps reel',
    title: 'Statuts, communication et suivi operationnel',
    body: 'Les equipes disposent d un suivi vivant pour eviter les angles morts entre exploitation, communication et execution.',
  },
  {
    tag: 'API',
    title: 'Connexion aux ecosystemes existants',
    body: 'La structure du projet laisse la place a des integrations dediees pour portails, connecteurs ou automatisations futures.',
  },
] as const

export default function FeaturesPage() {
  useSiteMeta({
    title: 'Fonctionnalités',
    description: 'Fonctionnalités NEXORA Truck: exploitation, courses, planning, flotte, conducteurs, RH, conformité, facturation, API et temps réel.',
  })

  return (
    <div className="space-y-8">
      <SiteSection
        eyebrow="Fonctionnalités"
        title="Fonctionnalités mises en avant sans brouiller le cœur ERP"
        description="La page prend la structure d une grille de preuves. On y lit les grands blocs fonctionnels du produit, sans entrer dans les droits, les ecrans ou les cas limites internes."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {coreCapabilities.map(item => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Lectures métier"
        title="Le même socle peut être lu différemment selon le profil"
        description="Au lieu d empiler des arguments, cette section sert à montrer les angles d entrée les plus utiles pour les profils cibles du transport."
        muted
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {roleViews.map(item => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Extensions"
        title="Interfaces, temps réel et évolutions prévues"
        description="La vitrine reserve une place claire aux sujets structurants de la suite: API, communication inter-systemes et demonstrations logicielles enrichies."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {extraFeatures.map(item => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Statut"
        title="Fonctionnalités développées, chantiers en cours et feuille de route"
        description="Cette lecture sert à distinguer ce qui est déjà exploitable, ce qui se construit actuellement et les extensions prévues à plus fort levier."
        muted
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {featureStages.map(stage => (
            <article key={stage.title} className="rounded-[1.6rem] border border-slate-200/80 bg-white p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-700">{stage.eyebrow}</p>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">{stage.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{stage.body}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {stage.items.map(item => (
                  <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </SiteSection>
    </div>
  )
}