import { useEffect, useMemo, useState } from 'react'
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
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(24px, 3vw, 56px)' }

/* ── Component ─────────────────────────────────────────────── */

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<FeatureTab['key']>('planning')
  const [videoOpen, setVideoOpen] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null)

  useSiteMeta({
    title: 'ERP transport routier — TMS & flotte | NEXORA Truck',
    description: 'Pilotez exploitation, flotte et conducteurs depuis un seul ERP transport : planning, TMS, télématique, IA et facturation centralisés pour transporteurs routiers.',
    canonicalPath: '/',
    keywords: 'ERP transport, logiciel transport, TMS transport, gestion flotte, planning transport, exploitation transport, télématique transport, chronotachygraphe, IA transport, NEXORA Truck',
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
    let obs: IntersectionObserver | undefined
    const id = requestAnimationFrame(() => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
      if (!nodes.length) return
      obs = new IntersectionObserver(
        entries => entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add('is-in-view'); obs!.unobserve(e.target) }
        }),
        { threshold: 0.08 },
      )
      nodes.forEach(n => obs!.observe(n))
    })
    return () => { cancelAnimationFrame(id); obs?.disconnect() }
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
            Pilotez exploitation, flotte et conducteurs dans un ERP transport TMS tout-en-un.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '20px', lineHeight: 1.6 }}>
            De la prise d’ordre à la facturation — une seule plateforme pensée par des exploitants.
          </p>
          <div className="mt-12 flex flex-wrap items-start justify-center gap-x-5 gap-y-4">
            <div className="flex flex-col items-center">
              <Link
                to="/connexion-erp"
                className="site-hero-cta"
              >
                Essai gratuit
              </Link>
              <p className="site-hero-cta-note mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                Accès immédiat. Aucun engagement.
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

      {/* ── 2. PRODUCT REVEAL ── */}
      <section
        className="w-full"
        style={{ background: '#F5F5F7', ...sectionPy }}
        data-reveal
        aria-label="Aperçu du logiciel ERP transport NEXORA Truck"
      >
        <div className="mx-auto" style={{ width: '100%', maxWidth: '1400px' }}>
          <div className="overflow-hidden rounded-xl bg-white shadow-[0_20px_80px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: '#E5E5E5' }}>
              <span className="h-3 w-3 rounded-full" style={{ background: '#FF5F57' }} />
              <span className="h-3 w-3 rounded-full" style={{ background: '#FEBC2E' }} />
              <span className="h-3 w-3 rounded-full" style={{ background: '#28C840' }} />
              <span className="ml-4 flex-1 rounded-md px-3 py-1 text-xs" style={{ background: '#F5F5F7', color: '#636369' }}>
                nexora-truck.fr/app/dashboard
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLightboxImage({ src: '/site/screenshots/accueil-proof.png', alt: 'Aperçu du planning NEXORA Truck' })}
              className="block w-full cursor-zoom-in"
              aria-label="Agrandir l'aperçu du planning NEXORA Truck"
            >
              <img
                src="/site/screenshots/accueil-proof.png"
                alt="Aperçu du planning NEXORA Truck"
                className="w-full"
                loading="eager"
                width="1400"
                height="840"
                style={{ display: 'block', maxHeight: '600px', objectFit: 'contain' }}
              />
            </button>
          </div>
        </div>
        <p className="mt-6 text-center text-sm" style={{ color: '#636369' }}>
          Vue exploitation — Planning, carte, KPIs temps réel
        </p>
      </section>

      {/* ── 3. SOCIAL PROOF BAR ── */}
      <section
        className="w-full bg-white text-center"
        style={{ ...sectionPx, paddingBlock: 'clamp(28px, 4vw, 56px)' }}
        data-reveal
      >
        <p className="text-sm font-medium tracking-wide flex flex-wrap justify-center gap-x-4 gap-y-1" style={{ color: '#4b4b51' }}>
          <span>+120 transporteurs</span>
          <span>4.8/5 satisfaction</span>
          <span>98,7 % disponibilité</span>
          <span>Opérationnel en 72 h</span>
        </p>
      </section>

      {/* ── 4. PAIN POINTS (no image, 2x2 grid) ── */}
      <section
        className="w-full"
        style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}
        data-reveal
        aria-labelledby="home-pain-heading"
      >
        <h2
          id="home-pain-heading"
          className="max-w-3xl font-semibold leading-tight"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}
        >
          Votre exploitation mérite mieux qu’un tableur.
        </h2>
        <div className="mt-8 grid gap-x-20 gap-y-8 md:grid-cols-2">
          {([
            ['planning', 'Planning éclaté', 'Les changements de mission en cascade vous font perdre du temps et créent du stress.'],
            ['error', 'Erreurs coûteuses', 'La double saisie génère des litiges, des retards et des coûts cachés évitables.'],
            ['margin', 'Rentabilité floue', 'Sans vision précise de vos marges, vous pilotez votre exploitation à l’aveugle.'],
            ['tools', 'Outils dispersés', 'Planning, flotte et finance vivent dans des outils qui ne se parlent pas.'],
          ] as const).map(([icon, title, desc]) => (
            <div key={title}>
              <PainIcon kind={icon} />
              <h3 className="mt-5 text-xl font-semibold" style={{ color: '#000000' }}>{title}</h3>
              <p className="mt-2" style={{ color: '#4b4b51' }}>{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-lg font-medium" style={{ color: '#1D1D1F' }}>
          Vous vous reconnaissez&nbsp;? Il y a une meilleure façon de faire.
        </p>
      </section>

      {/* ── 5. FEATURES TABS ── */}
      <section
        id="fonctionnalites"
        className="w-full bg-white"
        style={{ ...sectionPx, ...sectionPy }}
        data-reveal
        aria-labelledby="home-features-heading"
      >
        <h2
          id="home-features-heading"
          className="font-semibold"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}
        >
          Fonctionnalités ERP transport
        </h2>

        <div className="mt-8 flex gap-8 overflow-x-auto border-b" style={{ borderColor: '#E5E5E5' }}>
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
            <p className="mt-4 text-lg leading-8" style={{ color: '#4b4b51' }}>{currentTab.description}</p>
            <p className="mt-5 text-base font-semibold" style={{ color: '#2563EB' }}>{currentTab.benefit}</p>
            <ul className="mt-6 space-y-3">
              {currentTab.highlights.map(item => (
                <li key={item} className="flex items-start gap-3 text-base leading-7" style={{ color: '#1f2937' }}>
                  <span className="mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-600" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {currentTab.link && (
              <Link
                to={currentTab.link}
                aria-label={`En savoir plus sur ${currentTab.title}`}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 transition-colors hover:text-sky-900"
              >
                En savoir plus
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 5l5 5-5 5"/></svg>
              </Link>
            )}
          </div>
          <div>
            <TabIllustration key={activeTab} tab={activeTab} onOpenScreenshot={setLightboxImage} />
          </div>
        </div>
      </section>

      {/* ── 6. HOW IT WORKS (horizontal, no image) ── */}
      <section
        className="w-full"
        style={{ background: '#F5F5F7', ...sectionPx, ...sectionPy }}
        data-reveal
        aria-labelledby="home-workflow-heading"
      >
        <h2
          id="home-workflow-heading"
          className="font-semibold leading-tight"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}
        >
          Opérationnel en 72 h. Pas en 6 mois.
        </h2>

        <div className="relative mt-8 grid gap-8 md:grid-cols-3">
          {/* Connecting line (desktop only) */}
          <div
            className="absolute left-[16.67%] right-[16.67%] top-8 hidden h-px md:block"
            style={{ background: '#E5E5E5' }}
          />

          {([
            ['1', 'Configurez', 'Importez véhicules, chauffeurs, clients. 15 minutes.'],
            ['2', 'Lancez', 'Premiers ordres de transport. Interface guidée.'],
            ['3', 'Pilotez', 'Dashboard temps réel, facturation en 2 clics.'],
          ] as const).map(([num, title, desc]) => (
            <div key={num} className="relative text-center md:text-left">
              <div
                className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold md:mx-0"
                style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', color: '#000000' }}
              >
                {num}
              </div>
              <h3 className="mt-6 text-xl font-semibold" style={{ color: '#000000' }}>{title}</h3>
              <p className="mt-2" style={{ color: '#4b4b51' }}>{desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-lg font-medium" style={{ color: '#1D1D1F' }}>
          Pas de projet IT. Pas de consultant. Vous êtes autonome.
        </p>
      </section>

      {/* ── 7. METRICS + TESTIMONIAL ── */}
      <section
        className="w-full bg-white"
        style={{ ...sectionPx, ...sectionPy }}
        data-reveal
        aria-label="Résultats mesurés sur l'exploitation transport"
      >
        <div className="grid gap-8 text-center md:grid-cols-3">
          {([
            ['+14 %', 'marge opérationnelle'],
            ['1 cockpit', 'pour toute votre exploitation'],
            ['-60 %', 'temps de facturation'],
          ] as const).map(([value, label]) => (
            <div key={value}>
              <p
                className="font-extrabold"
                style={{ fontSize: 'clamp(3rem, 7vw, 6rem)', color: '#000000', lineHeight: 1 }}
              >
                {value}
              </p>
              <p className="mt-3" style={{ color: '#4b4b51', fontSize: '16px' }}>{label}</p>
            </div>
          ))}
        </div>

        <blockquote className="mx-auto mt-12 max-w-3xl text-center">
          <p
            className="font-light italic leading-relaxed"
            style={{ fontSize: 'clamp(1.3rem, 3vw, 2rem)', color: '#1D1D1F' }}
          >
            On est passé de 3 outils à NEXORA en une semaine. Ma facturation sort en 2 clics.
          </p>
          <footer className="mt-6 text-base" style={{ color: '#4b4b51' }}>
            — Karim L., Dirigeant, Transport ALR (42 véhicules)
          </footer>
        </blockquote>
      </section>

      <section
        className="w-full bg-white"
        style={{ ...sectionPx, ...sectionPy }}
        data-reveal
        aria-labelledby="home-seo-hub-heading"
      >
        <h2
          id="home-seo-hub-heading"
          className="max-w-4xl font-semibold leading-tight"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: '#000000' }}
        >
          ERP transport : piloter efficacement son exploitation
        </h2>
        <div className="mt-8 max-w-4xl space-y-4" style={{ color: '#4b4b51' }}>
          <p>
            Dans une entreprise de transport, la difficulté n’est pas de collecter des informations, mais de les relier au
            bon moment. Un ERP transport utile rassemble le planning transport, la gestion flotte, les statuts de mission,
            les contraintes conducteurs et la facturation dans une lecture unique. Quand ces éléments restent dans plusieurs
            outils, les décisions deviennent lentes, les priorités changent sans trace et les équipes passent plus de temps à
            vérifier qu’à piloter. Une journée d’exploitation gagne en stabilité quand l’exploitant voit immédiatement ce qui
            est confirmé, ce qui bloque et ce qui nécessite un arbitrage terrain.
          </p>
          <p>
            Le rôle d’un logiciel transport n’est pas de produire plus d’écrans. Il doit réduire les frictions de
            coordination. Concrètement, cela signifie éviter la ressaisie entre les modules, sécuriser l’affectation des
            ressources et garder une continuité claire de l’ordre de transport jusqu’au suivi financier. Cette continuité
            améliore la qualité de service, limite les retards évitables et donne une base solide pour mesurer la rentabilité
            mission par mission. Pour les structures qui pilotent déjà de nombreux flux simultanés, la différence est
            immédiate: moins d’angles morts, moins de corrections de dernière minute et plus de décisions prises avec des
            données fiables.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-2xl font-semibold tracking-tight" style={{ color: '#000000' }}>
              Planning transport
            </h3>
            <p className="mt-4 text-lg font-semibold" style={{ color: '#000000' }}>
              Structurer la journée avant qu’elle ne se dèrègle
            </p>
            <p className="mt-2 text-sm leading-7" style={{ color: '#4b4b51' }}>
              Un planning transport efficace doit intégrer la charge réelle, les disponibilités conducteurs, la faisabilité
              flotte et les contraintes clients. L’objectif n’est pas d’écrire un plan parfait, mais de rendre les
              réaffectations rapides et lisibles quand la journée bouge.
            </p>
          </article>

          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-2xl font-semibold tracking-tight" style={{ color: '#000000' }}>
              Gestion de flotte
            </h3>
            <p className="mt-4 text-lg font-semibold" style={{ color: '#000000' }}>
              Relier disponibilité, maintenance et exploitation
            </p>
            <p className="mt-2 text-sm leading-7" style={{ color: '#4b4b51' }}>
              La gestion flotte est vraiment utile lorsqu’elle reste connectée au pilotage opérationnel. Une indisponibilité,
              un passage atelier ou une contrainte réglementaire doivent être visibles avant l’affectation, pas après le
              départ de mission.
            </p>
          </article>

          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-2xl font-semibold tracking-tight" style={{ color: '#000000' }}>
              Suivi des opérations
            </h3>
            <p className="mt-4 text-lg font-semibold" style={{ color: '#000000' }}>
              Décider vite avec des statuts compréhensibles
            </p>
            <p className="mt-2 text-sm leading-7" style={{ color: '#4b4b51' }}>
              Le suivi des opérations doit montrer l’avancement réel, les incidents et les points de blocage sans multiplier
              les canaux. Cette lecture améliore la relation client et réduit le temps de coordination interne.
            </p>
          </article>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-2xl font-semibold tracking-tight" style={{ color: '#000000' }}>
              TMS transport
            </h3>
            <p className="mt-4 text-lg font-semibold" style={{ color: '#000000' }}>
              Piloter les ordres de transport dans un flux unique
            </p>
            <p className="mt-2 text-sm leading-7" style={{ color: '#4b4b51' }}>
              Un <Link to="/tms-transport" style={{ color: '#2563EB', fontWeight: 600 }}>TMS transport</Link> efficace relie
              la création de l'ordre à son exécution terrain et à la facturation. Séparé du reste, il produit des données
              sans les relier à l'exploitation. NEXORA Truck unifie TMS et ERP dans le même environnement.
            </p>
          </article>

          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-2xl font-semibold tracking-tight" style={{ color: '#000000' }}>
              Télématique et chronotachygraphe
            </h3>
            <p className="mt-4 text-lg font-semibold" style={{ color: '#000000' }}>
              Données terrain et conformité intégrées
            </p>
            <p className="mt-2 text-sm leading-7" style={{ color: '#4b4b51' }}>
              La <Link to="/telematique-transport" style={{ color: '#2563EB', fontWeight: 600 }}>télématique embarquée</Link> remonte
              position, kilométrage et alertes directement dans l'ERP. Le module{' '}
              <Link to="/chronotachygraphe" style={{ color: '#2563EB', fontWeight: 600 }}>chronotachygraphe</Link> assure
              le suivi automatisé des temps de conduite et la conformité réglementaire.
            </p>
          </article>

          <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5">
            <h3 className="text-2xl font-semibold tracking-tight" style={{ color: '#000000' }}>
              IA transport
            </h3>
            <p className="mt-4 text-lg font-semibold" style={{ color: '#000000' }}>
              Optimiser l’exploitation par l’intelligence artificielle
            </p>
            <p className="mt-2 text-sm leading-7" style={{ color: '#4b4b51' }}>
              L'<Link to="/ia-transport" style={{ color: '#2563EB', fontWeight: 600 }}>IA transport</Link> de NEXORA Truck
              propose des suggestions de planning, détecte les anomalies en temps réel et optimise les tournées pour réduire
              les kilomètres à vide et améliorer la rentabilité mission.
            </p>
          </article>
        </div>

        <div className="mt-8 max-w-4xl space-y-4" style={{ color: '#4b4b51' }}>
          <p>
            Pour approfondir cette logique, consultez la page <Link to="/erp-transport">ERP transport</Link>, la page{' '}
            <Link to="/logiciel-transport">logiciel transport</Link>, le{' '}
            <Link to="/tms-transport">TMS transport</Link>, la{' '}
            <Link to="/logiciel-gestion-flotte-camion">gestion de flotte</Link>, la{' '}
            <Link to="/telematique-transport">télématique</Link>, le{' '}
            <Link to="/chronotachygraphe">chronotachygraphe</Link>, l'<Link to="/ia-transport">IA transport</Link>{' '}
            et la rubrique <Link to="/articles">articles</Link>.
          </p>
        </div>
      </section>

      {/* ── 8. BLOG PREVIEW ── */}
      <section
        className="w-full bg-[#F5F5F7]"
        style={{ ...sectionPx, paddingBlock: 'clamp(28px, 3.5vw, 56px)' }}
        data-reveal
        aria-labelledby="home-blog-heading"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em]" style={{ color: '#2563EB' }}>Blog</p>
            <h2
              id="home-blog-heading"
              className="mt-3 font-semibold tracking-tight"
              style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', color: '#000000' }}
            >
              Ressources métier transport
            </h2>
          </div>
          <Link
            to="/articles"
            className="text-sm font-semibold transition-colors shrink-0"
            style={{ color: '#2563EB' }}
          >
            Tous les articles →
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articleIndex.slice(-3).map(article => (
            <Link
              key={article.slug}
              to={`/articles/${article.slug}`}
              aria-label={`Lire l'article : ${article.title}`}
              className="group flex flex-col rounded-[1.8rem] border bg-white p-6 transition-all hover:-translate-y-0.5"
              style={{ borderColor: 'rgba(148,163,184,0.18)', boxShadow: '0 10px 28px rgba(15,23,42,0.06)' }}
            >
              <span
                className="mb-3 inline-block self-start rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em]"
                style={{ background: 'rgba(37,99,235,0.07)', color: '#2563EB' }}
              >
                Article
              </span>
              <h3
                className="flex-1 text-base font-semibold leading-snug tracking-tight transition-colors"
                style={{ color: '#1D1D1F' }}
              >
                {article.title}
              </h3>
              <p className="mt-3 text-sm leading-6" style={{ color: '#4b4b51' }}>{article.description}</p>
              <span className="mt-5 text-xs font-semibold transition-colors" style={{ color: '#2563EB' }}>
                Lire l'article →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 9. FINAL CTA (with background image) ── */}
      <section
        className="relative w-full overflow-hidden text-center"
        style={{ ...sectionPx, paddingBlock: 'clamp(40px, 5vw, 80px)' }}
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
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />

        <div className="relative">
          <h2
            id="home-cta-heading"
            className="mx-auto max-w-3xl text-balance font-semibold leading-tight"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#FFFFFF' }}
          >
            Reprenez le contrôle de votre exploitation. Dès aujourd’hui.
          </h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/connexion-erp"
              className="site-btn-primary px-6 py-3 text-sm transition-colors"
            >
              Essai gratuit
            </Link>
            <Link
              to="/contact"
              className="text-sm font-semibold transition-colors"
              style={{ color: '#FFFFFF' }}
            >
              Parler à un expert
            </Link>
          </div>
        </div>
      </section>

    </>
  )
}
