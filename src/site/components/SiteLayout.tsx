import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import CookieBanner, { reopenCookiePreferences } from '@/site/components/CookieBanner'
import AnalyticsLoader from '@/site/components/AnalyticsLoader'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

const NAV_ITEMS = [
  { label: 'Fonctionnalités', to: '/fonctionnalites' },
  { label: 'Blog', to: '/articles' },
  { label: 'À propos', to: '/a-propos' },
  { label: 'Contact', to: '/contact' },
]

// Pages avec un hero photo sombre (overlay rgba(0,0,0,0.45)) → nav blanche quand non-scrollé
const DARK_HERO_PATHS = new Set([
  '/',
  '/fonctionnalites',
  '/toutes-les-fonctionnalites',
  '/demonstration',
  '/a-propos',
  '/contact',
  '/connexion-erp',
  '/avantages-roi',
  '/planning-intelligent',
  '/secteur-transport',
  '/solution',
])

export default function SiteLayout() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  const hasDarkHero = DARK_HERO_PATHS.has(pathname)
  const navTextColor = (!isScrolled && hasDarkHero) ? '#FFFFFF' : '#1D1D1F'

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="site-shell min-h-screen">
      <ScrollToTop />
      <header
        className={`site-header-panel fixed left-0 right-0 top-0 z-40 transition-all ${isScrolled ? 'is-scrolled' : ''}`}
        style={{ paddingInline: 'clamp(24px, 8vw, 160px)' }}
      >
        <div className="flex h-12 items-center justify-between">
          <Link to="/" className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'Outfit, Inter, sans-serif', color: navTextColor }}>
            NEXORA
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {NAV_ITEMS.map(item => (
              <Link key={item.to} to={item.to} className="site-nav-pill transition-colors" style={{ color: navTextColor }}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="inline-flex min-h-[44px] items-center px-1 text-sm font-medium transition-colors"
              style={{ color: navTextColor }}
            >
              Connexion
            </Link>
            <Link
              to="/connexion-erp"
              className="site-btn-primary px-4 py-2 text-sm transition-colors"
            >
              Essai gratuit
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 text-sm font-medium lg:hidden"
              style={{ color: navTextColor }}
              aria-label="Ouvrir le menu"
            >
              {menuOpen ? '✕' : 'Menu'}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="grid gap-1 pb-4 pt-2 lg:hidden">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium transition-colors"
                style={{ color: navTextColor }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium transition-colors"
              style={{ color: navTextColor }}
            >
              Connexion
            </Link>
          </nav>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <footer style={{ background: '#F5F5F7', paddingInline: 'clamp(24px, 8vw, 160px)', paddingBlock: '64px 40px' }}>
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'Outfit, Inter, sans-serif', color: '#1D1D1F' }}>
              NEXORA
            </p>
            <p className="mt-3 max-w-md text-sm leading-7" style={{ color: '#4b4b51' }}>
              ERP transport routier pour piloter exploitation, planning, flotte, conformité et facturation.
            </p>
            <Link
              to="/erp-transport"
              className="mt-5 inline-flex min-h-[44px] items-center rounded-full border border-slate-300 px-4 text-[12px] font-medium transition-colors hover:border-slate-400"
              style={{ color: '#4b4b51' }}
            >
              SEO
            </Link>
          </div>

          <div className="grid gap-8 text-sm sm:grid-cols-2 sm:gap-10 lg:grid-cols-4 lg:gap-12" style={{ color: '#4b4b51' }}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#636369' }}>Produit</p>
              <div className="mt-3 grid gap-2.5">
                <Link to="/fonctionnalites" className="site-footer-link">Fonctionnalités</Link>
                <Link to="/articles" className="site-footer-link">Blog</Link>
                <Link to="/demonstration" className="site-footer-link">Démonstration</Link>
                <Link to="/connexion-erp" className="site-footer-link">Essai gratuit</Link>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#636369' }}>Solutions</p>
              <div className="mt-3 grid gap-2.5">
                <Link to="/erp-transport" className="site-footer-link">ERP transport</Link>
                <Link to="/tms-transport" className="site-footer-link">TMS transport</Link>
                <Link to="/logiciel-transport" className="site-footer-link">Logiciel transport</Link>
                <Link to="/logiciel-gestion-flotte-camion" className="site-footer-link">Gestion flotte</Link>
                <Link to="/telematique-transport" className="site-footer-link">Télématique</Link>
                <Link to="/chronotachygraphe" className="site-footer-link">Chronotachygraphe</Link>
                <Link to="/ia-transport" className="site-footer-link">IA transport</Link>
                <Link to="/integrations" className="site-footer-link">Intégrations API</Link>
                <Link to="/erp-transport-routier" className="site-footer-link">ERP routier</Link>
                <Link to="/planning-intelligent" className="site-footer-link">Planning intelligent</Link>
                <Link to="/facturation-transport" className="site-footer-link">Facturation transport</Link>
                <Link to="/affretement-transport" className="site-footer-link">Affrètement</Link>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#636369' }}>Entreprise</p>
              <div className="mt-3 grid gap-2.5">
                <Link to="/a-propos" className="site-footer-link">À propos</Link>
                <Link to="/contact" className="site-footer-link">Contact</Link>
                <Link to="/login" className="site-footer-link">Connexion</Link>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#636369' }}>Légal</p>
              <div className="mt-3 grid gap-2.5">
                <Link to="/mentions-legales-public" className="site-footer-link">Mentions légales</Link>
                <Link to="/politique-confidentialite" className="site-footer-link">Confidentialité</Link>
                <Link to="/conditions-generales-utilisation" className="site-footer-link">CGU</Link>
                <button
                  type="button"
                  onClick={reopenCookiePreferences}
                  className="site-footer-link w-fit text-left transition-colors"
                >
                  Préférences cookies
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 flex items-center justify-between">
          <p className="text-xs" style={{ color: '#636369' }}>© 2026 NEXORA Truck — Tous droits réservés</p>
          <div className="flex gap-1">
            <a href="https://www.linkedin.com/company/nexora-truck/?viewAsMember=true" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="flex h-11 w-11 items-center justify-center rounded-lg transition-opacity hover:opacity-70">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#636369"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="https://twitter.com/nexoratruck" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="flex h-11 w-11 items-center justify-center rounded-lg transition-opacity hover:opacity-70">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#636369"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://www.facebook.com/profile.php?id=61575439001023&locale=fr_FR" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex h-11 w-11 items-center justify-center rounded-lg transition-opacity hover:opacity-70">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#636369"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            </div>
        </div>
        <p className="mt-6 max-w-5xl text-xs leading-6" style={{ color: '#4b4b51' }}>
          NEXORA Truck est un ERP transport routier conçu pour centraliser la gestion opérationnelle, le planning transport,
          la flotte, les conducteurs, la conformité et la facturation dans un environnement unique. La plateforme aide les
          transporteurs à réduire les ressaisies, sécuriser les données métier et piloter la rentabilité en temps réel.
          Adapté aux entreprises de transport routier de marchandises, NEXORA combine les usages d’un TMS moderne, d’un cockpit
          d’exploitation et d’outils de coordination terrain pour améliorer la qualité de service sans complexifier l’expérience
          utilisateur.
        </p>
      </footer>
      <CookieBanner />
      <AnalyticsLoader />
    </div>
  )
}
