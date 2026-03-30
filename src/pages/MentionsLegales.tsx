import { useEffect, useMemo, useState } from 'react'
import { readCompanySettings } from '@/lib/companySettings'
import { supabase } from '@/lib/supabase'

const LAST_UPDATE = '2026-03-28'

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

export default function MentionsLegales() {
  const company = readCompanySettings()
  const [legalConfig, setLegalConfig] = useState<LegalConfig>({
    companyName: company.companyName || 'NEXORA truck',
    legalForm: 'Societe commerciale',
    siret: 'Non renseigne',
    vat: 'Non renseigne',
    address: 'Non renseignee',
    email: 'Non renseigne',
    phone: 'Non renseigne',
    publicationDirector: 'Non renseigne',
    publicationContact: 'Non renseigne',
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
        companyName: emptyIfMissing(map.societe_nom, company.companyName || 'NEXORA truck'),
        legalForm: emptyIfMissing(map.societe_forme, 'Societe commerciale'),
        siret: emptyIfMissing(map.societe_siret),
        vat: emptyIfMissing(map.societe_tva_intra),
        address: emptyIfMissing(map.societe_adresse, 'Non renseignee'),
        email: emptyIfMissing(map.mail_from),
        phone: emptyIfMissing(map.societe_telephone),
        publicationDirector: emptyIfMissing(map.responsable_exploitation_nom),
        publicationContact: emptyIfMissing(map.responsable_exploitation_email),
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

  return (
    <div className="space-y-6">
      <section
        className="nx-card overflow-hidden p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0b3a5b 100%)' }}
      >
        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-300">Information legale</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Mentions legales</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-300">
          Informations legales relatives a l utilisation de la plateforme ERP {legalConfig.companyName}.
        </p>
        <p className="mt-2 text-xs text-slate-400">Derniere mise a jour: {LAST_UPDATE}</p>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LegalBlock title="Editeur de la plateforme">
          <p>{legalConfig.companyName}</p>
          <p>Forme: {legalConfig.legalForm}</p>
          <p>SIRET: {legalConfig.siret}</p>
          <p>TVA intracommunautaire: {legalConfig.vat}</p>
          <p>Adresse du siege: {legalConfig.address}</p>
          <p>Email de contact: {legalConfig.email}</p>
          <p>Telephone: {legalConfig.phone}</p>
          <p>URL de consultation: {currentHost}</p>
        </LegalBlock>

        <LegalBlock title="Directeur de publication">
          <p>Representant legal: {legalConfig.publicationDirector}</p>
          <p>Fonction: dirigeant / gerant</p>
          <p>Contact publication: {legalConfig.publicationContact}</p>
        </LegalBlock>

        <LegalBlock title="Hebergement">
          <p>Infrastructure applicative: Netlify</p>
          <p>Base de donnees: Supabase</p>
          <p>Les informations legales detaillees de l hebergeur doivent etre completees par l exploitant.</p>
        </LegalBlock>

        <LegalBlock title="Acces au service">
          <p>
            La plateforme est reservee aux utilisateurs autorises par l entreprise cliente, via un compte et des droits
            d acces definis par role.
          </p>
          <p>
            L acces peut etre suspendu pour maintenance, securite, ou en cas d utilisation non conforme aux regles
            internes.
          </p>
        </LegalBlock>

        <LegalBlock title="Propriete intellectuelle">
          <p>
            Les contenus, marques, codes, bases de donnees et elements graphiques de la plateforme sont proteges par
            les droits de propriete intellectuelle.
          </p>
          <p>
            Toute reproduction, extraction, diffusion ou exploitation non autorisee est interdite sauf accord ecrit
            prealable.
          </p>
        </LegalBlock>

        <LegalBlock title="Protection des donnees">
          <p>
            Les donnees traitees dans l ERP le sont pour les finalites d exploitation transport, gestion RH, flotte,
            facturation et conformite.
          </p>
          <p>
            Chaque entreprise cliente est responsable des donnees qu elle saisit et doit respecter les obligations RGPD
            applicables.
          </p>
          <p>
            Les demandes relatives aux droits des personnes (acces, rectification, suppression) doivent etre adressees
            au responsable de traitement de l entreprise cliente.
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
        </LegalBlock>

        <LegalBlock title="Responsabilite">
          <p>
            L editeur met en oeuvre des moyens raisonnables pour assurer la disponibilite et la fiabilite de la
            plateforme, sans garantie d absence totale d interruption ou d erreur.
          </p>
          <p>
            L utilisateur reste responsable de la verification des donnees critiques (reglementation, ETA, conduite,
            facturation) avant toute decision operationnelle.
          </p>
        </LegalBlock>
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
