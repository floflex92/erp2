import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { readCompanySettings } from '@/lib/companySettings'
import { supabase } from '@/lib/supabase'
import LegalHero from '@/site/components/LegalHero'

const LAST_UPDATE = '31 mars 2026'
const NETLIFY_COMPANY = 'Netlify, Inc.'
const NETLIFY_ADDRESS = '44 Montgomery Street, Suite 300, San Francisco, California 94104, Etats-Unis'
const SUPABASE_COMPANY = 'Supabase, Inc.'
const SUPABASE_ADDRESS = '970 Toa Payoh North #07-04, Singapore 318992'
const DEFAULT_COMPANY_NAME = 'NEXORA Truck'
const DEFAULT_ADDRESS = 'Lieux mareille 13eme'
const DEFAULT_EMAIL = 'contact@nexora-truck.fr'
const DEFAULT_PHONE = '0782711705'
const DEFAULT_PUBLICATION_DIRECTOR = 'CHABRE Florent'
const DEFAULT_LEGAL_FORM = 'Activite independante'
const DEFAULT_SIRET = 'A renseigner si activite declaree'
const DEFAULT_VAT = 'Non applicable a ce stade'

type LegalConfig = {
  companyName: string
  legalForm: string
  siret: string
  vat: string
  address: string
  email: string
  phone: string
  publicationDirector: string
  publicationContact: string
}

function emptyIfMissing(value: unknown, fallback = 'Non renseigne') {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed ? trimmed : fallback
}

function isProvided(value: string) {
  return value.trim() !== '' && value.trim().toLowerCase() !== 'non renseigne' && value.trim().toLowerCase() !== 'non renseignee'
}

function shouldDisplayLegalValue(value: string, hiddenSentinel: string) {
  return isProvided(value) && value.trim() !== hiddenSentinel
}

export default function MentionsLegales() {
  const company = readCompanySettings()
  const [legalConfig, setLegalConfig] = useState<LegalConfig>({
    companyName: company.companyName || DEFAULT_COMPANY_NAME,
    legalForm: DEFAULT_LEGAL_FORM,
    siret: DEFAULT_SIRET,
    vat: DEFAULT_VAT,
    address: DEFAULT_ADDRESS,
    email: DEFAULT_EMAIL,
    phone: DEFAULT_PHONE,
    publicationDirector: DEFAULT_PUBLICATION_DIRECTOR,
    publicationContact: DEFAULT_EMAIL,
  })

  useEffect(() => {
    let active = true
    void (async () => {
      const keys = [
        'societe_nom',
        'societe_forme',
        'societe_siret',
        'societe_tva_intra',
        'societe_adresse',
        'societe_telephone',
        'mail_from',
        'responsable_exploitation_nom',
        'responsable_exploitation_email',
      ]

      const { data, error } = await supabase
        .from('config_entreprise')
        .select('cle,valeur')
        .in('cle', keys)

      if (!active || error) return
      const map = Object.fromEntries((data ?? []).map(row => [row.cle, row.valeur]))

      setLegalConfig({
        companyName: emptyIfMissing(map.societe_nom, company.companyName || DEFAULT_COMPANY_NAME),
        legalForm: emptyIfMissing(map.societe_forme, DEFAULT_LEGAL_FORM),
        siret: emptyIfMissing(map.societe_siret, DEFAULT_SIRET),
        vat: emptyIfMissing(map.societe_tva_intra, DEFAULT_VAT),
        address: emptyIfMissing(map.societe_adresse, DEFAULT_ADDRESS),
        email: emptyIfMissing(map.mail_from, DEFAULT_EMAIL),
        phone: emptyIfMissing(map.societe_telephone, DEFAULT_PHONE),
        publicationDirector: emptyIfMissing(map.responsable_exploitation_nom, DEFAULT_PUBLICATION_DIRECTOR),
        publicationContact: emptyIfMissing(map.responsable_exploitation_email, DEFAULT_EMAIL),
      })
    })()

    return () => {
      active = false
    }
  }, [company.companyName])

  const currentHost = useMemo(() => {
    if (typeof window === 'undefined') return 'Non disponible'
    return window.location.origin
  }, [])

  const publicationLabel = isProvided(legalConfig.publicationDirector)
    ? legalConfig.publicationDirector
    : 'A completer par l exploitant'

  const publicationContactLabel = isProvided(legalConfig.publicationContact)
    ? legalConfig.publicationContact
    : legalConfig.email

  const showSiret = shouldDisplayLegalValue(legalConfig.siret, DEFAULT_SIRET)
  const showVat = shouldDisplayLegalValue(legalConfig.vat, DEFAULT_VAT)

  return (
    <div className="space-y-6">
      <LegalHero
        eyebrow="Information legale"
        title="Mentions legales"
        description={`Informations legales relatives au site vitrine et a la plateforme ERP ${legalConfig.companyName}. Cette page presente l identite de l editeur, les informations d hebergement, les regles generales d usage du service et les principaux points lies a la protection des donnees.`}
        lastUpdate={LAST_UPDATE}
        highlights={['Editeur', 'Hebergement', 'Protection des donnees']}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <LegalBlock title="Editeur du site et de la plateforme">
          <p>{legalConfig.companyName}</p>
          <p>Statut: {legalConfig.legalForm}</p>
          {showSiret ? <p>SIRET: {legalConfig.siret}</p> : null}
          {showVat ? <p>TVA intracommunautaire: {legalConfig.vat}</p> : null}
          <p>Adresse de contact: {legalConfig.address}</p>
          <p>Email de contact: {legalConfig.email}</p>
          <p>Telephone: {legalConfig.phone}</p>
          <p>URL de consultation: {currentHost}</p>
          {!showSiret && !showVat ? (
            <p>
              Aucune immatriculation societaire n est affichee a ce stade. Le service est actuellement presente dans un
              cadre de developpement et d exploitation autonome.
            </p>
          ) : null}
        </LegalBlock>

        <LegalBlock title="Directeur de publication">
          <p>Responsable de publication: {publicationLabel}</p>
          <p>Fonction: editeur / developpeur independant</p>
          <p>Contact publication: {publicationContactLabel}</p>
        </LegalBlock>

        <LegalBlock title="Hebergement">
          <p>Site vitrine et services frontend: {NETLIFY_COMPANY}</p>
          <p>Adresse hebergeur frontend: {NETLIFY_ADDRESS}</p>
          <p>Base de donnees et services associes: {SUPABASE_COMPANY}</p>
          <p>Adresse hebergeur donnees: {SUPABASE_ADDRESS}</p>
          <p>L editeur demeure responsable de la configuration du nom de domaine, des acces applicatifs et des contenus diffuses.</p>
        </LegalBlock>

        <LegalBlock title="Champ d application">
          <p>
            La presente page s applique au site public de presentation, aux formulaires de prise de contact et a la
            plateforme ERP exploitee sous la marque {legalConfig.companyName}.
          </p>
          <p>
            Certaines fonctionnalites peuvent etre reservees aux utilisateurs autorises, aux clients en phase de test ou
            aux personnes expressement habilitees par l editeur.
          </p>
        </LegalBlock>

        <LegalBlock title="Acces au service">
          <p>
            La plateforme est reservee aux utilisateurs autorises par l editeur ou, le cas echeant, par les structures utilisatrices du service, au moyen d un compte et de droits d acces definis par role.
          </p>
          <p>
            L acces peut etre suspendu temporairement pour maintenance, securite, prevention d abus ou utilisation non conforme aux regles applicables.
          </p>
          <p>
            Le site public reste accessible librement, sous reserve des interruptions techniques necessaires a son
            exploitation ou a sa securisation.
          </p>
        </LegalBlock>

        <LegalBlock title="Propriete intellectuelle">
          <p>
            Les contenus, marques, codes, bases de donnees et elements graphiques de la plateforme sont proteges par
            les droits de propriete intellectuelle.
          </p>
          <p>
            Toute reproduction, extraction, diffusion, adaptation ou exploitation non autorisee est interdite sauf accord
            ecrit prealable de l editeur.
          </p>
          <p>
            Les logos, maquettes, contenus marketing, textes, illustrations et captures presentes sur le site vitrine
            relevent egalement de cette protection.
          </p>
        </LegalBlock>

        <LegalBlock title="Protection des donnees">
          <p>
            Les donnees traitees dans l ERP le sont pour les finalites d exploitation transport, de gestion, de pilotage, de conformite et d administration des acces.
          </p>
          <p>
            Chaque structure utilisatrice ou personne qui alimente l outil reste responsable des donnees qu elle saisit
            et doit respecter les obligations RGPD applicables.
          </p>
          <p>
            Les demandes relatives aux droits des personnes (acces, rectification, suppression) doivent etre adressees
            au responsable de traitement concerne.
          </p>
          <p>
            Les donnees transmises via les formulaires du site public sont utilisees pour recontacter les prospects,
            qualifier les demandes et organiser une demonstration ou une prise de contact commerciale.
          </p>
          <p>
            Pour le detail des traitements, des durees de conservation et des droits des personnes, consultez aussi la{' '}
            <Link to="/politique-confidentialite" className="font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900">
              politique de confidentialite
            </Link>
            .
          </p>
        </LegalBlock>

        <LegalBlock title="Cookies et traces techniques">
          <p>
            La plateforme peut utiliser des stockages techniques necessaires au fonctionnement (session, preferences,
            configuration locale).
          </p>
          <p>
            Ces mecanismes ne doivent pas etre desactives lorsqu ils sont indispensables a la securite et a
            l authentification.
          </p>
          <p>
            Le site public peut egalement deposer des cookies ou traceurs strictement necessaires a la mesure
            d audience, a la qualification des demandes et au bon fonctionnement des parcours.
          </p>
          <p>
            Pour plus de detail sur les categories de donnees et les modalites de consentement, consultez la{' '}
            <Link to="/politique-confidentialite" className="font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900">
              politique de confidentialite
            </Link>
            .
          </p>
        </LegalBlock>

        <LegalBlock title="Responsabilite">
          <p>
            L editeur met en oeuvre des moyens raisonnables pour assurer la disponibilite et la fiabilite de la
            plateforme, sans garantie d absence totale d interruption ou d erreur.
          </p>
          <p>
            L utilisateur demeure responsable de la verification des donnees critiques, notamment en matiere de reglementation, d ETA, de conduite et de facturation, avant toute decision operationnelle.
          </p>
          <p>
            Les informations presentes sur le site public sont fournies a titre informatif et peuvent evoluer sans
            preavis en fonction des mises a jour du produit, des offres et des contraintes legales.
          </p>
        </LegalBlock>

        <LegalBlock title="Droit applicable et contact">
          <p>Les presentes mentions legales sont regies par le droit francais, sauf disposition imperative contraire.</p>
          <p>
            Pour toute question sur les presentes mentions, vous pouvez contacter {legalConfig.companyName} a l adresse
            {` `}
            {legalConfig.email} ou par telephone au {legalConfig.phone}.
          </p>
          <p>
            Si l activite devient officiellement declaree ou exploitee via une structure immatriculee, les informations
            juridiques obligatoires devront etre completees avant toute mise en production ouverte au public.
          </p>
        </LegalBlock>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link to="/politique-confidentialite" className="rounded-[1.45rem] border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-800 shadow-[0_16px_45px_rgba(15,23,42,0.06)] transition-colors hover:border-slate-300 hover:text-slate-950">
          Consulter la politique de confidentialite
        </Link>
        <Link to="/conditions-generales-utilisation" className="rounded-[1.45rem] border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-800 shadow-[0_16px_45px_rgba(15,23,42,0.06)] transition-colors hover:border-slate-300 hover:text-slate-950">
          Consulter les CGU
        </Link>
        <Link to="/contact" className="rounded-[1.45rem] border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-800 shadow-[0_16px_45px_rgba(15,23,42,0.06)] transition-colors hover:border-slate-300 hover:text-slate-950">
          Contacter l editeur
        </Link>
      </section>
    </div>
  )
}

function LegalBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-2 text-sm text-slate-600">
        {children}
      </div>
    </article>
  )
}
