import { Link } from 'react-router-dom'
import LegalHero from '@/site/components/LegalHero'
import SiteSection from '@/site/components/SiteSection'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const contactEmail = 'contact@nexora-truck.fr'
const LAST_UPDATE = '31 mars 2026'

const collectedData = [
  'Informations de contact transmises via les formulaires publics: nom, adresse email, numero de telephone, societe et message.',
  'Informations de navigation strictement necessaires au bon fonctionnement technique du site et a la mesure technique de son audience.',
  'Donnees operationnelles saisies dans la plateforme ERP par les utilisateurs autorises, dans la limite de leurs droits d acces.',
] as const

const purposes = [
  'Repondre aux demandes entrantes, organiser une demonstration du produit et assurer un suivi commercial proportionne.',
  'Assurer le fonctionnement, la securite, la maintenance et l amelioration continue du site et de la plateforme.',
  'Permettre l exploitation metier de l ERP transport pour les structures utilisatrices autorisees.',
] as const

const cookieTypes = [
  'Cookies et stockages strictement necessaires au fonctionnement technique, a la navigation et a la securisation du site.',
  'Stockages locaux de preferences pour memoriser certains choix utilisateur, comme la fermeture du bandeau cookies.',
  'Eventuels outils de mesure technique d audience, dans la limite des integrations effectivement actives sur le site.',
] as const

const rights = [
  'Droit d acces a vos donnees.',
  'Droit de rectification des informations inexactes.',
  'Droit d opposition ou de limitation lorsque la loi le permet.',
  'Droit a l effacement des donnees lorsque leur conservation n est plus necessaire ou lorsqu une obligation legale ne s y oppose pas.',
] as const

export default function PrivacyPolicyPage() {
  useSiteMeta({
    title: 'Politique de confidentialite',
    description: 'Consultez la politique de confidentialite du site et de la plateforme NEXORA Truck: donnees collecte es, finalites, durees de conservation et droits des personnes.',
    canonicalPath: '/politique-confidentialite',
    keywords: 'politique de confidentialite, RGPD, donnees personnelles, NEXORA Truck, ERP transport',
  })

  return (
    <div className="space-y-8">
      <LegalHero
        eyebrow="Confidentialite"
        title="Politique de confidentialite du site et de la plateforme NEXORA Truck"
        description="Cette page precise quelles donnees peuvent etre collecte es lors de l utilisation du site public et de la plateforme, dans quel objectif elles sont traitees, pendant combien de temps elles peuvent etre conservees et selon quelles modalites vos droits peuvent etre exerces."
        lastUpdate={LAST_UPDATE}
        highlights={['Donnees collecte es', 'Finalites', 'Vos droits']}
      />

      <SiteSection
        eyebrow="Responsable"
        title="Un traitement limite a ce qui est utile"
        description="NEXORA Truck est developpe par un editeur independant. Les traitements visent avant tout a repondre aux demandes entrantes, securiser les acces et faire fonctionner la plateforme."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.45rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Contact principal</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Pour toute question relative a vos donnees personnelles, vous pouvez adresser une demande a {contactEmail}.
            </p>
          </article>
          <article className="rounded-[1.45rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Perimetre</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Cette politique couvre le site vitrine, les formulaires publics, ainsi que les donnees traitees dans l ERP pour les seuls utilisateurs autorises.
            </p>
          </article>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Donnees"
        title="Quelles donnees peuvent etre collecte es"
        description="La collecte est limitee aux informations necessaires a la relation commerciale, au support et a l usage de la plateforme."
        muted
      >
        <div className="grid gap-3">
          {collectedData.map(item => (
            <div key={item} className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Finalites"
        title="Pourquoi ces donnees sont traitees"
        description="Chaque traitement doit avoir une finalite explicite, comprensible et proportionnee."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {purposes.map(item => (
            <article key={item} className="rounded-[1.45rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
              <p className="text-sm leading-7 text-slate-700">{item}</p>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Conservation"
        title="Combien de temps les donnees peuvent etre conservees"
        description="Les donnees ne sont pas conservees au-dela de ce qui est necessaire a la reponse, au suivi de la relation ou aux obligations legales applicables."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.45rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Demandes commerciales</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Les informations transmises via les formulaires publics sont conservees pendant la duree necessaire au traitement de la demande et, lorsque cela est pertinent, au suivi commercial raisonnablement lie a cette demande.
            </p>
          </article>
          <article className="rounded-[1.45rem] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Donnees ERP</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Les donnees de la plateforme sont conservees selon les besoins d exploitation, les obligations legales, les contraintes de securite et les regles internes definies avec les structures utilisatrices.
            </p>
          </article>
        </div>
      </SiteSection>

      <SiteSection
        eyebrow="Cookies"
        title="Cookies, traceurs et consentement"
        description="Le site utilise en priorite des mecanismes techniques utiles a son fonctionnement. Lorsqu un choix utilisateur est necessaire, il est memorise localement pour eviter une sollicitation repetitive."
      >
        <div className="grid gap-3">
          {cookieTypes.map(item => (
            <div key={item} className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700">
              {item}
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm leading-7 text-slate-600">
          Le bandeau cookies permet d enregistrer votre choix directement sur votre appareil. En l absence d integration publicitaire ou de traceurs tiers non essentiels, le dispositif actuel demeure volontairement simple, lisible et proportionne.
        </p>
      </SiteSection>

      <SiteSection
        eyebrow="Vos droits"
        title="Comment exercer vos droits"
        description="Vous pouvez demander des informations sur les donnees vous concernant ou demander leur correction selon le cadre applicable."
        muted
      >
        <div className="grid gap-3 md:grid-cols-2">
          {rights.map(item => (
            <div key={item} className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700">
              {item}
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm leading-7 text-slate-600">
          Pour exercer vos droits, adressez votre demande a {contactEmail}. En cas de doute raisonnable sur votre identite, un justificatif pourra etre demande afin de proteger les donnees concernees contre toute communication non autorisee.
        </p>
      </SiteSection>

      <SiteSection
        eyebrow="Documents lies"
        title="Documents complementaires"
        description="Cette politique doit etre lue conjointement avec les mentions legales et les conditions generales d utilisation du site."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/mentions-legales-public" className="rounded-[1.45rem] border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-800 shadow-[0_16px_45px_rgba(15,23,42,0.06)] transition-colors hover:border-slate-300 hover:text-slate-950">
            Mentions legales
          </Link>
          <Link to="/conditions-generales-utilisation" className="rounded-[1.45rem] border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-800 shadow-[0_16px_45px_rgba(15,23,42,0.06)] transition-colors hover:border-slate-300 hover:text-slate-950">
            Conditions generales d utilisation
          </Link>
          <Link to="/contact" className="rounded-[1.45rem] border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-800 shadow-[0_16px_45px_rgba(15,23,42,0.06)] transition-colors hover:border-slate-300 hover:text-slate-950">
            Contact
          </Link>
        </div>
      </SiteSection>

      <section className="rounded-[1.8rem] border border-slate-200 bg-slate-950 p-7 text-white sm:p-9">
        <h2 className="text-3xl font-semibold tracking-tight">Besoin d une clarification complementaire</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
          Les mentions legales et cette politique de confidentialite evoluent avec le produit, votre statut d exploitation et les integrations actives sur le site.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/conditions-generales-utilisation" className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
            Voir les CGU
          </Link>
          <Link to="/mentions-legales-public" className="rounded-full bg-[#fb923c] px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-[#fdba74]">
            Voir les mentions legales
          </Link>
          <Link to="/contact" className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
            Contacter NEXORA Truck
          </Link>
        </div>
      </section>
    </div>
  )
}