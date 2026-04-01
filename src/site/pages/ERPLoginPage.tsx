import { Link } from 'react-router-dom'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const entryPoints = [
  {
    title: 'Connexion sécurisée',
    body: 'Accès à l interface métier avec authentification existante, sans duplication de logique dans la partie publique.',
  },
  {
    title: 'Séparation claire',
    body: 'Les pages publiques restent hors du layout ERP et hors des routes protégées. L application métier conserve ses contrôles d accès.',
  },
  {
    title: 'Évolution simple',
    body: 'Cette page peut ensuite accueillir des informations d accès, du support ou des parcours différenciés selon les profils.',
  },
] as const

export default function ERPLoginPage() {
  useSiteMeta({
    title: 'Connexion ERP',
    description: 'Passer du site public NEXORA Truck à l interface ERP existante, avec une séparation claire entre vitrine commerciale et application métier.',
  })

  return (
    <div className="space-y-8">
      <SiteSection
        eyebrow="Connexion ERP"
        title="Passer du site public à l application métier sans confusion"
        description="Comme sur quicklify, il faut une entrée propre vers la plateforme. Ici elle mène à l écran de connexion existant, sans dupliquer la logique d auth ni brouiller la séparation public / ERP."
        actions={
          <Link to="/login" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Ouvrir la connexion
          </Link>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {entryPoints.map(point => (
            <article key={point.title} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">{point.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{point.body}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Séparation"
        title="Ce que la page garantit techniquement"
        description="Le site public reste autonome dans sa présentation, pendant que l ERP conserve ses layouts, ses protections et ses parcours internes existants."
        muted
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-[1.55rem] border border-slate-200/80 bg-white p-6">
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">Routes publiques distinctes</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">La vitrine vit hors du layout authentifié et n intercepte pas les routes métier existantes.</p>
          </article>
          <article className="rounded-[1.55rem] border border-slate-200/80 bg-white p-6">
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">Entrée ERP stable</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">Le bouton public renvoie simplement vers l écran de connexion existant de l ERP.</p>
          </article>
          <article className="rounded-[1.55rem] border border-slate-200/80 bg-white p-6">
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">Évolution maintenable</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">Le header public peut ensuite s enrichir selon l état de session, sans casser la logique d authentification.</p>
          </article>
        </div>
      </SiteSection>
    </div>
  )
}