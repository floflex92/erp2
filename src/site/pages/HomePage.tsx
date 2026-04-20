import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import { sitePhotos } from '@/site/lib/sitePhotos'
import { articleIndex } from '@/site/content/articleIndex'
import conducteursScreenshot from '../../../docs/capture d ecran/mecano01.png'
import planningScreenshot from '../../../docs/capture d ecran/planning01.png'


/* ── Types ──────────────────────────────────────────────────── */

type FeatureTab = {
  key: 'planning' | 'flotte' | 'conducteurs' | 'facturation' | 'api'
  title: string
  description: string
  benefit: string
  highlights: string[]
  link?: string
}

type FeatureScreenshot = {
  src: string
  alt: string
  badge: string
  caption: string
}

type LightboxImage = {
  src: string
  alt: string
}

const FEATURE_SCREENSHOTS: Partial<Record<FeatureTab['key'], FeatureScreenshot>> = {
  planning: {
    src: planningScreenshot,
    alt: 'Vue planning transport avec affectations et synthèse opérationnelle',
    badge: 'Capture planning exploitation',
    caption: 'Planning glisser-déposer, visibilité flotte et charge par mission.',
  },
  flotte: {
    src: conducteursScreenshot,
    alt: 'Vue flotte et atelier avec suivi des disponibilités et interventions',
    badge: 'Capture flotte et atelier',
    caption: 'Disponibilités parc, maintenance et suivi atelier dans un même écran.',
  },
  conducteurs: {
    src: '/site/screenshots/conducteurs.png',
    alt: 'Vue ERP conducteurs avec documents, conformité et historique',
    badge: 'Capture espace conducteurs',
    caption: 'Documents, échéances et suivi conducteur regroupés sur une seule fiche.',
  },
}

const FEATURE_TABS: FeatureTab[] = [
  {
    key: 'planning',
    title: 'Planning intelligent',
    description: 'Affectez véhicules et conducteurs en glisser-déposer, absorbez les urgences et gardez une vue claire sur la charge.',
    benefit: '-31 % de temps passé sur le planning.',
    highlights: ['Affectation glisser-déposer des missions', 'Vue charge, flotte et disponibilités au même endroit', 'Réaffectation rapide lors d’un aléa terrain'],
    link: '/planning-intelligent',
  },
  {
    key: 'flotte',
    title: 'Flotte en temps réel',
    description: 'Disponibilités, maintenance et alertes CT/VGP dans un seul cockpit pour limiter les immobilisations non planifiées.',
    benefit: '98,7 % de disponibilité opérationnelle.',
    highlights: ['Suivi des immobilisations et visites réglementaires', 'Disponibilité tracteurs, remorques et atelier', 'Alertes critiques sans ressaisie'],
    link: '/logiciel-gestion-flotte-camion',
  },
  {
    key: 'conducteurs',
    title: 'Gestion conducteurs',
    description: 'Documents, historique missions et conformité restent reliés au terrain pour agir avant le blocage.',
    benefit: '-42 % de non-conformités documentaires.',
    highlights: ['Permis, FCO et carte conducteur suivis dans la fiche', 'Historique missions et statut administratif réunis', 'Alertes conformité avant l’affectation au planning'],
  },
  {
    key: 'facturation',
    title: 'Facturation sans friction',
    description: 'Générez vos factures depuis les ordres de transport, relances incluses et exports comptables prêts.',
    benefit: '-60 % de temps sur la facturation.',
    highlights: ['Factures générées depuis les ordres validés', 'Relances et statuts de règlement suivis', 'Exports comptables prêts sans retraitement'],
  },
  {
    key: 'api',
    title: 'API et automatisation',
    description: 'Connectez Webfleet, tachygraphe et flux fret pour supprimer les tâches répétitives à faible valeur.',
    benefit: '+14 % de marge opérationnelle moyenne.',
    highlights: ['Flux télématiques et terrain synchronisés', 'Automatisation des statuts et remontées clés', 'Interopérabilité ERP, TMS et outils tiers'],
    link: '/telematique-transport',
  },
]

/* ── Icons (line style, #1D1D1F) ──────────────────────────── */

function PainIcon({ kind }: { kind: 'planning' | 'error' | 'margin' | 'tools' }) {
  const cls = 'h-12 w-12'
  const style = { color: '#1D1D1F' }
  if (kind === 'planning')
    return <svg viewBox="0 0 24 24" className={cls} style={style} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2.5" /><path d="M8 2v4M16 2v4M3 9h18M8 13h3M13 13h3M8 17h3" /></svg>
  if (kind === 'error')
    return <svg viewBox="0 0 24 24" className={cls} style={style} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 3l9 16H3z" /><path d="M12 9v4M12 17h.01" /></svg>
  if (kind === 'margin')
    return <svg viewBox="0 0 24 24" className={cls} style={style} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 19V5M4 19h16" /><path d="M7 15l3-3 3 2 4-5" /></svg>
  return <svg viewBox="0 0 24 24" className={cls} style={style} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M9 3h6l1 3h4v5l-2 2 2 2v5h-4l-1 3H9l-1-3H4v-5l2-2-2-2V6h4z" /><circle cx="12" cy="12" r="3" /></svg>
}

/* ── Video Lightbox ────────────────────────────────────────── */

function VideoLightbox({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.85)' }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-6 top-6 text-3xl font-light text-white/80 transition-colors hover:text-white"
        aria-label="Fermer la vidéo"
      >
        ✕
      </button>
      <div
        className="w-full"
        style={{ maxWidth: '960px', aspectRatio: '16/9' }}
        onClick={e => e.stopPropagation()}
      >
        <iframe
          src="https://www.youtube.com/embed/UpjFGoKnhQQ?autoplay=1&rel=0"
          title="Démonstration NEXORA Truck"
          className="h-full w-full rounded-lg"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      </div>
    </div>
  )
}

function ImageLightbox({ image, onClose }: { image: LightboxImage | null; onClose: () => void }) {
  useEffect(() => {
    if (!image) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [image, onClose])

  if (!image) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-5"
      style={{ background: 'rgba(0, 0, 0, 0.88)' }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-6 top-6 text-3xl font-light text-white/80 transition-colors hover:text-white"
        aria-label="Fermer l'image"
      >
        ✕
      </button>
      <img
        src={image.src}
        alt={image.alt}
        className="max-h-[92vh] max-w-[92vw] object-contain"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

/* ── Animated SVG Illustrations per tab ────────────────────── */

function TabIllustration({ tab, onOpenScreenshot }: { tab: FeatureTab['key']; onOpenScreenshot: (image: LightboxImage) => void }) {
  const common = 'w-full rounded-2xl'
  const style: React.CSSProperties = { aspectRatio: '16/10', background: '#F5F5F7' }

  const screenshot = FEATURE_SCREENSHOTS[tab]

  if (screenshot) {
    return (
      <figure>
        <div className="mb-3 inline-flex border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
          {screenshot.badge}
        </div>
        <button
          type="button"
          onClick={() => onOpenScreenshot({ src: screenshot.src, alt: screenshot.alt })}
          className="block w-full cursor-zoom-in text-left"
          aria-label={`Agrandir ${screenshot.alt}`}
        >
          <img
            src={screenshot.src}
            alt={screenshot.alt}
            className="block h-full w-full border border-slate-300 object-cover object-top"
            style={{ aspectRatio: '16/10' }}
            loading="lazy"
            decoding="async"
          />
        </button>
        <figcaption className="mt-3 text-sm leading-6 text-slate-600">
          {screenshot.caption}
        </figcaption>
      </figure>
    )
  }

  if (tab === 'planning') return (
    <svg viewBox="0 0 640 400" className={common} style={style} aria-hidden="true">
      {/* Calendar grid */}
      <rect x="40" y="50" width="560" height="300" rx="12" fill="#FFFFFF" stroke="#E5E5E5" strokeWidth="1" />
      <line x1="40" y1="90" x2="600" y2="90" stroke="#E5E5E5" strokeWidth="1" />
      {/* Day headers */}
      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'].map((d, i) => (
        <text key={d} x={120 + i * 112} y="78" textAnchor="middle" fill="#6E6E73" fontSize="11" fontWeight="600">{d}</text>
      ))}
      {/* Animated task bars */}
      <rect x="70" y="110" width="0" height="28" rx="6" fill="#2563EB" opacity="0.85">
        <animate attributeName="width" from="0" to="200" dur="1s" fill="freeze" begin="0.2s" />
      </rect>
      <rect x="182" y="155" width="0" height="28" rx="6" fill="#60A5FA" opacity="0.7">
        <animate attributeName="width" from="0" to="280" dur="1.1s" fill="freeze" begin="0.5s" />
      </rect>
      <rect x="70" y="200" width="0" height="28" rx="6" fill="#2563EB" opacity="0.6">
        <animate attributeName="width" from="0" to="150" dur="0.9s" fill="freeze" begin="0.8s" />
      </rect>
      <rect x="294" y="200" width="0" height="28" rx="6" fill="#93C5FD" opacity="0.5">
        <animate attributeName="width" from="0" to="180" dur="1s" fill="freeze" begin="1s" />
      </rect>
      <rect x="70" y="245" width="0" height="28" rx="6" fill="#60A5FA" opacity="0.75">
        <animate attributeName="width" from="0" to="340" dur="1.2s" fill="freeze" begin="0.6s" />
      </rect>
      <rect x="182" y="290" width="0" height="28" rx="6" fill="#2563EB" opacity="0.55">
        <animate attributeName="width" from="0" to="220" dur="1s" fill="freeze" begin="1.1s" />
      </rect>
      {/* Driver avatars */}
      {[110, 155, 200, 245, 290].map((y, i) => (
        <circle key={i} cx="52" cy={y + 14} r="10" fill={['#2563EB', '#60A5FA', '#93C5FD', '#2563EB', '#60A5FA'][i]} opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.4s" fill="freeze" begin={`${0.1 + i * 0.15}s`} />
        </circle>
      ))}
    </svg>
  )

  if (tab === 'flotte') return (
    <svg viewBox="0 0 640 400" className={common} style={style} aria-hidden="true">
      {/* Dashboard frame */}
      <rect x="40" y="40" width="560" height="320" rx="12" fill="#FFFFFF" stroke="#E5E5E5" strokeWidth="1" />
      {/* KPI Cards */}
      {[0, 1, 2, 3].map(i => (
        <g key={i}>
          <rect x={60 + i * 135} y="60" width="120" height="70" rx="8" fill="#F5F5F7" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.5s" fill="freeze" begin={`${0.2 + i * 0.15}s`} />
          </rect>
          <circle cx={80 + i * 135} cy="80" r="6" fill={['#22C55E', '#2563EB', '#F59E0B', '#EF4444'][i]} opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" begin={`${0.4 + i * 0.15}s`} />
          </circle>
          <rect x={95 + i * 135} y="75" width="60" height="8" rx="4" fill="#1D1D1F" opacity="0">
            <animate attributeName="opacity" from="0" to="0.15" dur="0.3s" fill="freeze" begin={`${0.5 + i * 0.15}s`} />
          </rect>
          <rect x={72 + i * 135} y="100" width="40" height="16" rx="4" fill={['#22C55E', '#2563EB', '#F59E0B', '#EF4444'][i]} opacity="0">
            <animate attributeName="opacity" from="0" to="0.2" dur="0.3s" fill="freeze" begin={`${0.6 + i * 0.15}s`} />
          </rect>
        </g>
      ))}
      {/* Truck icons moving */}
      {[0, 1, 2].map(i => (
        <g key={i}>
          <rect x="-30" y={170 + i * 55} width="50" height="30" rx="6" fill="#2563EB" opacity={0.7 - i * 0.15}>
            <animate attributeName="x" from="-30" to={200 + i * 120} dur={`${1.5 + i * 0.3}s`} fill="freeze" begin={`${0.5 + i * 0.2}s`} />
          </rect>
          {/* Route line */}
          <line x1="60" y1={185 + i * 55} x2="580" y2={185 + i * 55} stroke="#E5E5E5" strokeWidth="1" strokeDasharray="4 4" />
        </g>
      ))}
      {/* Status dots */}
      {[0, 1, 2, 3, 4].map(i => (
        <circle key={i} cx={120 + i * 100} cy="340" r="5" fill={i < 3 ? '#22C55E' : '#F59E0B'} opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" begin={`${1.2 + i * 0.1}s`} />
        </circle>
      ))}
    </svg>
  )

  if (tab === 'conducteurs') return (
    <svg viewBox="0 0 640 400" className={common} style={style} aria-hidden="true">
      {/* Profile card */}
      <rect x="40" y="40" width="250" height="320" rx="12" fill="#FFFFFF" stroke="#E5E5E5" strokeWidth="1" />
      {/* Avatar */}
      <circle cx="165" cy="110" r="35" fill="#2563EB" opacity="0">
        <animate attributeName="opacity" from="0" to="0.2" dur="0.6s" fill="freeze" begin="0.3s" />
      </circle>
      <circle cx="165" cy="100" r="12" fill="#2563EB" opacity="0">
        <animate attributeName="opacity" from="0" to="0.4" dur="0.4s" fill="freeze" begin="0.5s" />
      </circle>
      {/* Name placeholder */}
      <rect x="110" y="155" width="110" height="12" rx="6" fill="#1D1D1F" opacity="0">
        <animate attributeName="opacity" from="0" to="0.15" dur="0.4s" fill="freeze" begin="0.6s" />
      </rect>
      {/* Document rows */}
      {[0, 1, 2, 3].map(i => (
        <g key={i}>
          <rect x="60" y={190 + i * 38} width="210" height="28" rx="6" fill="#F5F5F7" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" fill="freeze" begin={`${0.7 + i * 0.15}s`} />
          </rect>
          <circle cx={245} cy={204 + i * 38} r="6" fill={i < 3 ? '#22C55E' : '#F59E0B'} opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" begin={`${0.9 + i * 0.15}s`} />
          </circle>
        </g>
      ))}
      {/* Right panel: timeline */}
      <rect x="320" y="40" width="280" height="320" rx="12" fill="#FFFFFF" stroke="#E5E5E5" strokeWidth="1" />
      <line x1="360" y1="70" x2="360" y2="330" stroke="#E5E5E5" strokeWidth="2" />
      {[0, 1, 2, 3, 4].map(i => (
        <g key={i}>
          <circle cx="360" cy={90 + i * 55} r="8" fill="#2563EB" opacity="0">
            <animate attributeName="opacity" from="0" to={1 - i * 0.15} dur="0.3s" fill="freeze" begin={`${0.4 + i * 0.2}s`} />
          </circle>
          <rect x="380" y={82 + i * 55} width={140 - i * 15} height="8" rx="4" fill="#1D1D1F" opacity="0">
            <animate attributeName="opacity" from="0" to="0.12" dur="0.3s" fill="freeze" begin={`${0.5 + i * 0.2}s`} />
          </rect>
          <rect x="380" y={96 + i * 55} width={100 - i * 10} height="6" rx="3" fill="#6E6E73" opacity="0">
            <animate attributeName="opacity" from="0" to="0.1" dur="0.3s" fill="freeze" begin={`${0.6 + i * 0.2}s`} />
          </rect>
        </g>
      ))}
    </svg>
  )

  if (tab === 'facturation') return (
    <svg viewBox="0 0 640 400" className={common} style={style} aria-hidden="true">
      {/* Invoice */}
      <rect x="160" y="30" width="320" height="340" rx="12" fill="#FFFFFF" stroke="#E5E5E5" strokeWidth="1" />
      {/* Header */}
      <rect x="180" y="50" width="80" height="24" rx="6" fill="#2563EB" opacity="0">
        <animate attributeName="opacity" from="0" to="0.2" dur="0.5s" fill="freeze" begin="0.3s" />
      </rect>
      <rect x="180" y="85" width="160" height="8" rx="4" fill="#1D1D1F" opacity="0">
        <animate attributeName="opacity" from="0" to="0.12" dur="0.4s" fill="freeze" begin="0.5s" />
      </rect>
      {/* Line items appearing */}
      {[0, 1, 2, 3].map(i => (
        <g key={i}>
          <line x1="180" y1={130 + i * 45} x2="460" y2={130 + i * 45} stroke="#E5E5E5" strokeWidth="1" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" begin={`${0.6 + i * 0.2}s`} />
          </line>
          <rect x="180" y={138 + i * 45} width={120 + i * 10} height="8" rx="4" fill="#1D1D1F" opacity="0">
            <animate attributeName="opacity" from="0" to="0.1" dur="0.3s" fill="freeze" begin={`${0.7 + i * 0.2}s`} />
          </rect>
          <rect x="410" y={138 + i * 45} width="50" height="8" rx="4" fill="#2563EB" opacity="0">
            <animate attributeName="opacity" from="0" to="0.2" dur="0.3s" fill="freeze" begin={`${0.8 + i * 0.2}s`} />
          </rect>
        </g>
      ))}
      {/* Total */}
      <line x1="180" y1="315" x2="460" y2="315" stroke="#1D1D1F" strokeWidth="2" opacity="0">
        <animate attributeName="opacity" from="0" to="0.2" dur="0.4s" fill="freeze" begin="1.5s" />
      </line>
      <rect x="380" y="325" width="80" height="16" rx="4" fill="#2563EB" opacity="0">
        <animate attributeName="opacity" from="0" to="0.3" dur="0.5s" fill="freeze" begin="1.6s" />
      </rect>
      {/* Checkmark animation */}
      <circle cx="320" cy="200" r="0" fill="#22C55E" opacity="0.15">
        <animate attributeName="r" from="0" to="60" dur="0.8s" fill="freeze" begin="1.8s" />
        <animate attributeName="opacity" from="0.15" to="0" dur="0.8s" fill="freeze" begin="2.2s" />
      </circle>
      <path d="M300 200 L315 215 L340 185" stroke="#22C55E" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset="60">
        <animate attributeName="stroke-dashoffset" from="60" to="0" dur="0.5s" fill="freeze" begin="2s" />
      </path>
    </svg>
  )

  // API tab
  return (
    <svg viewBox="0 0 640 400" className={common} style={style} aria-hidden="true">
      {/* Central hub */}
      <circle cx="320" cy="200" r="40" fill="#2563EB" opacity="0.1">
        <animate attributeName="opacity" from="0" to="0.1" dur="0.5s" fill="freeze" begin="0.3s" />
      </circle>
      <circle cx="320" cy="200" r="25" fill="#2563EB" opacity="0.2">
        <animate attributeName="opacity" from="0" to="0.2" dur="0.4s" fill="freeze" begin="0.5s" />
      </circle>
      <text x="320" y="205" textAnchor="middle" fill="#2563EB" fontSize="12" fontWeight="700" opacity="0">
        API
        <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" begin="0.7s" />
      </text>
      {/* Connection nodes */}
      {[
        { x: 120, y: 100, label: 'Webfleet', color: '#2563EB' },
        { x: 520, y: 100, label: 'Tachygraphe', color: '#60A5FA' },
        { x: 120, y: 300, label: 'Portail client', color: '#93C5FD' },
        { x: 520, y: 300, label: 'Fret', color: '#2563EB' },
        { x: 100, y: 200, label: 'ERP tiers', color: '#60A5FA' },
        { x: 540, y: 200, label: 'Comptabilité', color: '#93C5FD' },
      ].map((node, i) => (
        <g key={i}>
          {/* Connection line with pulse */}
          <line x1="320" y1="200" x2={node.x} y2={node.y} stroke={node.color} strokeWidth="1.5" opacity="0" strokeDasharray="6 4">
            <animate attributeName="opacity" from="0" to="0.3" dur="0.4s" fill="freeze" begin={`${0.8 + i * 0.15}s`} />
          </line>
          {/* Data pulse along line */}
          <circle r="4" fill={node.color} opacity="0">
            <animate attributeName="opacity" from="0" to="0.8" dur="0.3s" fill="freeze" begin={`${1.2 + i * 0.2}s`} />
            <animateMotion dur="1.5s" repeatCount="indefinite" begin={`${1.2 + i * 0.2}s`}>
              <mpath xlinkHref={`#path-${i}`} />
            </animateMotion>
          </circle>
          <path id={`path-${i}`} d={`M320,200 L${node.x},${node.y}`} fill="none" />
          {/* Node */}
          <rect x={node.x - 40} y={node.y - 15} width="80" height="30" rx="8" fill="#FFFFFF" stroke={node.color} strokeWidth="1.5" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" fill="freeze" begin={`${0.5 + i * 0.12}s`} />
          </rect>
          <text x={node.x} y={node.y + 4} textAnchor="middle" fill="#1D1D1F" fontSize="9" fontWeight="500" opacity="0">
            {node.label}
            <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" begin={`${0.7 + i * 0.12}s`} />
          </text>
        </g>
      ))}
    </svg>
  )
}

/* ── Shared padding ────────────────────────────────────────── */

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(40px, 5vw, 88px)' }

const MARKET_PAINS = [
  {
    key: 'planning' as const,
    title: 'Multi-logiciels qui se contredisent',
    description: 'Planning, TMS, flotte et facturation vivent dans des outils séparés: vos équipes recollent les informations à la main.',
  },
  {
    key: 'error' as const,
    title: 'Double saisie quotidienne',
    description: 'Chaque ordre de transport est ressaisi plusieurs fois, ce qui augmente les erreurs, les retards et les litiges clients.',
  },
  {
    key: 'margin' as const,
    title: 'Visibilité insuffisante',
    description: 'Sans lecture temps réel des missions, coûts et statuts, la rentabilité se dégrade avant même d’être visible.',
  },
  {
    key: 'tools' as const,
    title: 'Communication fragmentée',
    description: 'Exploitants, dirigeants et conducteurs utilisent des canaux différents. Les décisions arrivent trop tard sur le terrain.',
  },
]

const REPLACED_SOFTWARE = [
  {
    title: 'TMS transport',
    description: 'Ordres de transport, affectation, suivi de mission et statuts clients dans un même flux.',
    link: '/tms-transport',
  },
  {
    title: 'Gestion flotte',
    description: 'Disponibilités parc, maintenance, alertes atelier et conformité réglementaire reliées à l’exploitation.',
    link: '/logiciel-gestion-flotte-camion',
  },
  {
    title: 'Suivi conducteur',
    description: 'Documents, habilitations, conformité et historique mission centralisés sur la fiche conducteur.',
    link: '/erp-transport',
  },
  {
    title: 'Facturation transport',
    description: 'De l’ordre validé à la facture, avec relances et exports comptables prêts.',
    link: '/facturation-transport',
  },
  {
    title: 'Communication opérationnelle',
    description: 'Échanges terrain et exploitation unifiés pour limiter les ruptures d’information.',
    link: '/communication',
  },
]

const BUSINESS_PATHS = [
  {
    title: 'Exploitant',
    problem: 'Vous subissez des changements de planning en cascade et des informations dispersées.',
    solution: 'NEXORA relie planning transport, TMS et suivi mission en temps réel dans un seul cockpit.',
    benefit: 'Bénéfice concret: moins d’urgences subies et des réaffectations plus rapides.',
  },
  {
    title: 'Dirigeant',
    problem: 'Vous manquez de visibilité instantanée sur la marge, la charge et la performance globale.',
    solution: 'NEXORA unifie KPIs exploitation, gestion flotte et finance pour piloter par indicateurs fiables.',
    benefit: 'Bénéfice concret: décisions plus rapides avec une vision claire de la rentabilité.',
  },
  {
    title: 'Conducteur',
    problem: 'Les consignes changent sans contexte clair et la conformité documentaire est difficile à suivre.',
    solution: 'NEXORA connecte planning, communication et suivi conducteur dans un espace opérationnel unique.',
    benefit: 'Bénéfice concret: moins d’incompréhensions, meilleure exécution et conformité maîtrisée.',
  },
]

const MODULE_GROUPS = [
  {
    title: 'Exploitation',
    summary: 'Planning transport, ordres de mission, suivi d’exécution et coordination quotidienne.',
  },
  {
    title: 'Flotte',
    summary: 'Disponibilités véhicules, maintenance, alertes atelier et conformité parc.',
  },
  {
    title: 'RH',
    summary: 'Dossiers conducteurs, documents obligatoires, habilitations et échéances.',
  },
  {
    title: 'Finance',
    summary: 'Facturation transport, suivi règlements, relances et pilotage de marge.',
  },
  {
    title: 'Communication',
    summary: 'Canal unique entre exploitation, terrain et management pour agir plus vite.',
  },
]

function LazySection({ children, minHeight = '320px' }: { children: React.ReactNode; minHeight?: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || isVisible) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '260px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [isVisible])

  return (
    <div ref={ref} style={{ minHeight }}>
      {isVisible ? (
        children
      ) : (
        <section className="w-full" style={{ ...sectionPx, ...sectionPy }} aria-hidden="true">
          <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.07)] sm:p-8">
            <div className="nx-skeleton h-7 w-40" />
            <div className="nx-skeleton mt-5 h-10 w-full max-w-3xl" />
            <div className="nx-skeleton mt-4 h-5 w-full" />
            <div className="nx-skeleton mt-3 h-5 w-[90%]" />
          </div>
        </section>
      )}
    </div>
  )
}

/* ── Component ─────────────────────────────────────────────── */

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<FeatureTab['key']>('planning')
  const [videoOpen, setVideoOpen] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null)

  useSiteMeta({
    title: 'Le système d’exploitation du transport routier',
    description: 'ERP transport et TMS transport tout-en-un pour exploitation, gestion flotte, optimisation transport, suivi conducteur et facturation sans double saisie.',
    canonicalPath: '/',
    keywords: 'ERP transport, TMS transport, gestion flotte, optimisation transport, suivi conducteur, logiciel transport, planning transport, exploitation transport, télématique transport, IA transport, NEXORA Truck',
  })

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'home-organization-jsonld'
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'NEXORA Truck',
      alternateName: ['NEXORA', 'NEXORA Truck ERP transport'],
      url: 'https://nexora-truck.fr',
      logo: {
        '@type': 'ImageObject',
        url: 'https://nexora-truck.fr/pwa-192.png',
        width: 192,
        height: 192,
      },
      description: 'ERP transport routier pour planning, flotte, conducteurs, finance et automatisation.',
      areaServed: ['FR', 'BE', 'CH', 'CA'],
      sameAs: [
        'https://www.linkedin.com/company/nexora-truck',
        'https://twitter.com/nexoratruck',
        'https://www.facebook.com/nexoratruck',
      ],
    })
    document.head.appendChild(script)
    return () => { script.remove() }
  }, [])

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'home-aggregaterating-jsonld'
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'NEXORA Truck',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://nexora-truck.fr',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '120',
        bestRating: '5',
        worstRating: '1',
      },
    })
    document.head.appendChild(script)
    return () => { script.remove() }
  }, [])

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'home-video-jsonld'
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: 'Démonstration NEXORA Truck — ERP transport routier',
      description: 'Découvrez NEXORA Truck, l\'ERP transport routier tout-en-un : planning, gestion flotte, conducteurs, télématique et facturation en une seule interface.',
      thumbnailUrl: 'https://img.youtube.com/vi/UpjFGoKnhQQ/maxresdefault.jpg',
      uploadDate: '2026-01-15',
      contentUrl: 'https://www.youtube.com/watch?v=UpjFGoKnhQQ',
      embedUrl: 'https://www.youtube.com/embed/UpjFGoKnhQQ',
      publisher: {
        '@type': 'Organization',
        name: 'NEXORA Truck',
        logo: {
          '@type': 'ImageObject',
          url: 'https://nexora-truck.fr/pwa-192.png',
          width: 192,
          height: 192,
        },
      },
    })
    document.head.appendChild(script)
    return () => { script.remove() }
  }, [])

  /* Reveal observer */
  useEffect(() => {
    const observed = new WeakSet<Element>()
    const obs = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in-view')
          obs.unobserve(entry.target)
        }
      }),
      { threshold: 0.08 },
    )

    const observeRevealNodes = () => {
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(node => {
        if (observed.has(node)) return
        observed.add(node)
        obs.observe(node)
      })
    }

    observeRevealNodes()
    const mutationObserver = new MutationObserver(() => observeRevealNodes())
    mutationObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      obs.disconnect()
      mutationObserver.disconnect()
    }
  }, [])

  const currentTab = useMemo(
    () => FEATURE_TABS.find(t => t.key === activeTab) ?? FEATURE_TABS[0],
    [activeTab],
  )

  return (
    <>
      <VideoLightbox open={videoOpen} onClose={() => setVideoOpen(false)} />
      <ImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />

      {/* ── 1. HERO ── */}
      <section
        className="relative flex min-h-[76vh] w-full flex-col items-center justify-center overflow-hidden text-center"
        style={{ ...sectionPx, ...sectionPy }}
        aria-labelledby="home-hero-heading"
      >
        {/* Background image + overlay */}
        <img
          src={sitePhotos.mainPageHero.src(1600)}
          srcSet={sitePhotos.mainPageHero.srcSet([768, 1200, 1600])}
          sizes="100vw"
          alt="Camions en ville de nuit dans une ambiance urbaine cinématographique"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.7)' }}>
            ERP Transport Routier
          </p>
          <h1
            id="home-hero-heading"
            className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#FFFFFF', letterSpacing: '-0.025em' }}
          >
            Le système d’exploitation du transport routier
          </h1>
          <p className="mx-auto mt-6 max-w-2xl" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '20px', lineHeight: 1.6 }}>
            Un seul outil pour piloter exploitation, flotte, conducteurs et performance.
          </p>
          <div className="mt-12 flex flex-wrap items-start justify-center gap-x-5 gap-y-4">
            <div className="flex flex-col items-center">
              <Link
                to="/demonstration"
                className="site-hero-cta"
              >
                Demander une démo
              </Link>
              <p className="site-hero-cta-note mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                Présentation ciblée selon votre activité.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVideoOpen(true)}
              className="self-center text-sm font-semibold transition-colors"
              style={{ color: '#93C5FD' }}
            >
              Voir la démo ▶
            </button>
          </div>
        </div>
      </section>

      <LazySection minHeight="220px">
        <section
          className="w-full bg-white text-center"
          style={{ ...sectionPx, paddingBlock: 'clamp(24px, 4vw, 44px)' }}
          data-reveal
          aria-label="Indicateurs clés NEXORA Truck"
        >
          <p className="text-sm font-semibold tracking-wide" style={{ color: '#1f2937' }}>
            +120 transporteurs | 4.8/5 satisfaction | 98,7% disponibilité opérationnelle | Opérationnel en 72h
          </p>
        </section>
      </LazySection>

      <LazySection minHeight="520px">
        <section
          className="w-full"
          style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}
          data-reveal
          aria-labelledby="home-pain-heading"
        >
          <div className="max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: '#2563EB' }}>Problème marché</p>
            <h2
              id="home-pain-heading"
              className="mt-4 max-w-4xl font-semibold leading-tight"
              style={{ fontSize: 'clamp(1.95rem, 4.2vw, 3.2rem)', color: '#000000' }}
            >
              Pourquoi les transporteurs perdent du temps et de l’argent
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {MARKET_PAINS.map(item => (
              <article key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                <PainIcon kind={item.key} />
                <h3 className="mt-5 text-2xl font-semibold" style={{ color: '#000000' }}>{item.title}</h3>
                <p className="mt-3 text-base leading-8" style={{ color: '#374151' }}>{item.description}</p>
              </article>
            ))}
          </div>

          <Link to="/demonstration" className="site-btn-primary mt-10 inline-flex px-6 py-3 text-sm">
            Voir comment NEXORA corrige ces blocages
          </Link>
        </section>
      </LazySection>

      <LazySection minHeight="640px">
        <section
          id="fonctionnalites"
          className="w-full bg-white"
          style={{ ...sectionPx, ...sectionPy }}
          data-reveal
          aria-labelledby="home-solution-heading"
        >
          <div className="max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: '#2563EB' }}>Solution</p>
            <h2
              id="home-solution-heading"
              className="mt-4 font-semibold leading-tight"
              style={{ fontSize: 'clamp(1.95rem, 4.2vw, 3.2rem)', color: '#000000' }}
            >
              NEXORA remplace 5 logiciels
            </h2>
            <p className="mt-4 max-w-4xl text-base leading-8" style={{ color: '#374151' }}>
              Un seul ERP transport pour relier exploitation, TMS transport, gestion flotte, suivi conducteur, finance et communication.
              Vous éliminez la double saisie et vous gardez une chaîne opérationnelle cohérente de la mission à la facture.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-5">
            {REPLACED_SOFTWARE.map(item => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-5">
                <h3 className="text-lg font-semibold" style={{ color: '#000000' }}>{item.title}</h3>
                <p className="mt-3 text-sm leading-7" style={{ color: '#374151' }}>{item.description}</p>
                <Link to={item.link} className="mt-4 inline-flex text-sm font-semibold" style={{ color: '#1d4ed8' }}>
                  En savoir plus
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-12 rounded-[1.6rem] border border-slate-200 bg-[#f5f5f7] p-6 sm:p-8">
            <h3 className="text-2xl font-semibold" style={{ color: '#000000' }}>Exemple concret sur votre exploitation</h3>
            <div className="mt-6 flex gap-8 overflow-x-auto border-b" style={{ borderColor: '#D1D5DB' }}>
              {FEATURE_TABS.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`site-tab whitespace-nowrap ${activeTab === tab.key ? 'site-tab-active' : ''}`}
                >
                  {tab.title.replace(' intelligent', '').replace(' en temps réel', '').replace(' sans friction', '').replace(' et automatisation', '')}
                </button>
              ))}
            </div>
            <div className="mt-8 grid items-center gap-8 lg:grid-cols-2">
              <div>
                <h3 className="text-2xl font-semibold" style={{ color: '#000000' }}>{currentTab.title}</h3>
                <p className="mt-4 text-base leading-8" style={{ color: '#374151' }}>{currentTab.description}</p>
                <p className="mt-4 text-base font-semibold" style={{ color: '#1d4ed8' }}>{currentTab.benefit}</p>
                <ul className="mt-5 space-y-3">
                  {currentTab.highlights.map(item => (
                    <li key={item} className="flex items-start gap-3 text-base leading-7" style={{ color: '#1f2937' }}>
                      <span className="mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-700" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <TabIllustration key={activeTab} tab={activeTab} onOpenScreenshot={setLightboxImage} />
              </div>
            </div>
          </div>
        </section>
      </LazySection>

      <LazySection minHeight="560px">
        <section
          className="w-full"
          style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}
          data-reveal
          aria-labelledby="home-business-path-heading"
        >
          <h2
            id="home-business-path-heading"
            className="max-w-4xl font-semibold leading-tight"
            style={{ fontSize: 'clamp(1.95rem, 4.2vw, 3.2rem)', color: '#000000' }}
          >
            Parcours métier: une réponse claire pour chaque rôle
          </h2>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {BUSINESS_PATHS.map(path => (
              <article key={path.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                <h3 className="text-2xl font-semibold" style={{ color: '#000000' }}>{path.title}</h3>
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: '#1d4ed8' }}>Problème</p>
                <p className="mt-2 text-base leading-8" style={{ color: '#374151' }}>{path.problem}</p>
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: '#1d4ed8' }}>Solution NEXORA</p>
                <p className="mt-2 text-base leading-8" style={{ color: '#374151' }}>{path.solution}</p>
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: '#1d4ed8' }}>Bénéfice</p>
                <p className="mt-2 text-base leading-8" style={{ color: '#111827' }}>{path.benefit}</p>
              </article>
            ))}
          </div>
        </section>
      </LazySection>

      <LazySection minHeight="500px">
        <section
          className="w-full bg-white"
          style={{ ...sectionPx, ...sectionPy }}
          data-reveal
          aria-labelledby="home-modules-heading"
        >
          <h2
            id="home-modules-heading"
            className="max-w-4xl font-semibold leading-tight"
            style={{ fontSize: 'clamp(1.95rem, 4.2vw, 3.2rem)', color: '#000000' }}
          >
            Modules simplifiés: l’essentiel en 5 blocs
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-8" style={{ color: '#374151' }}>
            NEXORA organise les fonctions clés d’un ERP transport et d’un TMS transport en modules lisibles, pour un pilotage plus rapide et une adoption immédiate.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {MODULE_GROUPS.map(group => (
              <article key={group.title} className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-5">
                <h3 className="text-xl font-semibold" style={{ color: '#000000' }}>{group.title}</h3>
                <p className="mt-3 text-sm leading-7" style={{ color: '#374151' }}>{group.summary}</p>
              </article>
            ))}
          </div>

          <Link to="/solution" className="site-btn-primary mt-10 inline-flex px-6 py-3 text-sm">
            Explorer tous les modules
          </Link>
        </section>
      </LazySection>

      <LazySection minHeight="560px">
        <section
          className="w-full"
          style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}
          data-reveal
          aria-labelledby="home-roi-heading"
        >
          <h2
            id="home-roi-heading"
            className="max-w-4xl font-semibold leading-tight"
            style={{ fontSize: 'clamp(1.95rem, 4.2vw, 3.2rem)', color: '#000000' }}
          >
            Preuve et ROI: des gains visibles dès les premières semaines
          </h2>

          <div className="mt-10 grid gap-6 text-center md:grid-cols-3">
            {([
              ['-31%', 'temps passé sur le planning transport'],
              ['-60%', 'temps de facturation transport'],
              ['+14%', 'marge opérationnelle moyenne'],
            ] as const).map(([value, label]) => (
              <article key={value} className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
                <p className="font-extrabold" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: '#000000', lineHeight: 1 }}>{value}</p>
                <h3 className="mt-3 text-lg font-semibold" style={{ color: '#111827' }}>{label}</h3>
              </article>
            ))}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
              <h3 className="text-2xl font-semibold" style={{ color: '#000000' }}>SEO métier transport</h3>
              <p className="mt-4 text-base leading-8" style={{ color: '#374151' }}>
                Un ERP transport performant doit couvrir le cycle complet: <strong>ERP transport</strong>, <strong>TMS transport</strong>,
                <strong> gestion flotte</strong>, <strong>optimisation transport</strong> et <strong>suivi conducteur</strong>. NEXORA relie ces briques
                dans une seule interface, pour réduire la densité opérationnelle et accélérer la décision.
              </p>
              <p className="mt-4 text-base leading-8" style={{ color: '#374151' }}>
                En centralisant exploitation, communication et finance, les équipes évitent les ruptures d’information et améliorent
                la qualité de service client.
              </p>
            </article>
            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
              <h3 className="text-2xl font-semibold" style={{ color: '#000000' }}>Retour terrain</h3>
              <blockquote className="mt-4 text-lg leading-8 italic" style={{ color: '#111827' }}>
                On est passé de 3 outils à NEXORA en une semaine. Le planning est plus lisible, le suivi conducteur plus fiable
                et la facturation sort sans ressaisie.
              </blockquote>
              <p className="mt-4 text-sm font-semibold" style={{ color: '#374151' }}>
                Karim L., dirigeant transport (42 véhicules)
              </p>
              <Link to="/roi" className="mt-5 inline-flex text-sm font-semibold" style={{ color: '#1d4ed8' }}>
                Voir les cas ROI détaillés
              </Link>
            </article>
          </div>
        </section>
      </LazySection>

      <LazySection minHeight="420px">
        <section
          className="w-full bg-white"
          style={{ ...sectionPx, ...sectionPy }}
          data-reveal
          aria-labelledby="home-blog-heading"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2
              id="home-blog-heading"
              className="font-semibold"
              style={{ fontSize: 'clamp(1.7rem, 3.8vw, 2.4rem)', color: '#000000' }}
            >
              Ressources ERP transport et optimisation transport
            </h2>
            <Link to="/articles" className="text-sm font-semibold" style={{ color: '#1d4ed8' }}>
              Tous les articles
            </Link>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {articleIndex.slice(-2).map(article => (
              <Link
                key={article.slug}
                to={`/articles/${article.slug}`}
                aria-label={`Lire l'article : ${article.title}`}
                className="rounded-[1.5rem] border border-slate-200 bg-[#f8fafc] p-6 transition-colors hover:border-slate-300"
              >
                <h3 className="text-lg font-semibold" style={{ color: '#000000' }}>{article.title}</h3>
                <p className="mt-3 text-sm leading-7" style={{ color: '#374151' }}>{article.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </LazySection>

      <LazySection minHeight="420px">
        <section
          className="relative w-full overflow-hidden text-center"
          style={{ ...sectionPx, paddingBlock: 'clamp(56px, 6vw, 96px)' }}
          data-reveal
          aria-labelledby="home-cta-heading"
        >
          <img
            src={sitePhotos.truckMountainRoad.src(1400)}
            srcSet={sitePhotos.truckMountainRoad.srcSet([768, 1200, 1400])}
            sizes="100vw"
            alt="Camion de transport sur route ouverte sans logo visible"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />

          <div className="relative">
            <h2
              id="home-cta-heading"
              className="mx-auto max-w-3xl text-balance font-semibold leading-tight"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', color: '#FFFFFF' }}
            >
              Passez de la complexité à un pilotage clair en un seul outil.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8" style={{ color: 'rgba(255,255,255,0.92)' }}>
              Demandez une démo personnalisée ou testez l’ERP transport NEXORA dès maintenant.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link to="/demonstration" className="site-btn-primary px-6 py-3 text-sm transition-colors">
                Demander une démo
              </Link>
              <Link to="/connexion-erp" className="site-hero-cta px-6 py-3 text-sm transition-colors">
                Tester l’ERP
              </Link>
            </div>
          </div>
        </section>
      </LazySection>

    </>
  )
}
