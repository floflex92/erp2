import { Link, NavLink, Outlet } from 'react-router-dom'
import NexoraTruckLogo from '@/components/layout/NexoraTruckLogo'
import CookieBanner, { reopenCookiePreferences } from '@/site/components/CookieBanner'
import { useAuth } from '@/lib/auth'
import { siteNav } from '@/site/content'

function navClassName(isActive: boolean) {
  return `rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-white hover:text-slate-950'}`
}

export default function SiteLayout() {
  const { session } = useAuth()
  const erpEntryLabel = session ? 'Ouvrir l ERP' : 'Connexion ERP'

  return (
    <div className="site-shell min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.12),transparent_25%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_25%,#fff8f1_55%,#f8fbff_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1240px] flex-col px-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-40 py-4">
          <div className="mb-3 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-600">
            <span>Vitrine digitale NEXORA Truck</span>
            <span className="rounded-full border border-white/70 bg-white/75 px-3 py-1 text-slate-700 shadow-sm">ERP transport pour le marché francophone</span>
          </div>
          <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(248,250,252,0.88)] px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur lg:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <Link to="/" className="w-fit">
                <NexoraTruckLogo size="sm" subtitle="Site public" />
              </Link>

              <nav className="flex flex-wrap items-center gap-2">
                {siteNav.map(item => (
                  <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => navClassName(isActive)}>
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/contact"
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-white"
                >
                  Parler de votre projet
                </Link>
                <Link
                  to="/connexion-erp"
                  className="rounded-full bg-[#1d4ed8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1e40af]"
                >
                  {erpEntryLabel}
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 py-6 sm:py-8">
          <Outlet />
        </main>

        <footer className="pb-8 pt-4">
          <div className="rounded-[1.9rem] border border-white/70 bg-white/85 px-6 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <NexoraTruckLogo size="sm" subtitle="ERP transport" />
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">
                  NEXORA Truck présente une vision claire: centraliser exploitation, planning, flotte et performance financière pour aider les dirigeants transport à piloter avec confiance.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Exploitation</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Planning intelligent</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Flotte</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">RH</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">ROI</span>
                </div>
              </div>

              <div className="grid gap-6 text-sm text-slate-600 sm:grid-cols-3 sm:gap-10">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Parcours</p>
                  <div className="mt-3 grid gap-3">
                    <Link to="/solution" className="hover:text-slate-950">La solution</Link>
                    <Link to="/planning-intelligent" className="hover:text-slate-950">Planning intelligent</Link>
                    <Link to="/avantages-roi" className="hover:text-slate-950">Avantages et ROI</Link>
                    <Link to="/secteur-transport" className="hover:text-slate-950">Secteur transport</Link>
                    <Link to="/demonstration" className="hover:text-slate-950">Démonstration</Link>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Entreprise</p>
                  <div className="mt-3 grid gap-3">
                    <Link to="/a-propos" className="hover:text-slate-950">À propos</Link>
                    <Link to="/contact" className="hover:text-slate-950">Contact</Link>
                    <Link to="/erp-transport-tms" className="hover:text-slate-950">SEO ERP transport</Link>
                    <Link to="/connexion-erp" className="hover:text-slate-950">Entrée ERP</Link>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Légal</p>
                  <div className="mt-3 grid gap-3">
                    <Link to="/mentions-legales-public" className="hover:text-slate-950">Mentions légales</Link>
                    <Link to="/politique-confidentialite" className="hover:text-slate-950">Politique de confidentialité</Link>
                    <Link to="/conditions-generales-utilisation" className="hover:text-slate-950">CGU</Link>
                    <button
                      type="button"
                      onClick={reopenCookiePreferences}
                      className="w-fit text-left text-slate-600 transition-colors hover:text-slate-950"
                    >
                      Préférences cookies
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
      <CookieBanner />
    </div>
  )
}