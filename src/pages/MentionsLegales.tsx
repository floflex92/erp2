import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { readCompanySettings } from '@/lib/companySettings'
import { supabase } from '@/lib/supabase'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(60px, 8vw, 120px)' }

const LAST_UPDATE = '31 mars 2026'
const NETLIFY_COMPANY = 'Netlify, Inc.'
const NETLIFY_ADDRESS = '44 Montgomery Street, Suite 300, San Francisco, California 94104, États-Unis'
const SUPABASE_COMPANY = 'Supabase, Inc.'
const SUPABASE_ADDRESS = '970 Toa Payoh North #07-04, Singapore 318992'
const DEFAULT_COMPANY_NAME = 'NEXORA Truck'
const DEFAULT_ADDRESS = 'Marseille, 13e arrondissement'
const DEFAULT_EMAIL = 'contact@nexora-truck.fr'
const DEFAULT_PHONE = '07 82 71 17 05'
const DEFAULT_PUBLICATION_DIRECTOR = 'CHABRE Florent'
const DEFAULT_LEGAL_FORM = 'Activité indépendante'
const DEFAULT_SIRET = 'À renseigner si activité déclarée'
const DEFAULT_VAT = 'Non applicable à ce stade'

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

function emptyIfMissing(value: unknown, fallback = 'Non renseigné') {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed ? trimmed : fallback
}

function isProvided(value: string) {
  return value.trim() !== '' && !value.trim().toLowerCase().startsWith('non renseign')
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
        'societe_nom', 'societe_forme', 'societe_siret', 'societe_tva_intra',
        'societe_adresse', 'societe_telephone', 'mail_from',
        'responsable_exploitation_nom', 'responsable_exploitation_email',
      ]
      const { data, error } = await (supabase
        .from('config_entreprise' as any)
        .select('cle,valeur')
        .in('cle', keys) as any)
      if (!active || error) return
      const map = Object.fromEntries(((data ?? []) as Array<{ cle: string; valeur: unknown }>).map(row => [row.cle, row.valeur]))
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
    return () => { active = false }
  }, [company.companyName])

  const currentHost = useMemo(() => typeof window !== 'undefined' ? window.location.origin : '', [])
  const showSiret = shouldDisplayLegalValue(legalConfig.siret, DEFAULT_SIRET)
  const showVat = shouldDisplayLegalValue(legalConfig.vat, DEFAULT_VAT)

  return (
    <>
      {/* ── HERO ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>
          Information légale
        </p>
        <h1
          className="mt-4 max-w-3xl font-bold leading-[1.08]"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', color: '#000000', letterSpacing: '-0.02em' }}
        >
          Mentions légales
        </h1>
        <p className="mt-4 max-w-2xl" style={{ color: '#6E6E73' }}>
          Informations légales relatives au site vitrine et à la plateforme ERP {legalConfig.companyName}.
        </p>
        <p className="mt-3 text-sm" style={{ color: '#86868B' }}>Mise à jour : {LAST_UPDATE}</p>
      </section>

      {/* ── ÉDITEUR ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <LegalTitle>Éditeur du site et de la plateforme</LegalTitle>
        <div className="mt-6 grid gap-1" style={{ color: '#1D1D1F' }}>
          <p className="font-semibold">{legalConfig.companyName}</p>
          <p>Statut : {legalConfig.legalForm}</p>
          {showSiret && <p>SIRET : {legalConfig.siret}</p>}
          {showVat && <p>TVA intracommunautaire : {legalConfig.vat}</p>}
          <p>Adresse : {legalConfig.address}</p>
          <p>Email : {legalConfig.email}</p>
          <p>Téléphone : {legalConfig.phone}</p>
          <p>URL : {currentHost}</p>
        </div>
        {!showSiret && !showVat && (
          <p className="mt-4" style={{ color: '#6E6E73' }}>
            Aucune immatriculation sociétaire n'est affichée à ce stade. Le service est présenté dans un cadre de développement et d'exploitation autonome.
          </p>
        )}
      </section>

      {/* ── DIRECTEUR DE PUBLICATION ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <LegalTitle>Directeur de publication</LegalTitle>
        <div className="mt-6 grid gap-1" style={{ color: '#1D1D1F' }}>
          <p>Responsable : {isProvided(legalConfig.publicationDirector) ? legalConfig.publicationDirector : 'À compléter'}</p>
          <p>Fonction : éditeur / développeur indépendant</p>
          <p>Contact : {isProvided(legalConfig.publicationContact) ? legalConfig.publicationContact : legalConfig.email}</p>
        </div>
      </section>

      {/* ── HÉBERGEMENT ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <LegalTitle>Hébergement</LegalTitle>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold" style={{ color: '#1D1D1F' }}>Site vitrine et services frontend</p>
            <p className="mt-1" style={{ color: '#6E6E73' }}>{NETLIFY_COMPANY}</p>
            <p style={{ color: '#6E6E73' }}>{NETLIFY_ADDRESS}</p>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#1D1D1F' }}>Base de données et services associés</p>
            <p className="mt-1" style={{ color: '#6E6E73' }}>{SUPABASE_COMPANY}</p>
            <p style={{ color: '#6E6E73' }}>{SUPABASE_ADDRESS}</p>
          </div>
        </div>
      </section>

      {/* ── PROPRIÉTÉ INTELLECTUELLE ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <LegalTitle>Propriété intellectuelle</LegalTitle>
        <div className="mt-6 max-w-3xl grid gap-4" style={{ color: '#6E6E73' }}>
          <p>Les contenus, marques, codes, bases de données et éléments graphiques de la plateforme sont protégés par les droits de propriété intellectuelle.</p>
          <p>Toute reproduction, extraction, diffusion, adaptation ou exploitation non autorisée est interdite sauf accord écrit préalable de l'éditeur.</p>
        </div>
      </section>

      {/* ── PROTECTION DES DONNÉES ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <LegalTitle>Protection des données</LegalTitle>
        <div className="mt-6 max-w-3xl grid gap-4" style={{ color: '#6E6E73' }}>
          <p>Les données traitées dans l'ERP le sont pour les finalités d'exploitation transport, de gestion, de pilotage, de conformité et d'administration des accès.</p>
          <p>Chaque structure utilisatrice reste responsable des données qu'elle saisit et doit respecter les obligations RGPD applicables.</p>
          <p>Les données transmises via les formulaires du site public sont utilisées pour recontacter les prospects et organiser une démonstration.</p>
          <p>
            Pour le détail des traitements, consultez la{' '}
            <Link to="/politique-confidentialite" className="font-medium underline underline-offset-2" style={{ color: '#2563EB' }}>
              politique de confidentialité
            </Link>.
          </p>
        </div>
      </section>

      {/* ── COOKIES ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <LegalTitle>Cookies et traces techniques</LegalTitle>
        <div className="mt-6 max-w-3xl grid gap-4" style={{ color: '#6E6E73' }}>
          <p>La plateforme utilise des stockages techniques nécessaires au fonctionnement (session, préférences, configuration locale).</p>
          <p>Le site public peut déposer des cookies strictement nécessaires à la mesure d'audience et au bon fonctionnement des parcours.</p>
        </div>
      </section>

      {/* ── RESPONSABILITÉ ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <LegalTitle>Responsabilité</LegalTitle>
        <div className="mt-6 max-w-3xl grid gap-4" style={{ color: '#6E6E73' }}>
          <p>L'éditeur met en œuvre des moyens raisonnables pour assurer la disponibilité et la fiabilité de la plateforme, sans garantie d'absence totale d'interruption ou d'erreur.</p>
          <p>L'utilisateur demeure responsable de la vérification des données critiques avant toute décision opérationnelle.</p>
        </div>
      </section>

      {/* ── DROIT APPLICABLE ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <LegalTitle>Droit applicable et contact</LegalTitle>
        <div className="mt-6 max-w-3xl grid gap-4" style={{ color: '#6E6E73' }}>
          <p>Les présentes mentions légales sont régies par le droit français.</p>
          <p>Contact : {legalConfig.email} — Téléphone : {legalConfig.phone}</p>
        </div>
      </section>

      {/* ── DOCUMENTS LIÉS ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <LegalTitle>Documents complémentaires</LegalTitle>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link to="/politique-confidentialite" className="text-sm font-semibold" style={{ color: '#2563EB' }}>
            Politique de confidentialité
          </Link>
          <Link to="/conditions-generales-utilisation" className="text-sm font-semibold" style={{ color: '#2563EB' }}>
            Conditions générales d'utilisation
          </Link>
          <Link to="/contact" className="text-sm font-semibold" style={{ color: '#2563EB' }}>
            Contact
          </Link>
        </div>
      </section>
    </>
  )
}

function LegalTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-semibold" style={{ color: '#000000' }}>
      {children}
    </h2>
  )
}
