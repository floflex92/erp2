import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(60px, 8vw, 120px)' }

const contactEmail = 'contact@nexora-truck.fr'
const LAST_UPDATE = '31 mars 2026'

export default function PrivacyPolicyPage() {
  useSiteMeta({
    title: 'Politique de confidentialité — NEXORA Truck',
    description: 'Politique de confidentialité du site et de la plateforme NEXORA Truck : données collectées, finalités, durées de conservation et droits des personnes.',
    canonicalPath: '/politique-confidentialite',
    keywords: 'politique de confidentialité, RGPD, données personnelles, NEXORA Truck, ERP transport',
  })

  return (
    <>
      {/* ── HERO ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>
          Confidentialité
        </p>
        <h1
          className="mt-4 max-w-4xl font-bold leading-[1.08]"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', color: '#000000', letterSpacing: '-0.02em' }}
        >
          Politique de confidentialité du site et de la plateforme NEXORA Truck
        </h1>
        <p className="mt-4 max-w-3xl" style={{ color: '#6E6E73' }}>
          Cette page précise quelles données peuvent être collectées, dans quel objectif elles sont traitées, pendant combien de temps elles peuvent être conservées et selon quelles modalités vos droits peuvent être exercés.
        </p>
        <p className="mt-3 text-sm" style={{ color: '#86868B' }}>Mise à jour : {LAST_UPDATE}</p>
      </section>

      {/* ── RESPONSABLE ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <LegalTitle>Responsable du traitement</LegalTitle>
        <div className="mt-6 max-w-3xl grid gap-4" style={{ color: '#6E6E73' }}>
          <p>NEXORA Truck est développé par un éditeur indépendant. Les traitements visent avant tout à répondre aux demandes entrantes, sécuriser les accès et faire fonctionner la plateforme.</p>
          <p>Pour toute question relative à vos données personnelles : <span style={{ color: '#1D1D1F' }}>{contactEmail}</span></p>
          <p>Périmètre : site vitrine, formulaires publics, et données traitées dans l'ERP pour les utilisateurs autorisés.</p>
        </div>
      </section>

      {/* ── DONNÉES COLLECTÉES ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <LegalTitle>Données collectées</LegalTitle>
        <p className="mt-3" style={{ color: '#6E6E73' }}>La collecte est limitée aux informations nécessaires à la relation commerciale, au support et à l'usage de la plateforme.</p>
        <div className="mt-8 max-w-3xl grid gap-6">
          {([
            'Informations de contact transmises via les formulaires publics : nom, adresse email, numéro de téléphone, société et message.',
            'Informations de navigation strictement nécessaires au bon fonctionnement technique du site.',
            'Données opérationnelles saisies dans la plateforme ERP par les utilisateurs autorisés, dans la limite de leurs droits d\'accès.',
          ] as const).map(item => (
            <p key={item} style={{ color: '#1D1D1F', borderLeft: '2px solid #E5E5E5', paddingLeft: '16px' }}>{item}</p>
          ))}
        </div>
      </section>

      {/* ── FINALITÉS ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <LegalTitle>Finalités du traitement</LegalTitle>
        <p className="mt-3" style={{ color: '#6E6E73' }}>Chaque traitement a une finalité explicite, compréhensible et proportionnée.</p>
        <div className="mt-8 max-w-3xl grid gap-6">
          {([
            'Répondre aux demandes entrantes, organiser une démonstration et assurer un suivi commercial proportionné.',
            'Assurer le fonctionnement, la sécurité, la maintenance et l\'amélioration continue du site et de la plateforme.',
            'Permettre l\'exploitation métier de l\'ERP transport pour les structures utilisatrices autorisées.',
          ] as const).map(item => (
            <p key={item} style={{ color: '#1D1D1F', borderLeft: '2px solid #E5E5E5', paddingLeft: '16px' }}>{item}</p>
          ))}
        </div>
      </section>

      {/* ── CONSERVATION ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <LegalTitle>Durée de conservation</LegalTitle>
        <div className="mt-6 max-w-3xl grid gap-8 md:grid-cols-2">
          <div>
            <p className="font-semibold" style={{ color: '#000000' }}>Demandes commerciales</p>
            <p className="mt-2" style={{ color: '#6E6E73' }}>
              Conservées pendant la durée nécessaire au traitement de la demande et au suivi commercial raisonnablement lié.
            </p>
          </div>
          <div>
            <p className="font-semibold" style={{ color: '#000000' }}>Données ERP</p>
            <p className="mt-2" style={{ color: '#6E6E73' }}>
              Conservées selon les besoins d'exploitation, les obligations légales et les règles définies avec les structures utilisatrices.
            </p>
          </div>
        </div>
      </section>

      {/* ── COOKIES ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <LegalTitle>Cookies et consentement</LegalTitle>
        <div className="mt-6 max-w-3xl grid gap-4" style={{ color: '#6E6E73' }}>
          <p>Cookies strictement nécessaires au fonctionnement technique, à la navigation et à la sécurisation du site.</p>
          <p>Stockages locaux de préférences pour mémoriser certains choix utilisateur (bandeau cookies).</p>
          <p>Le bandeau cookies permet d'enregistrer votre choix directement sur votre appareil. En l'absence de traceurs tiers, le dispositif reste simple et proportionné.</p>
        </div>
      </section>

      {/* ── VOS DROITS ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <LegalTitle>Vos droits</LegalTitle>
        <div className="mt-6 max-w-3xl grid gap-4" style={{ color: '#6E6E73' }}>
          <p>Droit d'accès à vos données.</p>
          <p>Droit de rectification des informations inexactes.</p>
          <p>Droit d'opposition ou de limitation lorsque la loi le permet.</p>
          <p>Droit à l'effacement lorsque la conservation n'est plus nécessaire.</p>
        </div>
        <p className="mt-6 max-w-3xl" style={{ color: '#6E6E73' }}>
          Pour exercer vos droits : <span style={{ color: '#1D1D1F' }}>{contactEmail}</span>
        </p>
      </section>

      {/* ── DOCUMENTS LIÉS ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <LegalTitle>Documents complémentaires</LegalTitle>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link to="/mentions-legales-public" className="text-sm font-semibold" style={{ color: '#2563EB' }}>
            Mentions légales
          </Link>
          <Link to="/conditions-generales-utilisation" className="text-sm font-semibold" style={{ color: '#2563EB' }}>
            Conditions générales d'utilisation
          </Link>
          <Link to="/contact" className="text-sm font-semibold" style={{ color: '#2563EB' }}>
            Contacter NEXORA Truck
          </Link>
        </div>
      </section>
    </>
  )
}

function LegalTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-semibold" style={{ color: '#000000' }}>{children}</h2>
}
