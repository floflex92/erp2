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
  {
    title: 'Affréteur',
    problem: 'Vous jonglez entre disponibilité partenaire, statut OT et échanges multicanaux.',
    solution: 'NEXORA synchronise l’espace affrètement, les statuts mission et la coordination inter-ERP.',
    benefit: 'Bénéfice concret: moins de latence de coordination et plus de fiabilité sur les engagements.',
  },
  {
    title: 'Client',
    problem: 'Vous manquez de visibilité fiable sur l’avancement réel et les délais de livraison.',
    solution: 'NEXORA connecte l’espace client, le suivi opérationnel et les preuves d’exécution.',
    benefit: 'Bénéfice concret: information claire, moins de relances et meilleure confiance sur la livraison.',
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
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return true
    return document.getElementById('root')?.dataset.ssr === 'true'
  })

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
        url: 'https://nexora-truck.fr/site/logo/brand/nexora-logo-dark.png',
        width: 512,
        height: 512,
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
          url: 'https://nexora-truck.fr/site/logo/brand/nexora-logo-dark.png',
          width: 512,
          height: 512,
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
        className="relative w-full overflow-hidden"
        style={{
          ...sectionPx,
          paddingTop: 'clamp(110px, 13vw, 160px)',
          paddingBottom: 'clamp(40px, 5vw, 72px)',
          background: 'linear-gradient(180deg, #E6F0FA 0%, #EEF5FB 45%, #F7FAFD 100%)',
        }}
        aria-labelledby="home-hero-heading"
      >
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          {/* Left column — title & CTA */}
          <div className="relative">
            <h1
              id="home-hero-heading"
              className="font-extrabold leading-[0.95] tracking-tight"
              style={{ fontSize: 'clamp(3rem, 7.6vw, 6rem)', color: '#0B1B3B', letterSpacing: '-0.02em' }}
            >
              AVANÇONS
              <br />
              <span className="site-hero-gradient-text">ENSEMBLE.</span>
            </h1>
            <p
              className="mt-7 max-w-xl"
              style={{ color: '#334155', fontSize: 'clamp(1rem, 1.25vw, 1.15rem)', lineHeight: 1.65 }}
            >
              Nexora est la solution tout-en-un pour piloter vos opérations de transport,
              en temps réel, de manière simple, connectée et performante.
            </p>
            <div
              className="mt-6 h-[3px] w-28 rounded-full"
              style={{ background: 'linear-gradient(90deg,#0ea5e9 0%, #22c55e 100%)' }}
              aria-hidden="true"
            />
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/solution"
                className="site-hero-cta uppercase"
                style={{ letterSpacing: '0.08em' }}
              >
                Découvrir nos solutions
                <span aria-hidden="true" className="ml-3 text-lg leading-none">→</span>
              </Link>
              <button
                type="button"
                onClick={() => setVideoOpen(true)}
                className="inline-flex min-h-[44px] items-center text-sm font-semibold"
                style={{ color: '#1e3a8a' }}
              >
                Voir la démo vidéo ▶
              </button>
            </div>
          </div>

          {/* Right column — visual + floating KPI card */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-[2rem] shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
              <img
                src={sitePhotos.truckRoadWide.src(1400)}
                srcSet={sitePhotos.truckRoadWide.srcSet([768, 1400])}
                sizes="(min-width: 1024px) 48vw, 92vw"
                alt="Camion NEXORA sur la route — pilotage transport en temps réel"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="block h-full w-full object-cover"
                style={{ aspectRatio: '4/3' }}
              />
            </div>

            {/* KPI card */}
            <div
              className="absolute left-[-4%] top-[-6%] w-[68%] max-w-[360px] rounded-2xl border border-slate-100 bg-white/95 p-4 backdrop-blur-sm sm:p-5"
              style={{ boxShadow: '0 24px 60px rgba(15,23,42,0.18)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#0B1B3B' }}>
                Pilotage en temps réel
              </p>
              <p className="mt-1 text-[11px]" style={{ color: '#64748B' }}>
                Vue d’ensemble de votre activité
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {([
                  { label: 'Livraisons', value: '128', delta: '+12%' },
                  { label: 'Taux de service', value: '98,6%', delta: '+2,1%' },
                  { label: 'Coût / km', value: '0,98 €', delta: '-4%' },
                ] as const).map(kpi => (
                  <div key={kpi.label}>
                    <p className="text-[9px] font-medium" style={{ color: '#64748B' }}>{kpi.label}</p>
                    <p className="mt-0.5 text-base font-bold leading-tight" style={{ color: '#0B1B3B' }}>{kpi.value}</p>
                    <p className="text-[10px] font-semibold" style={{ color: '#16A34A' }}>{kpi.delta}</p>
                  </div>
                ))}
              </div>
              <svg viewBox="0 0 300 60" className="mt-3 h-10 w-full" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 48 L50 34 L100 40 L150 20 L200 28 L250 14 L300 22" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M0 52 L50 44 L100 48 L150 36 L200 40 L250 30 L300 36" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom features strip */}
        <div className="mt-14 grid gap-8 border-t pt-10 sm:grid-cols-2 lg:grid-cols-4" style={{ borderColor: 'rgba(15,23,42,0.08)' }}>
          {[
            {
              title: 'Pilotez en temps réel',
              desc: 'Gardez le contrôle sur vos opérations.',
              icon: (
                <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="#0ea5e9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              ),
            },
            {
              title: 'Optimisez vos ressources',
              desc: 'Moins de coûts, plus de performance.',
              icon: (
                <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="10" width="4" height="4" rx="1" />
                  <rect x="17" y="10" width="4" height="4" rx="1" />
                  <rect x="10" y="4" width="4" height="4" rx="1" />
                  <rect x="10" y="16" width="4" height="4" rx="1" />
                  <path d="M7 12h3M14 12h3M12 8v2M12 14v2" />
                </svg>
              ),
            },
            {
              title: 'Prenez les bonnes décisions',
              desc: 'Des données fiables pour un pilotage intelligent.',
              icon: (
                <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="#0ea5e9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
                </svg>
              ),
            },
            {
              title: 'Gagnez en fiabilité et en sérénité',
              desc: 'Un partenaire engagé à vos côtés.',
              icon: (
                <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              ),
            },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="shrink-0">{f.icon}</div>
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.06em]" style={{ color: '#0B1B3B' }}>
                  {f.title}
                </p>
                <p className="mt-1 text-sm leading-6" style={{ color: '#475569' }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
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
          className="w-full overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F3F6FA 100%)',
            ...sectionPx,
            ...sectionPy,
          }}
          data-reveal
          aria-labelledby="home-pain-heading"
        >
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
            {/* Left — title + bullets */}
            <div>
              <h2
                id="home-pain-heading"
                className="font-extrabold leading-[0.98] tracking-tight"
                style={{ fontSize: 'clamp(2.3rem, 5.4vw, 4.2rem)', color: '#0B1B3B', letterSpacing: '-0.02em' }}
              >
                TROP D’OUTILS.
                <br />
                <span className="site-hero-gradient-text">TROP DE PERTE.</span>
              </h2>
              <p className="mt-6 max-w-xl text-base leading-8" style={{ color: '#334155', fontSize: 'clamp(1rem, 1.15vw, 1.1rem)' }}>
                Informations éparpillées, tâches manuelles, manque de visibilité, erreurs, retards…
                <br />
                Vos opérations méritent mieux.
              </p>

              <ul className="mt-8 space-y-4">
                {[
                  {
                    label: 'Données dispersées et non fiables',
                    icon: (
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#0ea5e9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <ellipse cx="12" cy="6" rx="8" ry="3" />
                        <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
                        <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
                      </svg>
                    ),
                  },
                  {
                    label: 'Suivi des livraisons complexe',
                    icon: (
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#0ea5e9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
                        <circle cx="7" cy="17" r="2" />
                        <circle cx="17" cy="17" r="2" />
                      </svg>
                    ),
                  },
                  {
                    label: 'Communication fragmentée',
                    icon: (
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#0ea5e9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="M3 7l9 6 9-6" />
                      </svg>
                    ),
                  },
                  {
                    label: 'Décisions ralenties, performance impactée',
                    icon: (
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#0ea5e9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
                      </svg>
                    ),
                  },
                ].map(item => (
                  <li key={item.label} className="flex items-center gap-4">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(14,165,233,0.10)' }}>
                      {item.icon}
                    </span>
                    <span className="text-base font-medium" style={{ color: '#1F2937' }}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                <p className="text-lg font-bold" style={{ color: '#0B1B3B' }}>Le chaos vous coûte cher.</p>
                <Link
                  to="/solution"
                  className="site-hero-gradient-text mt-1 inline-block text-lg font-bold"
                >
                  Reprenez le contrôle.
                </Link>
                <div
                  className="mt-3 h-[3px] w-28 rounded-full"
                  style={{ background: 'linear-gradient(90deg,#0ea5e9 0%, #22c55e 100%)' }}
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Right — chaos mock UI */}
            <div className="relative mx-auto w-full max-w-[640px]" style={{ aspectRatio: '5/4' }} aria-hidden="true">
              {/* Dashed connectors */}
              <svg viewBox="0 0 600 480" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                <g stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" fill="none" opacity="0.7">
                  <path d="M300 260 C 220 200, 180 140, 150 90" />
                  <path d="M300 260 C 360 200, 400 150, 430 90" />
                  <path d="M300 260 C 380 230, 470 200, 520 160" />
                  <path d="M300 260 C 230 290, 180 340, 140 400" />
                  <path d="M300 260 C 350 320, 410 360, 470 400" />
                  <path d="M300 260 C 260 230, 240 210, 220 200" />
                </g>
              </svg>

              {/* Center: overwhelmed person silhouette card */}
              <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">
                <div className="flex h-40 w-40 items-center justify-center rounded-full border border-slate-200 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
                  <svg viewBox="0 0 64 64" className="h-24 w-24" fill="none" stroke="#64748B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="32" cy="22" r="10" />
                    <path d="M14 56c0-10 8-16 18-16s18 6 18 16" />
                    <path d="M24 20c-1-2-3-3-5-3M40 20c1-2 3-3 5-3" />
                    <path d="M26 26c-2 2-4 2-6 1M38 26c2 2 4 2 6 1" />
                  </svg>
                </div>
              </div>

              {/* Card: Planning.xlsx */}
              <div className="absolute left-[6%] top-[4%] w-[46%] rounded-xl border border-slate-200 bg-white p-3 shadow-[0_16px_32px_rgba(15,23,42,0.10)]">
                <div className="flex items-center gap-2 border-b pb-2 text-[10px] font-semibold" style={{ borderColor: '#E2E8F0', color: '#0B1B3B' }}>
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: '#16A34A' }} />
                  PLANNING.xlsx
                  <span className="ml-auto text-slate-400">×</span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1 text-[8px]" style={{ color: '#475569' }}>
                  {['Date', 'Origine', 'Destination', 'Statut'].map(h => (
                    <span key={h} className="font-semibold" style={{ color: '#0B1B3B' }}>{h}</span>
                  ))}
                  {[
                    ['12/05', 'Lyon', 'Paris', 'En cours'],
                    ['12/05', 'Marseille', 'Lille', 'En attente'],
                    ['12/05', 'Nantes', 'Lyon', 'En cours'],
                    ['12/05', 'Bordeaux', 'Paris', 'En attente'],
                  ].flat().map((c, i) => (
                    <span key={i}>{c}</span>
                  ))}
                </div>
              </div>

              {/* Card: Suivi GPS */}
              <div className="absolute right-[18%] top-[6%] w-[34%] rounded-xl border border-slate-200 bg-white p-3 shadow-[0_16px_32px_rgba(15,23,42,0.10)]">
                <div className="flex items-center gap-2 border-b pb-2 text-[10px] font-semibold" style={{ borderColor: '#E2E8F0', color: '#0B1B3B' }}>
                  SUIVI GPS
                  <span className="ml-auto text-slate-400">×</span>
                </div>
                <div className="mt-2 h-16 rounded-md" style={{ background: 'linear-gradient(135deg,#E0F2FE,#DCFCE7)' }}>
                  <svg viewBox="0 0 120 60" className="h-full w-full" preserveAspectRatio="none">
                    <path d="M10 50 C 30 10, 50 40, 70 25 S 110 10, 115 20" stroke="#0ea5e9" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <circle cx="80" cy="22" r="3" fill="#0ea5e9" />
                  </svg>
                </div>
                <p className="mt-2 text-[9px]" style={{ color: '#475569' }}>
                  Statut : <span className="font-semibold" style={{ color: '#0ea5e9' }}>En cours</span>
                </p>
              </div>

              {/* Card: Boîte de réception */}
              <div className="absolute right-[2%] top-[2%] w-[34%] rounded-xl border border-slate-200 bg-white p-3 shadow-[0_16px_32px_rgba(15,23,42,0.10)]">
                <div className="flex items-center gap-2 border-b pb-2 text-[10px] font-semibold" style={{ borderColor: '#E2E8F0', color: '#0B1B3B' }}>
                  <span>✉</span> Boîte de réception
                  <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ background: '#EF4444' }}>23</span>
                </div>
                <ul className="mt-2 space-y-1 text-[9px]" style={{ color: '#475569' }}>
                  {[
                    ['Nouveau mail', '09:15'],
                    ['RE: Livraison urgente', '09:07'],
                    ['Problème camion', 'Hier'],
                    ['Documents à envoyer', 'Hier'],
                  ].map(([l, t]) => (
                    <li key={l} className="flex items-center justify-between">
                      <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sky-500" />{l}</span>
                      <span className="text-slate-400">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Card: Appel fournisseur */}
              <div className="absolute left-[2%] top-[46%] w-[30%] rounded-xl border border-slate-200 bg-white p-3 shadow-[0_16px_32px_rgba(15,23,42,0.10)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: '#0B1B3B' }}>Appel fournisseur</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: '#16A34A', color: '#fff' }}>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.24c1.1.37 2.3.58 3.6.58a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.3.2 2.5.58 3.6a1 1 0 01-.24 1z" /></svg>
                  </span>
                  <span className="text-xs font-bold" style={{ color: '#0B1B3B' }}>02:34</span>
                </div>
                <svg viewBox="0 0 100 20" className="mt-2 h-5 w-full" preserveAspectRatio="none" aria-hidden="true">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <rect key={i} x={i * 3.6} y={8 - Math.abs(Math.sin(i) * 6)} width="2" height={Math.abs(Math.sin(i) * 12) + 2} fill="#16A34A" opacity="0.8" />
                  ))}
                </svg>
              </div>

              {/* Card: Tâches */}
              <div className="absolute left-[34%] top-[50%] w-[26%] rounded-xl border border-slate-200 bg-white p-3 shadow-[0_16px_32px_rgba(15,23,42,0.10)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: '#0B1B3B' }}>Tâches</p>
                <ul className="mt-2 space-y-1 text-[9px]" style={{ color: '#475569' }}>
                  {['Appeler client', 'Envoyer document', 'Vérifier livraison', 'Relancer chauffeur'].map(t => (
                    <li key={t} className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-sm border" style={{ borderColor: '#CBD5E1' }} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Card: WhatsApp */}
              <div className="absolute right-[12%] top-[46%] w-[30%] rounded-xl border border-slate-200 bg-white p-3 shadow-[0_16px_32px_rgba(15,23,42,0.10)]">
                <div className="flex items-center gap-2 text-[10px] font-semibold" style={{ color: '#0B1B3B' }}>
                  <span className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] text-white" style={{ background: '#16A34A' }}>W</span>
                  WHATSAPP
                </div>
                <div className="mt-2 space-y-1 text-[9px]">
                  <p className="inline-block rounded-lg bg-slate-100 px-2 py-1" style={{ color: '#334155' }}>Où en est la livraison ?</p>
                  <p className="block text-right"><span className="inline-block rounded-lg px-2 py-1 text-[#052e16]" style={{ background: '#DCFCE7' }}>Je regarde</span></p>
                  <p className="inline-block rounded-lg bg-slate-100 px-2 py-1" style={{ color: '#334155' }}>Merci !</p>
                </div>
              </div>

              {/* Card: Documents */}
              <div className="absolute right-[2%] bottom-[4%] w-[32%] rounded-xl border border-slate-200 bg-white p-3 shadow-[0_16px_32px_rgba(15,23,42,0.10)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: '#0B1B3B' }}>Documents</p>
                <ul className="mt-2 space-y-1 text-[10px]" style={{ color: '#475569' }}>
                  {['Contrats', 'Bons de livraison', 'Factures'].map(d => (
                    <li key={d} className="flex items-center gap-2">
                      <span className="text-amber-500">📁</span>{d}
                    </li>
                  ))}
                </ul>
                <svg viewBox="0 0 24 24" className="ml-auto mt-1 h-5 w-5" fill="none" stroke="#0ea5e9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 18a4 4 0 010-8 6 6 0 0111.5-1 4.5 4.5 0 01.5 9H6z" />
                  <path d="M12 12v6M9 15l3-3 3 3" />
                </svg>
              </div>

              {/* Red alert pills */}
              <div className="absolute left-[48%] top-[22%] rounded-md px-2 py-1 text-[9px] font-semibold text-white shadow-md" style={{ background: '#0B1B3B' }}>
                <span className="mr-1" style={{ color: '#EF4444' }}>⚠</span>Données non à jour
              </div>
              <div className="absolute left-[22%] top-[60%] rounded-md px-2 py-1 text-[9px] font-semibold text-white shadow-md" style={{ background: '#0B1B3B' }}>
                <span className="mr-1" style={{ color: '#EF4444' }}>⚠</span>Manque de visibilité
              </div>
              <div className="absolute right-[2%] top-[54%] rounded-md px-2 py-1 text-[9px] font-semibold text-white shadow-md" style={{ background: '#0B1B3B' }}>
                <span className="mr-1" style={{ color: '#EF4444' }}>⚠</span>Erreurs et retards
              </div>
            </div>
          </div>
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
          className="relative w-full overflow-hidden"
          style={{
            ...sectionPx,
            paddingBlock: 'clamp(64px, 7vw, 112px)',
            background: 'linear-gradient(180deg, #F7FAFD 0%, #EAF2FB 100%)',
          }}
          data-reveal
          aria-labelledby="home-cta-heading"
        >
          {/* Decorative gradient blob */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-40 blur-3xl"
            style={{ background: 'radial-gradient(circle,#22c55e 0%, transparent 70%)' }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle,#0ea5e9 0%, transparent 70%)' }}
          />

          <div className="relative mx-auto max-w-5xl text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#0ea5e9' }}>
              NEXORA Truck
            </p>
            <h2
              id="home-cta-heading"
              className="mx-auto mt-5 max-w-4xl text-balance font-extrabold leading-[1.05] tracking-tight"
              style={{ fontSize: 'clamp(2rem, 5.2vw, 3.6rem)', color: '#0B1B3B', letterSpacing: '-0.02em' }}
            >
              Passez de la complexité à un{' '}
              <span className="site-hero-gradient-text">pilotage clair</span>
              <br className="hidden sm:block" />
              {' '}en un seul outil.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8" style={{ color: '#334155', fontSize: 'clamp(1rem, 1.15vw, 1.1rem)' }}>
              Demandez une démo personnalisée ou testez l’ERP transport NEXORA dès maintenant.
            </p>
            <div
              className="mx-auto mt-6 h-[3px] w-28 rounded-full"
              style={{ background: 'linear-gradient(90deg,#0ea5e9 0%, #22c55e 100%)' }}
              aria-hidden="true"
            />
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/demonstration"
                className="site-hero-cta uppercase"
                style={{ letterSpacing: '0.08em' }}
              >
                Demander une démo
                <span aria-hidden="true" className="ml-3 text-lg leading-none">→</span>
              </Link>
              <Link
                to="/connexion-erp"
                className="inline-flex min-h-[48px] items-center rounded-xl border px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition-colors"
                style={{ borderColor: '#0B1B3B', color: '#0B1B3B', background: '#FFFFFF' }}
              >
                Tester l’ERP
              </Link>
            </div>
          </div>
        </section>
      </LazySection>

    </>
  )
}
