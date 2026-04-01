import { Link } from 'react-router-dom'
import LegalHero from '@/site/components/LegalHero'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const LAST_UPDATE = '31 mars 2026'

const cguPrinciples = [
  'Le site public presente l offre, les fonctionnalites, les contenus d information et les modalites de contact de NEXORA Truck.',
  'La plateforme ERP est reservee aux utilisateurs autorises et peut faire l objet de limitations d acces selon les habilitations attribuees.',
  'Toute utilisation du site ou de la plateforme doit demeurer licite, loyale et compatible avec la securite generale du service.',
] as const

const prohibitedUses = [
  'Tenter de contourner les mecanismes d authentification, de securite, de controle d acces ou de journalisation.',
  'Extraire, copier, reutiliser ou redistribuer sans autorisation des contenus, donnees, maquettes, documentations ou elements du produit.',
  'Utiliser le site ou la plateforme pour diffuser un contenu illicite, trompeur, malveillant, diffamatoire ou portant atteinte aux droits de tiers.',
] as const

export default function TermsOfUsePage() {
  useSiteMeta({
    title: 'Conditions generales d utilisation',
    description: 'Consultez les conditions generales d utilisation du site public et de la plateforme NEXORA Truck.',
    canonicalPath: '/conditions-generales-utilisation',
    keywords: 'CGU, conditions generales d utilisation, NEXORA Truck, ERP transport',
  })

  return (
    <div className="space-y-8">
      <LegalHero
        eyebrow="CGU"
        title="Conditions generales d utilisation du site et de la plateforme NEXORA Truck"
        description="Les presentes conditions encadrent l acces au site public, aux formulaires de contact et, le cas echeant, a la plateforme ERP accessible aux utilisateurs habilites. Elles definissent les regles generales applicables a l utilisation du service."
        lastUpdate={LAST_UPDATE}
        highlights={['Acces', 'Usages autorises', 'Responsabilites']}
      />

      <SiteSection
        eyebrow="Objet"
        title="Un cadre d utilisation simple et clair"
        description="Ces conditions precisent les regles generales d acces, d utilisation et de responsabilite applicables au site et a la plateforme."
      >
        <div className="grid gap-3">
          {cguPrinciples.map(item => (
            <div key={item} className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Acces"
        title="Disponibilite et acces au service"
        description="L editeur s efforce d assurer un acces normal au site et a la plateforme, sous reserve des operations techniques necessaires."
        muted
      >
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.45rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Site public</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Le site public est accessible librement. Certaines rubriques peuvent toutefois etre temporairement indisponibles pour des raisons de maintenance, de securisation, de mise a jour ou d evolution technique.
            </p>
          </article>
          <article className="rounded-[1.45rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Plateforme ERP</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              La plateforme ERP est reservee aux utilisateurs disposant d un compte actif et de droits d acces adaptes. L editeur peut suspendre, restreindre ou desactiver un acces en cas d anomalie, de suspicion d usage abusif ou de non-respect des presentes conditions.
            </p>
          </article>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Usages interdits"
        title="Ce qui n est pas autorise"
        description="Tout usage portant atteinte a l integrite du service, aux droits de l editeur ou aux droits de tiers est prohibe."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {prohibitedUses.map(item => (
            <article key={item} className="rounded-[1.45rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
              <p className="text-sm leading-7 text-slate-700">{item}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Responsabilites"
        title="Limites et obligations de chacun"
        description="L editeur fournit un environnement numerique evolutif, mais l utilisateur conserve une part de responsabilite dans la verification et l usage des informations."
        muted
      >
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.45rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Engagement de l editeur</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              L editeur met en oeuvre des moyens raisonnables pour assurer la disponibilite, la securite et la coherence generale du service, sans pouvoir garantir une absence totale d interruption, d indisponibilite ou d erreur.
            </p>
          </article>
          <article className="rounded-[1.45rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Engagement de l utilisateur</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              L utilisateur s engage a proteger ses identifiants, a verifier les informations critiques avant toute decision operationnelle et a utiliser le service conformement a sa destination, aux droits qui lui sont attribues et aux lois applicables.
            </p>
          </article>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Cadre juridique"
        title="Droit applicable"
        description="Les presentes conditions sont soumises au droit francais, sous reserve des dispositions imperatives applicables."
      >
        <div className="rounded-[1.45rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
          <p className="text-sm leading-7 text-slate-700">
            En cas de question relative a l interpretation ou a l application des presentes conditions, vous pouvez prendre contact avec l editeur via la page contact ou consulter les documents juridiques complementaires du site.
          </p>
        </div>
      </SiteSection>

      <section className="rounded-[1.8rem] border border-slate-200 bg-slate-950 p-7 text-white sm:p-9">
        <h2 className="text-3xl font-semibold tracking-tight">Documents lies</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
          Pour une lecture complete du cadre legal, consultez egalement les mentions legales et la politique de confidentialite de NEXORA Truck.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/mentions-legales-public" className="rounded-full bg-[#fb923c] px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-[#fdba74]">
            Mentions legales
          </Link>
          <Link to="/politique-confidentialite" className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
            Politique de confidentialite
          </Link>
        </div>
      </section>
    </div>
  )
}