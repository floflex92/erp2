import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import {
  developedCatalogFeatures,
  inProgressCatalogFeatures,
  upcomingCatalogFeatures,
  type CatalogFeature,
} from '@/lib/featuresCatalog'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(80px, 12vw, 160px)' }

const developedFeatures = developedCatalogFeatures
const inProgressFeatures = inProgressCatalogFeatures
const upcomingFeatures = upcomingCatalogFeatures

function FeatureList({ items }: { items: readonly CatalogFeature[] }) {
  const byCategory = items.reduce<Map<string, CatalogFeature[]>>((acc, item) => {
    const key = item.categorie || 'Autres'
    const list = acc.get(key) ?? []
    list.push(item)
    acc.set(key, list)
    return acc
  }, new Map())

  const categories = Array.from(byCategory.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'fr'))

  if (!categories.length) {
    return <p className="mt-8" style={{ color: '#6E6E73' }}>Aucune fonctionnalité publiée pour cette section.</p>
  }

  return (
    <div className="mt-8 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
      {categories.map(([category, features]) => (
        <div key={category} className="rounded-2xl border p-4 sm:p-5 transition-shadow duration-150 hover:shadow-sm" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#2563EB' }}>
            {category} <span style={{ color: '#6E6E73' }}>• {features.length}</span>
          </p>
          <ul className="mt-3 space-y-3">
            {features.map(item => (
              <li
                key={`${item.categorie}-${item.fonctionnalite}`}
                className="text-sm leading-5"
                style={{ color: '#1D1D1F' }}
              >
                <span style={{ color: '#6E6E73' }}>— </span>{item.fonctionnalite}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function StatusSection({
  eyebrow,
  count,
  background,
  items,
}: {
  eyebrow: string
  count: number
  background: string
  items: readonly CatalogFeature[]
}) {
  return (
    <section className="w-full" style={{ background, ...sectionPx, ...sectionPy }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#606065' }}>{eyebrow}</p>
        <div className="rounded-full border px-4 py-2 text-sm font-semibold" style={{ borderColor: '#BFDBFE', color: '#1D4ED8', background: '#EFF6FF' }}>
          {count} fonctionnalités
        </div>
      </div>
      <FeatureList items={items} />
    </section>
  )
}

export default function AllFeaturesPage() {
  useSiteMeta({
    title: 'Toutes les fonctionnalités ERP transport NEXORA',
    description: 'Vue complète des fonctionnalités NEXORA Truck: disponibles, en cours de développement et prochaines features.',
    canonicalPath: '/toutes-les-fonctionnalites',
    keywords: 'toutes les fonctionnalités transport, roadmap ERP transport, fonctionnalités en cours de développement',
  })

  return (
    <>
      <section className="relative flex min-h-[60vh] w-full flex-col items-center justify-center overflow-hidden text-center" style={{ ...sectionPx, ...sectionPy }}>
        <img
          src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt="Equipe produit et exploitation en atelier de travail sur les fonctionnalites"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.7)' }}>Roadmap produit</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]" style={{ fontSize: 'clamp(2.2rem, 6vw, 4.5rem)', color: '#FFFFFF', letterSpacing: '-0.025em' }}>
            Plus de 80 fonctionnalités pour piloter votre exploitation transport.
          </h1>
          <p className="mt-4 text-xl font-semibold" style={{ color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.01em' }}>
            Et une plateforme conçue pour évoluer.
          </p>
          <p className="mx-auto mt-5 max-w-2xl" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px', lineHeight: 1.65 }}>
            NEXORA centralise l’ensemble des opérations transport et évolue vers un système connecté et intelligent.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/fonctionnalites" className="site-btn-primary px-6 py-3 text-sm transition-colors">Retour page fonctionnalités</Link>
            <Link to="/contact" className="text-sm font-semibold" style={{ color: '#93C5FD' }}>Échanger avec l'équipe produit</Link>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border px-4 py-3 text-left" style={{ borderColor: '#E5E7EB', background: 'rgba(255,255,255,0.92)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#64748B' }}>Développé</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: '#0F172A' }}>{developedFeatures.length}</p>
            </div>
            <div className="rounded-xl border px-4 py-3 text-left" style={{ borderColor: '#E5E7EB', background: 'rgba(255,255,255,0.92)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#64748B' }}>En cours</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: '#0F172A' }}>{inProgressFeatures.length}</p>
            </div>
            <div className="rounded-xl border px-4 py-3 text-left" style={{ borderColor: '#E5E7EB', background: 'rgba(255,255,255,0.92)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#64748B' }}>Features</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: '#0F172A' }}>{upcomingFeatures.length}</p>
            </div>
          </div>
        </div>
      </section>

      <StatusSection
        eyebrow="Disponibles"
        count={developedFeatures.length}
        background="#F5F5F7"
        items={developedFeatures}
      />

      <StatusSection
        eyebrow="En cours"
        count={inProgressFeatures.length}
        background="#FFFFFF"
        items={inProgressFeatures}
      />

      <StatusSection
        eyebrow="Prochaines"
        count={upcomingFeatures.length}
        background="#F5F5F7"
        items={upcomingFeatures}
      />

      <section className="w-full" style={{ background: '#EFF6FF', ...sectionPx, paddingBlock: 'clamp(80px, 10vw, 128px)' }}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#1D4ED8' }}>Vision produit</p>
            <h2 className="mt-2 text-xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.015em' }}>Évolution de la plateforme</h2>
          </div>
        </div>
        <p className="mt-4 text-sm" style={{ color: '#606065' }}>Une base solide conçue pour évoluer vers une plateforme complète du transport.</p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            'ERP opérationnel complet',
            'Automatisation des flux',
            'Intégration API',
            'Intelligence et optimisation',
          ].map(item => (
            <div key={item} className="rounded-2xl border px-5 py-4 transition-shadow duration-150 hover:shadow-sm" style={{ borderColor: '#BFDBFE', background: '#FFFFFF' }}>
              <p className="text-sm font-medium leading-5" style={{ color: '#0F172A' }}>{item}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
