import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(80px, 12vw, 160px)' }

const modules = [
  { title: 'Exploitation & courses', desc: 'Créez, suivez et clôturez vos ordres de transport depuis un cockpit unique. Statuts en temps réel, alertes de retard, historique complet.', kpi: '+120 OT/jour gérés en moyenne' },
  { title: 'Planning intelligent', desc: 'Affectez conducteurs et véhicules en glisser-déposer. Vue charge, arbitrage assisté, groupage et absorption des urgences.', kpi: '-31 % de temps passé sur le planning' },
  { title: 'Gestion de flotte', desc: 'Disponibilité temps réel, alertes CT/VGP, suivi kilométrique, maintenance préventive. Tout le parc roulant dans un seul écran.', kpi: '98,7 % de disponibilité opérationnelle' },
  { title: 'Conducteurs & conformité', desc: 'Dossier conducteur complet : documents, permis, FIMO/FCO, visite médicale, heures de service, historique missions.', kpi: '-42 % de non-conformités documentaires' },
  { title: 'Facturation & finance', desc: 'Générez vos factures depuis les OT validés. Relances automatiques, exports comptables, suivi de la marge par mission.', kpi: '-60 % de temps sur la facturation' },
  { title: 'API & intégrations', desc: 'Connectez Webfleet, tachygraphe numérique, portail client et flux fret. Architecture ouverte pour automatiser les tâches répétitives.', kpi: '+14 % de marge opérationnelle' },
] as const

const extras = [
  'Tableau de bord temps réel avec KPIs exploitation',
  'Carte live des véhicules avec géolocalisation',
  'Gestion des remorques et équipements',
  'Chronotachygraphe et données de conduite',
  'PV et amendes : suivi et contestation',
  'Ressources humaines : entretiens, documents, paie',
  'Communication interne : tchat et notifications',
  'Portail client et portail affréteur',
  'Coffre-fort numérique pour documents sensibles',
  'Prospection commerciale et CRM intégré',
] as const

export default function FeaturesPage() {
  useSiteMeta({
    title: 'Fonctionnalités ERP transport',
    description: 'Fonctionnalités ERP transport NEXORA Truck : planning, flotte, conducteurs, facturation, télématique, chronotachygraphe, IA et API.',
    canonicalPath: '/fonctionnalites',
    keywords: 'fonctionnalités ERP transport, planning transport, gestion flotte, facturation transport, conformité conducteurs, TMS transport, logiciel exploitation transport, IA transport',
  })

  return (
    <>
      {/* ── HERO ── */}
      <section
        className="relative w-full overflow-hidden"
        style={{
          ...sectionPx,
          paddingTop: 'clamp(120px, 13vw, 170px)',
          paddingBottom: 'clamp(80px, 10vw, 140px)',
          background:
            'radial-gradient(1200px 600px at 85% -10%, rgba(14,165,233,0.14), transparent 60%), radial-gradient(900px 500px at -10% 20%, rgba(249,115,22,0.08), transparent 60%), linear-gradient(180deg, #FFFFFF 0%, #F4F9FE 55%, #EAF2FB 100%)',
        }}
        aria-labelledby="features-hero-heading"
      >
        {/* Subtle grid texture */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse at 50% 40%, #000 35%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 40%, #000 35%, transparent 75%)',
          }}
        />
        {/* Glow blob */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-[-10%] hidden h-[520px] w-[520px] rounded-full blur-3xl lg:block"
          style={{ background: 'radial-gradient(closest-side, rgba(14,165,233,0.22), transparent 70%)' }}
        />
        {/* Soft wave at bottom */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full"
        >
          <path d="M0 40 C 240 80, 480 0, 720 30 S 1200 70, 1440 30 L1440 80 L0 80 Z" fill="#FFFFFF" opacity="0.9" />
        </svg>

        <div className="relative grid items-center gap-14 lg:grid-cols-[0.95fr_1.1fr]">
          {/* Left — title & CTA */}
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em]"
              style={{ borderColor: 'rgba(14,165,233,0.28)', background: 'rgba(14,165,233,0.08)', color: '#0369A1' }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#0ea5e9' }} />
              Fonctionnalités
            </span>
            <h1
              id="features-hero-heading"
              className="mt-6 font-extrabold leading-[0.98] tracking-tight"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 4.6rem)', color: '#0B1B3B', letterSpacing: '-0.02em' }}
            >
              Fonctionnalités ERP transport.
              <br />
              <span className="site-hero-gradient-text">Planning, flotte, facturation.</span>
            </h1>
            <p className="mt-6 max-w-xl" style={{ color: '#334155', fontSize: 'clamp(1rem, 1.15vw, 1.1rem)', lineHeight: 1.7 }}>
              12 modules intégrés pour piloter planning, flotte, conducteurs, facturation et conformité — sans jamais changer d’écran.
            </p>

            {/* Quick value chips */}
            <ul className="mt-6 flex flex-wrap gap-2">
              {[
                'Temps réel',
                'Données hébergées en Europe',
                'Sans engagement',
                'Intégrations ouvertes',
              ].map(tag => (
                <li
                  key={tag}
                  className="rounded-full border bg-white px-3 py-1.5 text-[12px] font-semibold"
                  style={{ borderColor: '#E2E8F0', color: '#0B1B3B' }}
                >
                  {tag}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/connexion-erp" className="site-hero-cta">
                Essai gratuit — 14 jours
              </Link>
              <Link
                to="/demonstration"
                className="inline-flex min-h-[48px] items-center rounded-xl border px-5 py-3 text-sm font-semibold transition-colors"
                style={{ borderColor: '#0ea5e9', color: '#0ea5e9', background: '#FFFFFF' }}
              >
                Voir la démonstration
              </Link>
              <Link
                to="/toutes-les-fonctionnalites"
                className="inline-flex min-h-[48px] items-center rounded-xl border px-5 py-3 text-sm font-semibold transition-colors"
                style={{ borderColor: '#F97316', color: '#F97316', background: '#FFFFFF' }}
              >
                Toutes les fonctionnalités&nbsp;→
              </Link>
            </div>

            {/* Proof row */}
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-6 border-t pt-6" style={{ borderColor: 'rgba(15,23,42,0.08)' }}>
              {[
                { v: '12', l: 'modules intégrés' },
                { v: '80+', l: 'fonctionnalités' },
                { v: '14 j', l: 'd’essai gratuit' },
              ].map(s => (
                <div key={s.l}>
                  <p className="text-2xl font-extrabold leading-none" style={{ color: '#0B1B3B' }}>{s.v}</p>
                  <p className="mt-1 text-xs font-medium" style={{ color: '#64748B' }}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — dashboard mock with orbiting modules (virtuous circle) */}
          <div
            className="relative mx-auto w-full"
            style={{ maxWidth: 780, aspectRatio: '1 / 1' }}
            aria-hidden="true"
          >
            {/* Orbit ellipse */}
            <svg viewBox="0 0 600 600" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="features-orbit-grad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.55" />
                </linearGradient>
              </defs>
              <ellipse
                cx="300"
                cy="300"
                rx="262"
                ry="242"
                fill="none"
                stroke="url(#features-orbit-grad)"
                strokeWidth="1.5"
                strokeDasharray="3 6"
              />
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i / 12) * Math.PI * 2 - Math.PI / 2
                const cx = 300 + Math.cos(angle) * 262
                const cy = 300 + Math.sin(angle) * 242
                return <circle key={i} cx={cx} cy={cy} r="3.5" fill="#0ea5e9" opacity="0.7" />
              })}
            </svg>

            {/* Orbit pills positioned on the ellipse */}
            {([
              { title: 'Planning', sub: 'Optimisez vos ressources', color: '#0ea5e9', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2.5" /><path d="M8 2v4M16 2v4M3 9h18" /></svg>
              ) },
              { title: 'Exploitation', sub: 'Opérations temps réel', color: '#0ea5e9', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 20V10M18 20V6M12 20V14" /><circle cx="6" cy="7" r="2" /><circle cx="12" cy="11" r="2" /><circle cx="18" cy="3" r="2" /></svg>
              ) },
              { title: 'Flotte', sub: 'Parc véhicules', color: '#0ea5e9', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>
              ) },
              { title: 'Facturation', sub: 'Automatique', color: '#22c55e', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
              ) },
              { title: 'Statistiques', sub: 'KPI temps réel', color: '#0ea5e9', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>
              ) },
              { title: 'API & Intégr.', sub: 'Outils & partenaires', color: '#0ea5e9', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4" /></svg>
              ) },
              { title: 'IA & Auto.', sub: 'Gain de temps', color: '#8B5CF6', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></svg>
              ) },
              { title: 'Portail client', sub: 'Temps réel', color: '#0ea5e9', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>
              ) },
              { title: 'RH', sub: 'Absences & entretiens', color: '#0ea5e9', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5M14 20c0-2.5 2-4 4-4s4 1.5 4 4" /></svg>
              ) },
              { title: 'Documents', sub: 'Coffre-fort', color: '#F59E0B', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
              ) },
              { title: 'Conformité', sub: 'Réglementation', color: '#22c55e', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
              ) },
              { title: 'Conducteurs', sub: 'Équipes & plannings', color: '#0ea5e9', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" /></svg>
              ) },
            ] as const).map((pill, i, arr) => {
              // Distribute on ellipse, starting from top and going clockwise
              const angle = (i / arr.length) * Math.PI * 2 - Math.PI / 2
              const rx = 43.7
              const ry = 40.3
              const cx = 50 + Math.cos(angle) * rx
              const cy = 50 + Math.sin(angle) * ry
              return (
                <div
                  key={pill.title}
                  className="absolute flex w-[160px] items-start gap-2 rounded-2xl border bg-white px-2.5 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                  style={{
                    left: `${cx}%`,
                    top: `${cy}%`,
                    transform: 'translate(-50%, -50%)',
                    borderColor: '#E2E8F0',
                  }}
                >
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${pill.color}1A`, color: pill.color }}
                  >
                    {pill.icon}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-[10.5px] font-extrabold uppercase tracking-[0.06em]" style={{ color: '#0B1B3B' }}>{pill.title}</p>
                    <p className="mt-0.5 truncate text-[9.5px]" style={{ color: '#64748B' }}>{pill.sub}</p>
                  </div>
                </div>
              )
            })}

            {/* Central dashboard card */}
            <div
              className="absolute left-1/2 top-1/2 w-[58%] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white shadow-[0_30px_70px_rgba(15,23,42,0.22)]"
              style={{ borderColor: '#E2E8F0' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b px-2.5 py-1.5" style={{ borderColor: '#E2E8F0' }}>
                <img src="/site/logo/brand/nexora-logo-dark.webp" alt="" className="h-3.5 w-auto object-contain" />
                <div className="flex items-center gap-1">
                  <span className="relative inline-block h-3 w-3 rounded-full" style={{ background: '#F1F5F9' }}>
                    <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full" style={{ background: '#EF4444' }} />
                  </span>
                  <span className="h-4 w-4 rounded-full" style={{ background: 'linear-gradient(135deg,#0ea5e9,#22c55e)' }} />
                  <p className="text-[7px] font-semibold" style={{ color: '#0B1B3B' }}>Alex M.</p>
                </div>
              </div>

              <div className="grid grid-cols-[34%_66%]">
                {/* Sidebar */}
                <ul className="space-y-0.5 border-r py-1.5 pl-1.5 pr-1" style={{ borderColor: '#E2E8F0' }}>
                  {[
                    ['Tableau de bord', true],
                    ['Exploitation', false],
                    ['Planning', false],
                    ['Flotte', false],
                    ['Conducteurs', false],
                    ['Facturation', false],
                    ['Conformité', false],
                    ['Documents', false],
                  ].map(([label, active]) => (
                    <li
                      key={label as string}
                      className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[7.5px] font-medium"
                      style={{
                        background: active ? 'rgba(14,165,233,0.10)' : 'transparent',
                        color: active ? '#0ea5e9' : '#475569',
                      }}
                    >
                      <span className="h-1 w-1 shrink-0 rounded-full" style={{ background: active ? '#0ea5e9' : '#CBD5E1' }} />
                      <span className="truncate">{label as string}</span>
                    </li>
                  ))}
                </ul>

                {/* Content */}
                <div className="p-2">
                  <p className="text-[8.5px] font-bold" style={{ color: '#0B1B3B' }}>Tableau de bord</p>

                  {/* KPI row */}
                  <div className="mt-1.5 grid grid-cols-2 gap-1">
                    {[
                      { label: 'Courses', value: '28', delta: '+12%' },
                      { label: 'Livraisons', value: '156', delta: '+8%' },
                      { label: 'Taux serv.', value: '98,6%', delta: '+2,1%' },
                      { label: 'CA', value: '32,4k€', delta: '+15%' },
                    ].map(k => (
                      <div key={k.label} className="rounded-md border p-1" style={{ borderColor: '#E2E8F0' }}>
                        <p className="truncate text-[6px] font-medium" style={{ color: '#64748B' }}>{k.label}</p>
                        <p className="mt-0.5 text-[9px] font-extrabold leading-tight" style={{ color: '#0B1B3B' }}>{k.value}</p>
                        <p className="flex items-center gap-0.5 text-[5.5px] font-semibold" style={{ color: '#16A34A' }}>
                          <svg viewBox="0 0 24 24" className="h-1.5 w-1.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H9M17 7v8" /></svg>
                          {k.delta}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Map */}
                  <div className="mt-1.5">
                    <p className="text-[6.5px] font-bold" style={{ color: '#0B1B3B' }}>Suivi temps réel</p>
                    <div className="mt-0.5 h-10 overflow-hidden rounded-md border" style={{ borderColor: '#E2E8F0', background: 'linear-gradient(135deg,#E0F2FE,#DCFCE7)' }}>
                      <svg viewBox="0 0 200 80" className="h-full w-full" preserveAspectRatio="none">
                        <path d="M10 60 Q 60 20, 110 55 T 190 30" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="2 2" />
                        <circle cx="40" cy="48" r="2.5" fill="#0ea5e9" />
                        <circle cx="110" cy="55" r="2.5" fill="#22c55e" />
                        <circle cx="175" cy="32" r="2.5" fill="#22c55e" />
                      </svg>
                    </div>
                  </div>

                  {/* Planning bars */}
                  <div className="mt-1.5">
                    <p className="text-[6.5px] font-bold" style={{ color: '#0B1B3B' }}>Planning du jour</p>
                    <div className="mt-0.5 space-y-0.5">
                      {[
                        { name: 'C12', segs: [{ l: 5, w: 25, c: '#22c55e' }, { l: 35, w: 30, c: '#0ea5e9' }] },
                        { name: 'C24', segs: [{ l: 15, w: 40, c: '#0ea5e9' }, { l: 60, w: 28, c: '#22c55e' }] },
                        { name: 'C31', segs: [{ l: 8, w: 30, c: '#F59E0B' }, { l: 45, w: 35, c: '#F59E0B' }] },
                      ].map(r => (
                        <div key={r.name} className="grid grid-cols-[18%_82%] items-center gap-1">
                          <span className="truncate text-[6px]" style={{ color: '#64748B' }}>{r.name}</span>
                          <div className="relative h-1.5 rounded-sm" style={{ background: '#F1F5F9' }}>
                            {r.segs.map((s, i) => (
                              <span
                                key={i}
                                className="absolute top-0 h-full rounded-sm"
                                style={{ left: `${s.l}%`, width: `${s.w}%`, background: s.c, opacity: 0.9 }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="relative mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: 'Plateforme complète', s: '12 modules intégrés', icon: (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg>
            ) },
            { t: 'Données sécurisées', s: 'Hébergées en Europe', icon: (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>
            ) },
            { t: 'Temps réel', s: 'Décisions plus rapides', icon: (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 10-3 6.7" /><path d="M21 5v5h-5" /></svg>
            ) },
            { t: 'Accompagnement', s: 'Support dédié', icon: (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#0B1B3B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15v-3a8 8 0 0116 0v3" /><rect x="2" y="14" width="5" height="7" rx="1.5" /><rect x="17" y="14" width="5" height="7" rx="1.5" /></svg>
            ) },
          ].map(f => (
            <div
              key={f.t}
              className="flex items-center gap-3 rounded-2xl border bg-white/80 px-4 py-3 backdrop-blur-sm"
              style={{ borderColor: 'rgba(15,23,42,0.08)', boxShadow: '0 8px 20px rgba(15,23,42,0.05)' }}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(14,165,233,0.08)' }}>
                {f.icon}
              </span>
              <div>
                <p className="text-sm font-bold" style={{ color: '#0B1B3B' }}>{f.t}</p>
                <p className="text-xs" style={{ color: '#64748B' }}>{f.s}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6 MODULES ── */}
      <section id="toutes-fonctionnalites" className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Modules</p>
        <h2 className="mt-4 max-w-3xl font-semibold leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}>
          Six piliers pour couvrir l’intégralité de votre métier
        </h2>
        <div className="mt-16 grid gap-x-20 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
          {modules.map(m => (
            <div key={m.title}>
              <h3 className="text-xl font-semibold" style={{ color: '#000000' }}>{m.title}</h3>
              <p className="mt-3" style={{ color: '#6E6E73' }}>{m.desc}</p>
              <p className="mt-3 text-sm font-semibold" style={{ color: '#2563EB' }}>{m.kpi}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ÉCOSYSTÈME ── */}
      <section className="w-full bg-white" style={{ ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Écosystème</p>
        <h2 className="mt-4 max-w-3xl font-semibold leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}>Et bien plus encore</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {extras.map(e => (
            <p key={e} style={{ color: '#1D1D1F', borderLeft: '2px solid #2563EB', paddingLeft: '16px', paddingBlock: '8px' }}>{e}</p>
          ))}
        </div>
      </section>

      {/* ── PAR PROFIL ── */}
      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#6E6E73' }}>Par profil</p>
        <h2 className="mt-4 max-w-3xl font-semibold leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}>Un même outil, trois visions</h2>
        <div className="mt-16 grid gap-x-20 gap-y-12 md:grid-cols-3">
          {([
            ['Exploitant', 'Cockpit temps réel, ordres de transport, alertes, planning et suivi de livraison. L’exploitant pilote sa journée sans quitter NEXORA.'],
            ['Direction', 'KPIs stratégiques, marge par mission, conformité globale, rentabilité par client. Le dirigeant prend des décisions éclairées.'],
            ['Conducteurs & RH', 'Dossier conducteur, documents à jour, heures de service, planning missions. L’équipe terrain reste connectée et conforme.'],
          ] as const).map(([t, d]) => (
            <div key={t}><h3 className="text-xl font-semibold" style={{ color: '#000000' }}>{t}</h3><p className="mt-3" style={{ color: '#6E6E73' }}>{d}</p></div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="w-full bg-white text-center" style={{ ...sectionPx, paddingBlock: 'clamp(100px, 14vw, 200px)' }}>
        <h2 className="mx-auto max-w-3xl text-balance font-semibold leading-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#000000' }}>
          Explorez chaque fonctionnalité par vous-même.
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/connexion-erp" className="site-btn-primary px-6 py-3 text-sm transition-colors">Essai gratuit</Link>
          <Link to="/contact" className="text-sm font-semibold" style={{ color: '#2563EB' }}>Parler à un expert</Link>
        </div>
      </section>

    </>
  )
}
