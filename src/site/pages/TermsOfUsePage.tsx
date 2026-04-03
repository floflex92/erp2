import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(60px, 8vw, 120px)' }

const LAST_UPDATE = '31 mars 2026'

export default function TermsOfUsePage() {
  useSiteMeta({
    title: 'Conditions générales d\'utilisation — NEXORA Truck',
    description: 'Conditions générales d\'utilisation du site public et de la plateforme NEXORA Truck.',
    canonicalPath: '/conditions-generales-utilisation',
    keywords: 'CGU, conditions générales d\'utilisation, NEXORA Truck, ERP transport',
  })

  return (
    <>
      {/* ── HERO ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>
          CGU
        </p>
        <h1
          className="mt-4 max-w-4xl font-bold leading-[1.08]"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', color: '#000000', letterSpacing: '-0.02em' }}
        >
          Conditions générales d'utilisation du site et de la plateforme NEXORA Truck
        </h1>
        <p className="mt-4 max-w-3xl" style={{ color: '#6E6E73' }}>
          Les présentes conditions encadrent l'accès au site public, aux formulaires de contact et à la plateforme ERP accessible aux utilisateurs habilités.
        </p>
        <p className="mt-3 text-sm" style={{ color: '#86868B' }}>Mise à jour : {LAST_UPDATE}</p>
      </section>

      {/* ── OBJET ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <LegalTitle>Objet</LegalTitle>
        <div className="mt-6 max-w-3xl grid gap-6">
          {([
            'Le site public présente l\'offre, les fonctionnalités, les contenus d\'information et les modalités de contact de NEXORA Truck.',
            'La plateforme ERP est réservée aux utilisateurs autorisés et peut faire l\'objet de limitations d\'accès selon les habilitations attribuées.',
            'Toute utilisation du site ou de la plateforme doit demeurer licite, loyale et compatible avec la sécurité générale du service.',
          ] as const).map(item => (
            <p key={item} style={{ color: '#1D1D1F', borderLeft: '2px solid #E5E5E5', paddingLeft: '16px' }}>{item}</p>
          ))}
        </div>
      </section>

      {/* ── ACCÈS ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <LegalTitle>Disponibilité et accès au service</LegalTitle>
        <div className="mt-6 max-w-3xl grid gap-8 md:grid-cols-2">
          <div>
            <p className="font-semibold" style={{ color: '#000000' }}>Site public</p>
            <p className="mt-2" style={{ color: '#6E6E73' }}>
              Accessible librement. Certaines rubriques peuvent être temporairement indisponibles pour des raisons de maintenance ou de mise à jour.
            </p>
          </div>
          <div>
            <p className="font-semibold" style={{ color: '#000000' }}>Plateforme ERP</p>
            <p className="mt-2" style={{ color: '#6E6E73' }}>
              Réservée aux utilisateurs disposant d'un compte actif. L'éditeur peut suspendre un accès en cas d'anomalie ou d'usage abusif.
            </p>
          </div>
        </div>
      </section>

      {/* ── USAGES INTERDITS ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <LegalTitle>Usages interdits</LegalTitle>
        <p className="mt-3" style={{ color: '#6E6E73' }}>Tout usage portant atteinte à l'intégrité du service ou aux droits de tiers est prohibé.</p>
        <div className="mt-8 max-w-3xl grid gap-6">
          {([
            'Tenter de contourner les mécanismes d\'authentification, de sécurité ou de contrôle d\'accès.',
            'Extraire, copier, réutiliser ou redistribuer sans autorisation des contenus, données ou éléments du produit.',
            'Utiliser le site ou la plateforme pour diffuser un contenu illicite, trompeur ou malveillant.',
          ] as const).map(item => (
            <p key={item} style={{ color: '#1D1D1F', borderLeft: '2px solid #E5E5E5', paddingLeft: '16px' }}>{item}</p>
          ))}
        </div>
      </section>

      {/* ── RESPONSABILITÉS ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <LegalTitle>Responsabilités</LegalTitle>
        <div className="mt-6 max-w-3xl grid gap-8 md:grid-cols-2">
          <div>
            <p className="font-semibold" style={{ color: '#000000' }}>Engagement de l'éditeur</p>
            <p className="mt-2" style={{ color: '#6E6E73' }}>
              L'éditeur met en œuvre des moyens raisonnables pour assurer la disponibilité, la sécurité et la cohérence du service, sans pouvoir garantir une absence totale d'interruption.
            </p>
          </div>
          <div>
            <p className="font-semibold" style={{ color: '#000000' }}>Engagement de l'utilisateur</p>
            <p className="mt-2" style={{ color: '#6E6E73' }}>
              L'utilisateur s'engage à protéger ses identifiants, vérifier les informations critiques et utiliser le service conformément à sa destination et aux lois applicables.
            </p>
          </div>
        </div>
      </section>

      {/* ── DROIT APPLICABLE ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <LegalTitle>Droit applicable</LegalTitle>
        <p className="mt-6 max-w-3xl" style={{ color: '#6E6E73' }}>
          Les présentes conditions sont soumises au droit français. En cas de question, contactez l'éditeur via la page contact ou consultez les documents juridiques complémentaires.
        </p>
      </section>

      {/* ── DOCUMENTS LIÉS ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <LegalTitle>Documents complémentaires</LegalTitle>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link to="/mentions-legales-public" className="text-sm font-semibold" style={{ color: '#2563EB' }}>
            Mentions légales
          </Link>
          <Link to="/politique-confidentialite" className="text-sm font-semibold" style={{ color: '#2563EB' }}>
            Politique de confidentialité
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
  return <h2 className="text-2xl font-semibold" style={{ color: '#000000' }}>{children}</h2>
}
