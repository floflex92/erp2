import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import { sitePhotos } from '@/site/lib/sitePhotos'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(80px, 10vw, 128px)' }

const heroStrip = [
  {
    t: '100% dédié',
    s: 'au transport routier',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>
    ),
  },
  {
    t: 'Conçu avec et pour',
    s: 'les transporteurs',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5M14 20c0-2.5 2-4 4-4s4 1.5 4 4" /></svg>
    ),
  },
  {
    t: 'Innovation française,',
    s: 'hébergée en Europe',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
    ),
  },
  {
    t: 'Une équipe passionnée',
    s: 'à vos côtés',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
    ),
  },
] as const

const differencePrinciples = [
  {
    title: 'Intelligence opérationnelle',
    body: 'Des données en temps réel pour des décisions plus rapides.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></svg>
    ),
  },
  {
    title: 'Automatisation maîtrisée',
    body: 'Moins de tâches répétitives, plus de valeur ajoutée.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
    ),
  },
  {
    title: 'Vision 360°',
    body: 'Une plateforme unifiée pour piloter l\'ensemble de votre activité.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
    ),
  },
  {
    title: 'Sécurité & fiabilité',
    body: 'Vos données sont protégées et hébergées en Europe.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z" /></svg>
    ),
  },
  {
    title: 'Évolutif par nature',
    body: 'Une solution qui grandit avec votre entreprise.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z" /><circle cx="12" cy="12" r="3" /></svg>
    ),
  },
] as const

const visionPrinciples = [
  {
    title: 'Ancré terrain',
    body: 'Chaque fonctionnalité est pensée depuis les contraintes réelles des exploitants, planificateurs et dirigeants transport.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5M14 20c0-2.5 2-4 4-4s4 1.5 4 4" /></svg>
    ),
  },
  {
    title: 'Clarté opérationnelle',
    body: 'L\'information critique doit être visible immédiatement pour réduire les angles morts et accélérer la décision.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="#0ea5e9" /></svg>
    ),
  },
  {
    title: 'Technologie utile',
    body: 'L\'innovation n\'a de valeur que si elle simplifie le quotidien et améliore la rentabilité des entreprises.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>
    ),
  },
] as const

const pressResources = [
  'Présentation institutionnelle NEXORA Truck (PDF)',
  'Kit média : logo et captures produit',
  'Communiqué vision marché transport francophone',
  'Contact presse et partenariats sectoriels',
] as const

export default function AboutPage() {
  useSiteMeta({
    title: 'À propos — ERP transport routier',
    description: 'Découvrez l\'histoire, la vision et l\'expertise NEXORA Truck pour moderniser durablement le transport routier dans l\'espace francophone.',
    canonicalPath: '/a-propos',
    keywords: 'à propos Nexora Truck, startup transport Marseille, vision ERP transport, modernisation transport routier',
    ogImage: 'https://nexora-truck.fr/site/screenshots/camions.png',
  })

  return (
    <>
      {/* ── HERO — full-width background image with left gradient overlay ── */}
      <section
        className="relative w-full overflow-hidden"
        style={{
          background: '#F0F9FF',
          paddingBlock: 'clamp(64px, 8vw, 120px)',
          ...sectionPx,
        }}
      >
        {/* Background image — full bleed */}
        <div className="pointer-events-none absolute inset-0">
          <img
            src={sitePhotos.aboutHero.src(1400)}
            srcSet={sitePhotos.aboutHero.srcSet([768, 1200, 1400])}
            sizes="100vw"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
            style={{ objectPosition: 'right center' }}
            loading="eager"
          />
          {/* Gradient overlay — white on the left fades to transparent on the right */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, #F0F9FF 0%, rgba(240,249,255,0.94) 28%, rgba(240,249,255,0.45) 52%, rgba(240,249,255,0) 78%)',
            }}
          />
        </div>

        {/* Foreground copy */}
        <div className="relative mx-auto w-full max-w-[1280px]">
          <div className="max-w-[620px]">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ borderColor: 'rgba(14,165,233,0.25)', background: 'rgba(14,165,233,0.10)', color: '#0369A1' }}
            >
              À propos de NEXORA
            </span>

            <h1
              className="mt-5 font-bold leading-[1.05]"
              style={{ fontSize: 'clamp(2rem, 4.4vw, 3.4rem)', color: '#0B1B3B', letterSpacing: '-0.02em' }}
            >
              Construire depuis Marseille la{' '}
              <span style={{ color: '#22c55e' }}>référence</span>{' '}
              <span style={{ color: '#0ea5e9' }}>technologique</span> du transport francophone
            </h1>

            <p className="mt-5 max-w-xl" style={{ color: '#475569', fontSize: '17px', lineHeight: 1.6 }}>
              NEXORA Truck naît d'une conviction forte : les transporteurs méritent un système d'exploitation moderne, unifié et orienté résultat.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/solution"
                className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(34,197,94,0.28)] transition-transform hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}
              >
                Découvrir notre vision
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-lg border bg-white px-5 py-3 text-sm font-semibold transition-colors"
                style={{ borderColor: '#CBD5E1', color: '#0B1B3B' }}
              >
                Rencontrer l'équipe
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {/* Spacer so the proof strip sits lower, like in the mockup */}
          <div style={{ height: 'clamp(60px, 10vw, 140px)' }} />

          {/* Bottom strip — 4 proof items */}
          <div
            className="grid gap-3 rounded-2xl border bg-white/90 p-3 backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-4"
            style={{ borderColor: 'rgba(15,23,42,0.08)', boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}
          >
            {heroStrip.map(item => (
              <div key={item.t + item.s} className="flex items-center gap-3 px-3 py-2">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(14,165,233,0.10)' }}
                >
                  {item.icon}
                </span>
                <div className="leading-tight">
                  <p className="text-[13px] font-bold" style={{ color: '#0B1B3B' }}>{item.t}</p>
                  <p className="text-[12px]" style={{ color: '#64748B' }}>{item.s}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NOTRE APPROCHE — split copy + dashboard mock with floating KPIs ── */}
      <section
        className="w-full"
        style={{ background: 'linear-gradient(180deg,#F8FAFC 0%, #EFF6FF 100%)', ...sectionPx, ...sectionPy }}
      >
        <div className="mx-auto grid w-full max-w-[1280px] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* Left — copy */}
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ borderColor: 'rgba(14,165,233,0.25)', background: 'rgba(14,165,233,0.10)', color: '#0369A1' }}
            >
              Notre approche
            </span>
            <h2
              className="mt-4 font-bold leading-[1.1]"
              style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.6rem)', color: '#0B1B3B', letterSpacing: '-0.015em' }}
            >
              Une technologie au service de la{' '}
              <span style={{ color: '#0ea5e9' }}>performance humaine</span>
            </h2>
            <p className="mt-4 max-w-lg" style={{ color: '#475569', fontSize: '16px', lineHeight: 1.6 }}>
              Nous combinons intelligence logicielle, automatisation et expertise métier pour vous faire gagner du temps, de la réactivité et de la rentabilité.
            </p>

            <ul className="mt-8 space-y-5">
              {differencePrinciples.map(p => (
                <li key={p.title} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(14,165,233,0.10)' }}
                  >
                    {p.icon}
                  </span>
                  <div className="leading-tight">
                    <p className="text-sm font-bold" style={{ color: '#0B1B3B' }}>{p.title}</p>
                    <p className="mt-1 text-[13.5px]" style={{ color: '#64748B', lineHeight: 1.5 }}>{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — dashboard mock with floating KPI cards */}
          <div className="relative mx-auto w-full" style={{ maxWidth: 640, aspectRatio: '1.02/1' }} aria-hidden="true">
            {/* Central dashboard */}
            <div
              className="absolute left-1/2 top-1/2 w-[82%] max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white shadow-[0_30px_70px_rgba(15,23,42,0.16)]"
              style={{ borderColor: '#E2E8F0' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: '#E2E8F0' }}>
                <img src="/site/logo/brand/nexora-logo-dark.png" alt="" className="h-4 w-auto object-contain" />
                <div className="mx-2 flex-1 rounded-md px-2 py-1 text-[8px]" style={{ background: '#F1F5F9', color: '#64748B' }}>
                  Rechercher…
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full" style={{ background: 'linear-gradient(135deg,#0ea5e9,#22c55e)' }} />
                  <span className="text-[8px] font-semibold" style={{ color: '#0B1B3B' }}>Alex M. ▾</span>
                </div>
              </div>

              <div className="grid grid-cols-[28%_72%]">
                {/* Sidebar */}
                <ul className="space-y-0.5 border-r py-2 pl-2 pr-1" style={{ borderColor: '#E2E8F0' }}>
                  {[
                    ['Tableau de bord', true],
                    ['Exploitation', false],
                    ['Planning', false],
                    ['Flotte', false],
                    ['Conducteurs', false],
                    ['Facturation', false],
                    ['Conformité', false],
                    ['Documents', false],
                    ['Statistiques', false],
                    ['Paramètres', false],
                  ].map(([label, active]) => (
                    <li
                      key={label as string}
                      className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[8px] font-medium"
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
                <div className="p-2.5">
                  <p className="text-[9px] font-bold" style={{ color: '#0B1B3B' }}>Vue d'ensemble</p>

                  {/* KPI row — 4 cards */}
                  <div className="mt-1.5 grid grid-cols-4 gap-1">
                    {[
                      { label: 'Courses du jour', value: '28', delta: '+12%' },
                      { label: 'Livraisons', value: '156', delta: '+8%' },
                      { label: 'Taux de service', value: '98,6%', delta: '+2,1%' },
                      { label: 'Chiffre d\'affaires', value: '32 430 €', delta: '+14%' },
                    ].map(k => (
                      <div key={k.label} className="rounded-md border p-1" style={{ borderColor: '#E2E8F0' }}>
                        <p className="truncate text-[5.5px] font-medium" style={{ color: '#64748B' }}>{k.label}</p>
                        <p className="mt-0.5 text-[8.5px] font-extrabold leading-tight" style={{ color: '#0B1B3B' }}>{k.value}</p>
                        <p className="text-[5px] font-semibold" style={{ color: '#16A34A' }}>{k.delta}</p>
                      </div>
                    ))}
                  </div>

                  {/* Map header with tabs */}
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[7.5px] font-semibold" style={{ color: '#0B1B3B' }}>Suivi des expéditions</p>
                    <div className="flex items-center gap-1">
                      <span className="rounded px-1.5 py-0.5 text-[6px] font-semibold" style={{ background: 'rgba(14,165,233,0.12)', color: '#0ea5e9' }}>Carte</span>
                      <span className="text-[6px]" style={{ color: '#94A3B8' }}>Liste</span>
                    </div>
                  </div>

                  {/* Map */}
                  <div className="mt-1 h-20 overflow-hidden rounded-md border" style={{ borderColor: '#E2E8F0', background: 'linear-gradient(135deg,#E0F2FE,#DCFCE7)' }}>
                    <svg viewBox="0 0 220 90" className="h-full w-full" preserveAspectRatio="none">
                      <path d="M10 70 Q 60 20, 110 55 T 210 35" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="2 2" />
                      <circle cx="40" cy="55" r="3" fill="#0ea5e9" />
                      <circle cx="115" cy="54" r="3" fill="#22c55e" />
                      <circle cx="190" cy="40" r="3" fill="#22c55e" />
                    </svg>
                  </div>

                  {/* Planning bars */}
                  <p className="mt-2 text-[7.5px] font-semibold" style={{ color: '#0B1B3B' }}>Planning du jour</p>
                  <div className="mt-1 space-y-0.5">
                    {[
                      { name: 'Camion 12', route: 'Marseille → Lyon', segs: [{ l: 5, w: 35, c: '#22c55e' }] },
                      { name: 'Camion 31', route: 'Paris → Paris', segs: [{ l: 30, w: 25, c: '#0ea5e9' }] },
                      { name: 'Camion 54', route: 'Bordeaux → Toulouse', segs: [{ l: 15, w: 40, c: '#22c55e' }] },
                      { name: 'Camion 72', route: 'Toulouse → Montpellier', segs: [{ l: 55, w: 35, c: '#22c55e' }] },
                    ].map(r => (
                      <div key={r.name} className="grid grid-cols-[22%_78%] items-center gap-1">
                        <span className="truncate text-[6px]" style={{ color: '#64748B' }}>{r.name}</span>
                        <div className="relative h-2 rounded-sm" style={{ background: '#F1F5F9' }}>
                          {r.segs.map((s, i) => (
                            <span
                              key={i}
                              className="absolute top-0 flex h-full items-center justify-center rounded-sm px-1 text-[5px] font-semibold text-white"
                              style={{ left: `${s.l}%`, width: `${s.w}%`, background: s.c, opacity: 0.95 }}
                            >
                              <span className="truncate">{r.route}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating KPI card — Exploitation (top-left) */}
            <div
              className="absolute rounded-xl border bg-white px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.12)]"
              style={{ borderColor: '#E2E8F0', left: '2%', top: '3%' }}
            >
              <p className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: '#0ea5e9' }}>
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 20V10M18 20V6M12 20V14" /></svg>
                Exploitation
              </p>
              <p className="mt-0.5 text-[9px]" style={{ color: '#64748B' }}>Courses du jour</p>
              <p className="text-[22px] font-extrabold leading-none" style={{ color: '#0B1B3B' }}>28</p>
              <p className="mt-0.5 text-[9px] font-semibold" style={{ color: '#16A34A' }}>+12% vs hier</p>
            </div>

            {/* Floating KPI — Performance (top-right) */}
            <div
              className="absolute rounded-xl border bg-white px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.12)]"
              style={{ borderColor: '#E2E8F0', right: '2%', top: '4%' }}
            >
              <p className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: '#22c55e' }}>
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 7-7" /></svg>
                Performance
              </p>
              <p className="text-[22px] font-extrabold leading-none" style={{ color: '#0B1B3B' }}>98,6%</p>
              <p className="mt-0.5 text-[9px]" style={{ color: '#64748B' }}>Taux de service</p>
              <p className="mt-0.5 text-[9px] font-semibold" style={{ color: '#16A34A' }}>+4,1% vs mois dernier</p>
              <svg viewBox="0 0 80 20" className="mt-1 h-3 w-14" preserveAspectRatio="none">
                <path d="M2 16 L14 12 L26 14 L38 8 L50 10 L62 4 L78 2" fill="none" stroke="#22c55e" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Floating KPI — Flotte (bottom-left) */}
            <div
              className="absolute rounded-xl border bg-white px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.12)]"
              style={{ borderColor: '#E2E8F0', left: '2%', bottom: '10%' }}
            >
              <p className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: '#0ea5e9' }}>
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>
                Flotte
              </p>
              <p className="text-[22px] font-extrabold leading-none" style={{ color: '#0B1B3B' }}>156</p>
              <p className="mt-0.5 text-[9px]" style={{ color: '#64748B' }}>Véhicules connectés</p>
              <p className="mt-0.5 text-[9px] font-semibold" style={{ color: '#16A34A' }}>+10% vs hier</p>
              <svg viewBox="0 0 80 20" className="mt-1 h-3 w-14" preserveAspectRatio="none">
                <path d="M2 16 L14 14 L26 12 L38 10 L50 8 L62 6 L78 4" fill="none" stroke="#0ea5e9" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Floating KPI — Rentabilité (right) */}
            <div
              className="absolute rounded-xl border bg-white px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.12)]"
              style={{ borderColor: '#E2E8F0', right: '0%', top: '42%' }}
            >
              <p className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: '#0ea5e9' }}>
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
                Rentabilité
              </p>
              <p className="text-[20px] font-extrabold leading-none" style={{ color: '#0B1B3B' }}>32 430 €</p>
              <p className="mt-0.5 text-[9px]" style={{ color: '#64748B' }}>Chiffre d'affaires</p>
              <p className="mt-0.5 text-[9px] font-semibold" style={{ color: '#16A34A' }}>+6,2% vs mois dernier</p>
              <svg viewBox="0 0 80 24" className="mt-1 h-4 w-16" preserveAspectRatio="none">
                <path d="M2 20 L14 16 L26 18 L38 10 L50 12 L62 6 L78 4" fill="none" stroke="#0ea5e9" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Floating KPI — Conformité (bottom-right) */}
            <div
              className="absolute rounded-xl border bg-white px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.12)]"
              style={{ borderColor: '#E2E8F0', right: '2%', bottom: '3%' }}
            >
              <p className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: '#22c55e' }}>
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
                Conformité
              </p>
              <p className="text-[22px] font-extrabold leading-none" style={{ color: '#0B1B3B' }}>100%</p>
              <p className="mt-0.5 text-[9px]" style={{ color: '#64748B' }}>Documents à jour</p>
              <p className="mt-0.5 text-[9px] font-semibold" style={{ color: '#16A34A' }}>Aucune anomalie</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── VISION — 3 principles with icons on top ── */}
      <section
        className="w-full bg-white"
        style={{ ...sectionPx, ...sectionPy }}
      >
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: '#0369A1' }}>
            Vision
          </p>
          <h2
            className="mt-4 max-w-2xl font-bold leading-[1.1]"
            style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.4rem)', color: '#0B1B3B', letterSpacing: '-0.015em' }}
          >
            Une approche humaine et technologique
          </h2>
          <p className="mt-4 max-w-2xl" style={{ color: '#64748B', fontSize: '15.5px', lineHeight: 1.6 }}>
            Nous développons un produit robuste, mais aussi une relation durable avec les équipes terrain.
          </p>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {visionPrinciples.map(item => (
              <div key={item.title}>
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(14,165,233,0.10)' }}
                >
                  {item.icon}
                </span>
                <h3 className="mt-5 text-lg font-bold" style={{ color: '#0B1B3B' }}>{item.title}</h3>
                <p className="mt-2 text-[14.5px]" style={{ color: '#64748B', lineHeight: 1.6 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRESS RESOURCES ── */}
      <section
        className="w-full"
        style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}
      >
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: '#6E6E73' }}>
                Espace presse
              </p>
              <h2
                className="mt-4 font-bold leading-[1.1]"
                style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: '#0B1B3B', letterSpacing: '-0.015em' }}
              >
                Ressources pour<br />partenaires et médias
              </h2>
            </div>

            <ul className="divide-y rounded-2xl border bg-white" style={{ borderColor: '#E5E7EB' }}>
              {pressResources.map(item => (
                <li key={item} className="flex items-center justify-between gap-4 px-5 py-4" style={{ borderColor: '#E5E7EB' }}>
                  <span className="text-[14.5px]" style={{ color: '#0B1B3B' }}>{item}</span>
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: '#F1F5F9', color: '#0B1B3B' }}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v14M6 13l6 6 6-6M4 21h16" /></svg>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="relative w-full overflow-hidden text-center"
        style={{
          background: 'linear-gradient(180deg, #EFF6FF 0%, #E0F2FE 100%)',
          ...sectionPx,
          paddingBlock: 'clamp(80px, 10vw, 128px)',
        }}
      >
        <svg aria-hidden="true" viewBox="0 0 1440 200" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full opacity-40">
          <path d="M0 120 Q 360 40 720 120 T 1440 120" fill="none" stroke="#93C5FD" strokeWidth="1" />
          <path d="M0 160 Q 360 80 720 160 T 1440 160" fill="none" stroke="#93C5FD" strokeWidth="1" />
        </svg>
        <div className="relative mx-auto max-w-3xl">
          <h2
            className="font-bold leading-[1.1]"
            style={{ fontSize: 'clamp(1.8rem, 3.6vw, 2.6rem)', color: '#0B1B3B', letterSpacing: '-0.015em' }}
          >
            Parlons de votre feuille de route<br />digitale transport
          </h2>
          <p className="mx-auto mt-5 max-w-xl" style={{ color: '#475569', fontSize: '15.5px', lineHeight: 1.6 }}>
            Nous opérons avec vous une trajectoire réaliste : quick wins opérationnels, montée en puissance, puis extension progressive des modules.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(34,197,94,0.28)] transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}
            >
              Contactez l'équipe
            </Link>
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-5 py-3 text-sm font-semibold transition-colors"
              style={{ borderColor: '#CBD5E1', color: '#0B1B3B' }}
            >
              Réserver une démo
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
