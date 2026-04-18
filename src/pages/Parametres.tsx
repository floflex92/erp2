import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { canAccess, ROLE_LABELS, useAuth } from '@/lib/auth'
import { APP_VERSION } from '@/lib/appVersion'
import { DEFAULT_COMPANY_NAME, readCompanySettings, subscribeCompanySettings, updateCompanySettings } from '@/lib/companySettings'
import { releaseNotes, type ReleaseNote } from '@/lib/releaseNotes'
import { getDigitalSignature, subscribeDigitalSignatures, upsertDigitalSignature } from '@/lib/signatureStore'
import { ErpV11Settings } from '@/components/settings/ErpV11Settings'
import OllamaChat from '@/components/OllamaChat'
import { ErpClientsSettings } from '@/components/settings/ErpClientsSettings'
import { DriverGroupsSettings } from '@/components/settings/DriverGroupsSettings'
import { ObservabilitePanel } from '@/components/settings/ObservabilitePanel'
import { ServicesOverviewCard } from '@/domains/services/components/ServicesOverviewCard'
import {
  developedCatalogFeatures,
  inProgressCatalogFeatures,
  upcomingCatalogFeatures,
  type CatalogFeature,
} from '@/lib/featuresCatalog'

// ── Menu items ────────────────────────────────────────────────────────────────
type MenuId = 'compte' | 'entreprise' | 'signature' | 'rgpd' | 'utilisateurs' | 'aide' | 'modules' | 'developpement' | 'clients-erp' | 'groupes-conducteurs' | 'observabilite'

type MenuItem = {
  id: MenuId
  label: string
  icon: ReactNode
  adminOnly?: boolean
  roleRequired?: string
}

function IconCompte() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
}
function IconEntreprise() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M12 12v4m-4-2h8"/></svg>
}
function IconSignature() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M3 17c3-3 5-7 5-7s1 3 2 4 3-4 3-4 1 4 4 4"/><path d="M4 20h16"/></svg>
}
function IconRGPD() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M12 2L4 6v6c0 5.5 3.5 9.7 8 11 4.5-1.3 8-5.5 8-11V6L12 2z"/></svg>
}
function IconUtilisateurs() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a5 5 0 0 1 5-5h4"/><path d="M19 16v6m-3-3h6"/></svg>
}
function IconAide() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><circle cx="12" cy="12" r="9"/><path d="M12 17v.5M9.5 9.5a2.5 2.5 0 0 1 5 0c0 2.5-2.5 2.5-2.5 4.5"/></svg>
}
function IconModules() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
}
function IconEye() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
}

const inp = 'w-full rounded-xl border bg-[color:var(--surface)] px-3 py-2.5 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--primary)]'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error(`Lecture impossible pour ${file.name}.`))
    reader.onerror = () => reject(new Error(`Lecture impossible pour ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────
const DEPLOYED_VERSION = APP_VERSION

const DEVELOPMENT_TAB_CONTENT: Record<'developpe' | 'en-cours' | 'features', {
  eyebrow: string
  title: string
  description: string
  items: readonly CatalogFeature[]
  accent: string
  badgeBg: string
}> = {
  developpe: {
    eyebrow: 'Disponible',
    title: 'Socle déjà exploitable dans l ERP',
    description: 'Vue regroupée par domaine pour retrouver rapidement ce qui est déjà en production dans l application.',
    items: developedCatalogFeatures,
    accent: '#2563EB',
    badgeBg: '#EFF6FF',
  },
  'en-cours': {
    eyebrow: 'En cours',
    title: 'Chantiers actifs à court terme',
    description: 'Travaux déjà engagés, avec une lecture produit plus claire et moins technique que la liste brute précédente.',
    items: inProgressCatalogFeatures,
    accent: '#0F766E',
    badgeBg: '#ECFDF5',
  },
  features: {
    eyebrow: 'Roadmap',
    title: 'Features prévues et axes d extension',
    description: 'Projection des prochaines briques métier, organisée par catégorie comme sur le site public.',
    items: upcomingCatalogFeatures,
    accent: '#7C3AED',
    badgeBg: '#F5F3FF',
  },
}

const DEV_HIGHLIGHTS = [
  { label: 'Développé', value: developedCatalogFeatures.length, accent: '#2563EB' },
  { label: 'En cours', value: inProgressCatalogFeatures.length, accent: '#0F766E' },
  { label: 'Features', value: upcomingCatalogFeatures.length, accent: '#7C3AED' },
  { label: 'Versions', value: releaseNotes.length, accent: '#0F172A' },
] as const

const ERP_IN_PROGRESS_CARDS = [
  {
    title: 'Statut partiel',
    subtitle: 'Modules déjà visibles mais encore incomplets côté persistance ou logique métier.',
    items: [
      'Cockpit KPI V2.1 livré par rôle métier avec lecture prioritaire, fallback historique et composants dashboard-v21 réutilisables.',
      'Finance cockpit branchée sur vues SQL dédiées Supabase (KPI, clients, charges, retards) avec fallback historique.',
      'Homepage site public v1.1 livrée : message clarifié, sections conversion et SEO métier transport renforcé.',
      'SEO technique route-level livré : pré-rendu HTML statique par URL publique avec title/meta/canonical/og différenciés.',
      'Facturation : lignes multi-article, génération auto depuis OT, export comptable intégré à finaliser.',
      'Paie : calcul et import en place, mais bulletins encore stockés localement.',
      'RH : entretiens et absences en base, fiches employés et documents encore locaux.',
      'Portails client et affréteur : workflows présents, persistance à compléter.',
      'Utilisateurs : workflow admin complet dépendant encore de la function Netlify dédiée.',
      'Foundation compte client db et RLS strict : chantiers V1 encore à consolider.',
      'Alertes transport : tableau de bord et moteur de règles opérationnels (v1.15) ; automatisation proactive serveur et notifications push à venir.',
      'Optimiseur de routes : calcul distances et suggestions front posées (v1.15) ; intégration API cartographie réelle à connecter.',
    ],
  },
  {
    title: 'Dette locale restante',
    subtitle: 'Blocs utiles mais encore enfermés dans du localStorage ou du fallback temporaire.',
    items: [
      'Cockpit V2.1 : ajustements UX rôle par rôle encore en cours (densité mobile, calibrage des seuils et interactions terrain).',
      'Frais : circuit RH-comptable-paie opérationnel, non partagé entre appareils.',
      'Mail : expérience démo complète, pas encore reliée à un vrai client SMTP/IMAP.',
      'Coffre numérique : navigation et signature locale, sans accès multi-appareils.',
      'Équipements : CRUD local avec fallback tant que la table dédiée n est pas stabilisée.',
    ],
  },
] as const

const ERP_FEATURE_CARDS = [
  {
    title: 'Features maintenues',
    subtitle: 'Priorités à garder visibles dans l ERP.',
    items: [
      'Connectivité et discussion inter-ERP',
      'Planning affréteur dédié',
      'Groupage multi-courses figeable et déliable avec courses indépendantes',
    ],
  },
  {
    title: 'Benchmark marché TMS',
    subtitle: '24 features issues du benchmark Akanea, Dashdoc, GedTrans, Transporeon.',
    items: [
      'App mobile chauffeur, mode hors-ligne et eCMR dématérialisée.',
      'Preuve de livraison photo/signature, portail client et portail affrété autonome.',
      'Saisie commandes par IA et suivi temps réel client.',
      'Grilles tarifaires versionnées, prise de RDV quai et gestion doc fournisseurs.',
      'API ouverte, e-formulaires terrain, multi-devises et booking chargeurs.',
    ],
  },
  {
    title: 'Ce qui manque encore',
    subtitle: 'Travaux de fond pour fiabiliser l application au-delà du front.',
    items: [
      'Persistance Supabase pour Frais, Mail, Coffre et Équipements.',
      'Portails client et affréteur pleinement persistés en base.',
      'Bulletins de paie et fiches employés multi-appareils.',
      'Messagerie réelle SMTP/IMAP multi-utilisateurs.',
      'Import fichiers tachygraphe réels et couverture end-to-end multi-rôles.',
      'Durcissement sécurité avancé sur les endpoints publics.',
    ],
  },
  {
    title: 'Extensions fortes',
    subtitle: 'Directions produit crédibles à forte valeur.',
    items: [
      'IA de parsing d emails transport vers création de course.',
      'ETA prédictif multi-contraintes et scoring automatique des demandes.',
      'Cockpit KPI ultra visuel par rôle et notifications intelligentes.',
      'Optimisation tournées multi-contraintes et suivi température frigo.',
      'Intégration API bourse de fret et tracking temps réel externe.',
    ],
  },
] as const

export default function Parametres() {
  const { role, sessionRole, isAdmin, isDemoSession, profil, accountProfil, tenantAllowedPages, companyId } = useAuth()
  const location = useLocation()
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const signatureInputRef = useRef<HTMLInputElement | null>(null)

  const [company, setCompany] = useState(readCompanySettings())
  const [signature, setSignature] = useState(profil ? getDigitalSignature(profil.id) : null)
  const [signatureText, setSignatureText] = useState('')
  const [devTab, setDevTab] = useState<'developpe'|'en-cours'|'features'|'versions'>('features')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeMenu, setActiveMenu] = useState<MenuId>('compte')

  const modeLabel = role ? ROLE_LABELS[role] : 'Session inconnue'
  const assignedRole = profil?.role ?? null
  const assignedLabel = assignedRole ? ROLE_LABELS[assignedRole] : 'Non defini'
  const accountLabel = accountProfil?.role ? ROLE_LABELS[accountProfil.role] : 'Non defini'
  const isCompanyManager = role === 'admin' || role === 'super_admin' || role === 'dirigeant'
  const canManageErpClients = role === 'admin' || role === 'super_admin' || accountProfil?.role === 'admin' || accountProfil?.role === 'super_admin'

  useEffect(() => {
    function refreshCompany() { setCompany(readCompanySettings()) }
    refreshCompany()
    return subscribeCompanySettings(refreshCompany)
  }, [])

  useEffect(() => {
    if (!profil) return
    const currentProfil = profil
    function refreshSignature() {
      const next = getDigitalSignature(currentProfil.id)
      setSignature(next)
      setSignatureText(next?.signatureText ?? ([currentProfil.prenom, currentProfil.nom].filter(Boolean).join(' ') || ''))
    }
    refreshSignature()
    return subscribeDigitalSignatures(refreshSignature)
  }, [profil])

  useEffect(() => {
    if (location.hash === '#rgpd') setActiveMenu('rgpd')
    else if (location.hash === '#aide') setActiveMenu('aide')
  }, [location.hash])

  async function handleLogoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const logoDataUrl = await readFileAsDataUrl(file)
    const next = updateCompanySettings({ logoDataUrl, logoFileName: file.name })
    setCompany(next)
    setNotice('Logo entreprise enregistre.')
    setError(null)
    event.target.value = ''
  }

  async function handleSignatureFile(event: ChangeEvent<HTMLInputElement>) {
    if (!profil) return
    const file = event.target.files?.[0]
    if (!file) return
    const signatureImageUrl = await readFileAsDataUrl(file)
    upsertDigitalSignature({
      ownerId: profil.id,
      ownerName: [profil.prenom, profil.nom].filter(Boolean).join(' ') || profil.role,
      role: profil.role,
      signatureText: signatureText.trim() || [profil.prenom, profil.nom].filter(Boolean).join(' ') || profil.role,
      signatureImageUrl,
      isActive: signature?.isActive ?? true,
      updatedAt: new Date().toISOString(),
    })
    setNotice('Image de signature mise a jour.')
    setError(null)
    event.target.value = ''
  }

  function saveCompanyName(value: string) {
    const next = updateCompanySettings({ companyName: value })
    setCompany(next)
    setNotice('Nom entreprise mis a jour.')
    setError(null)
  }

  function saveCompanyText(field: 'rgpdCharter' | 'internalRules', value: string) {
    const next = updateCompanySettings({ [field]: value } as Pick<typeof company, typeof field>)
    setCompany(next)
    setNotice(field === 'rgpdCharter' ? 'Charte RGPD mise a jour.' : 'Reglement entreprise mis a jour.')
    setError(null)
  }

  function saveCompanyPayrollSetting(field: 'payrollValidationDeadlineDay' | 'payrollVaultReleaseDay' | 'payrollPaymentDay', value: string) {
    const parsed = Math.min(31, Math.max(1, Number.parseInt(value || '0', 10) || 1))
    const next = updateCompanySettings({ [field]: parsed } as Pick<typeof company, typeof field>)
    setCompany(next)
    setNotice(
      field === 'payrollValidationDeadlineDay'
        ? 'Date butee de validation paie mise a jour.'
        : field === 'payrollVaultReleaseDay'
          ? 'Date de publication coffre paie mise a jour.'
          : 'Date de versement paie mise a jour.',
    )
    setError(null)
  }

  function saveSignature(active: boolean) {
    if (!profil) return
    upsertDigitalSignature({
      ownerId: profil.id,
      ownerName: [profil.prenom, profil.nom].filter(Boolean).join(' ') || profil.role,
      role: profil.role,
      signatureText: signatureText.trim() || [profil.prenom, profil.nom].filter(Boolean).join(' ') || profil.role,
      signatureImageUrl: signature?.signatureImageUrl ?? null,
      isActive: active,
      updatedAt: new Date().toISOString(),
    })
    setNotice(active ? 'Signature numerique activee.' : 'Signature numerique desactivee.')
    setError(null)
  }

  const MENU: MenuItem[] = [
    { id: 'compte',       label: 'Mon compte',       icon: <IconCompte /> },
    { id: 'entreprise',   label: 'Entreprise',        icon: <IconEntreprise /> },
    { id: 'signature',    label: 'Signature',         icon: <IconSignature /> },
    { id: 'rgpd',         label: 'RGPD & Reglement',  icon: <IconRGPD /> },
    { id: 'utilisateurs', label: 'Utilisateurs',      icon: <IconUtilisateurs />, adminOnly: true },
    { id: 'clients-erp',  label: 'Clients ERP',       icon: <IconEntreprise />, adminOnly: true },
    { id: 'aide',         label: 'Aide',              icon: <IconAide /> },
    { id: 'developpement', label: 'Developpement',     icon: <IconModules /> },
    { id: 'groupes-conducteurs', label: 'Groupes conducteurs', icon: <IconUtilisateurs /> },
    ...(isCompanyManager ? [{ id: 'modules' as MenuId, label: 'Modules ERP', icon: <IconModules /> }] : []),
    ...(isAdmin ? [{ id: 'observabilite' as MenuId, label: 'Observabilite', icon: <IconEye /> }] : []),
  ]

  return (
    <div className="flex gap-0 h-full min-h-[calc(100vh-140px)]" style={{ background: 'var(--bg)' }}>

      {/* ── Sidebar menu ─────────────────────────────────────────────────── */}
      <aside className="w-52 shrink-0 rounded-2xl border mr-4 overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="px-4 pt-5 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] nx-muted">Reglages</p>
        </div>

        {/* Session badge */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[10px] nx-muted mb-1">Session active</p>
          <p className="text-sm font-semibold">{modeLabel}</p>
          {isDemoSession && (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--primary)' }}>Mode demo</p>
          )}
          {isAdmin && sessionRole && (
            <p className="mt-1 text-[11px] text-amber-500">Simulation admin</p>
          )}
        </div>

        <nav className="p-2 space-y-0.5">
          {MENU.map(item => {
            if (item.id === 'clients-erp' && !canManageErpClients) return null
            if (item.adminOnly && !isAdmin) return null
            if (item.roleRequired && !canAccess(role, item.roleRequired, tenantAllowedPages)) return null
            const active = activeMenu === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setActiveMenu(item.id); setNotice(null); setError(null) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                  active
                    ? 'text-white'
                    : 'nx-subtle hover:bg-[color:var(--primary-soft)]'
                }`}
                style={active ? { background: 'var(--primary)' } : {}}
              >
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ── Contenu ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {(notice || error) && (
          <div
            className="mb-4 rounded-2xl border px-4 py-3 text-sm"
            style={{
              borderColor: error ? 'rgba(244,114,182,0.25)' : 'rgba(56,189,248,0.25)',
              background: error ? 'rgba(127,29,29,0.18)' : 'rgba(8,47,73,0.25)',
              color: error ? '#fecdd3' : '#bae6fd',
            }}
          >
            {error ?? notice}
          </div>
        )}

        <div className="mb-4 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs nx-muted">Version deploiement</p>
              <p className="text-sm font-semibold">{DEPLOYED_VERSION}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveMenu('developpement')
                setDevTab('versions')
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Voir l historique des versions dans l ERP
            </button>
          </div>
        </div>

        {/* ─ Compte ─────────────────────────────────────────────────────── */}
        {activeMenu === 'compte' && (
          <div className="space-y-4">
            <SectionHeader title="Mon compte" subtitle="Informations de session et de profil" />
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardLabel>Session active</CardLabel>
                <div className="mt-3 space-y-2 text-sm">
                  <Row label="Mode">{modeLabel}</Row>
                  <Row label="Profil attribue">{assignedLabel}</Row>
                  {isDemoSession && <Row label="Compte source">{accountLabel}</Row>}
                  {isAdmin && sessionRole && (
                    <p className="text-amber-500 text-xs mt-2">
                      {isDemoSession ? 'Mode profil demo actif' : 'Mode simulation admin actif'}
                    </p>
                  )}
                </div>
              </Card>
              <Card>
                <CardLabel>Informations personnelles</CardLabel>
                <div className="mt-3 space-y-2 text-sm">
                  {profil?.prenom && <Row label="Prenom">{profil.prenom}</Row>}
                  {profil?.nom && <Row label="Nom">{profil.nom}</Row>}
                  {profil?.role && <Row label="Role attribue">{ROLE_LABELS[profil.role] ?? profil.role}</Row>}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ─ Entreprise ─────────────────────────────────────────────────── */}
        {activeMenu === 'entreprise' && (
          <div className="space-y-4">
            <SectionHeader title="Entreprise" subtitle="Branding PDF et informations officielles" />
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardLabel>Branding PDF</CardLabel>
                  <p className="mt-1 text-sm nx-subtle">Le nom et logo seront affiches sur les documents PDF generes.</p>
                </div>
                {company.logoDataUrl && (
                  <img src={company.logoDataUrl} alt="Logo entreprise" className="h-16 rounded-xl border object-contain p-2" style={{ borderColor: 'var(--border)' }} />
                )}
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Nom entreprise">
                  <input
                    className={inp}
                    value={company.companyName}
                    onChange={event => setCompany(current => ({ ...current, companyName: event.target.value }))}
                    onBlur={event => saveCompanyName(event.target.value.trim() || DEFAULT_COMPANY_NAME)}
                    disabled={!isCompanyManager}
                  />
                </Field>
                <Field label="Logo entreprise">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => logoInputRef.current?.click()} disabled={!isCompanyManager} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                      Televerser
                    </button>
                    <span className="text-xs nx-subtle">{company.logoFileName ?? 'Aucun logo charge'}</span>
                    <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => void handleLogoFile(event)} />
                  </div>
                </Field>
              </div>
            </Card>
            <Card>
              <CardLabel>Calendrier paie</CardLabel>
              <p className="mt-2 text-sm nx-subtle">Reglez la date butee de validation, la publication a minuit dans le coffre numerique et la date commune de versement des salaires.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Field label="Date butee validation (jour du mois)">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className={inp}
                    value={company.payrollValidationDeadlineDay}
                    onChange={event => setCompany(current => ({ ...current, payrollValidationDeadlineDay: Number.parseInt(event.target.value || '1', 10) || 1 }))}
                    onBlur={event => saveCompanyPayrollSetting('payrollValidationDeadlineDay', event.target.value)}
                    disabled={!isCompanyManager}
                  />
                </Field>
                <Field label="Publication coffre a minuit (jour du mois suivant)">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className={inp}
                    value={company.payrollVaultReleaseDay}
                    onChange={event => setCompany(current => ({ ...current, payrollVaultReleaseDay: Number.parseInt(event.target.value || '1', 10) || 1 }))}
                    onBlur={event => saveCompanyPayrollSetting('payrollVaultReleaseDay', event.target.value)}
                    disabled={!isCompanyManager}
                  />
                </Field>
                <Field label="Versement salaires (jour du mois suivant)">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className={inp}
                    value={company.payrollPaymentDay}
                    onChange={event => setCompany(current => ({ ...current, payrollPaymentDay: Number.parseInt(event.target.value || '1', 10) || 1 }))}
                    onBlur={event => saveCompanyPayrollSetting('payrollPaymentDay', event.target.value)}
                    disabled={!isCompanyManager}
                  />
                </Field>
              </div>
              <div className="mt-4 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface-alt, var(--bg))' }}>
                Les bulletins restent masques dans le coffre collaborateur jusqu a validation complete de la periode, puis deviennent visibles a 00:00 a la date reglee. Le versement est planifie pour tous les salaries a la meme date commune.
              </div>
            </Card>
            {canAccess(role, 'rh', tenantAllowedPages) && (
              <Card>
                <CardLabel>Gestion RH</CardLabel>
                <p className="mt-2 text-sm nx-subtle">Les contrats, onboarding et suivi RH sont dans l onglet dedie.</p>
                <div className="mt-4">
                  <Link to="/rh" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">Ouvrir RH</Link>
                </div>
              </Card>
            )}
            <ServicesOverviewCard companyId={companyId} />
          </div>
        )}

        {/* ─ Signature ─────────────────────────────────────────────────── */}
        {activeMenu === 'signature' && (
          <div className="space-y-4">
            <SectionHeader title="Signature numerique" subtitle="Activez votre signature pour signer les PDF internes" />
            <Card>
              <div className="space-y-4">
                <Field label="Texte de signature">
                  <input className={inp} value={signatureText} onChange={event => setSignatureText(event.target.value)} placeholder="Nom Prenom" />
                </Field>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => saveSignature(true)} className="rounded-xl px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--primary)' }}>
                    Activer
                  </button>
                  <button type="button" onClick={() => saveSignature(false)} className="rounded-xl border px-4 py-2 text-sm font-medium" style={{ borderColor: 'var(--border)' }}>
                    Desactiver
                  </button>
                  <button type="button" onClick={() => signatureInputRef.current?.click()} className="rounded-xl border px-4 py-2 text-sm font-medium" style={{ borderColor: 'var(--border)' }}>
                    Importer image
                  </button>
                  <input ref={signatureInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => void handleSignatureFile(event)} />
                </div>
                <div className="rounded-2xl border border-dashed px-4 py-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-alt, var(--bg))' }}>
                  <p className="text-xs uppercase tracking-[0.18em] nx-muted">Apercu</p>
                  <p className="mt-2 text-lg italic">{signatureText || 'Votre signature apparaitra ici'}</p>
                  <p className="mt-2 text-xs nx-subtle">{signature?.isActive ? 'Signature active' : 'Signature inactive'}</p>
                  {signature?.signatureImageUrl && <img src={signature.signatureImageUrl} alt="Signature" className="mt-3 h-14 object-contain" />}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ─ RGPD ──────────────────────────────────────────────────────── */}
        {activeMenu === 'rgpd' && (
          <div className="space-y-4">
            <SectionHeader title="RGPD & Reglement" subtitle="Charte RGPD et reglement interne de l entreprise" />
            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardLabel>Charte RGPD</CardLabel>
                <textarea
                  className={`${inp} mt-4 min-h-[280px] resize-none`}
                  value={company.rgpdCharter}
                  onChange={event => setCompany(current => ({ ...current, rgpdCharter: event.target.value }))}
                  onBlur={event => saveCompanyText('rgpdCharter', event.target.value)}
                  disabled={!isCompanyManager}
                />
              </Card>
              <Card>
                <CardLabel>Reglement interne</CardLabel>
                <textarea
                  className={`${inp} mt-4 min-h-[280px] resize-none`}
                  value={company.internalRules}
                  onChange={event => setCompany(current => ({ ...current, internalRules: event.target.value }))}
                  onBlur={event => saveCompanyText('internalRules', event.target.value)}
                  disabled={!isCompanyManager}
                />
              </Card>
            </div>
            <div className="flex">
              <Link to="/mentions-legales" className="text-sm nx-subtle hover:underline">
                Consulter les mentions legales →
              </Link>
            </div>
          </div>
        )}

        {/* ─ Utilisateurs ──────────────────────────────────────────────── */}
        {activeMenu === 'utilisateurs' && (
          <div className="space-y-4">
            <SectionHeader title="Utilisateurs & droits" subtitle="Creer des comptes et attribuer les roles d acces" />
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <CardLabel>Gestion des comptes</CardLabel>
                  <p className="mt-1 text-sm nx-subtle">Ajouter des utilisateurs, modifier leurs roles et droits d acces.</p>
                </div>
                <Link to="/utilisateurs" className="shrink-0 rounded-xl px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--primary)' }}>
                  Ouvrir Utilisateurs
                </Link>
              </div>
            </Card>
          </div>
        )}

        {activeMenu === 'clients-erp' && canManageErpClients && (
          <div className="space-y-4">
            <SectionHeader title="Clients ERP" subtitle="Administrer chaque client ERP, ses fonctionnalites et ses employes" />
            <ErpClientsSettings />
          </div>
        )}

        {activeMenu === 'groupes-conducteurs' && (
          <div className="space-y-4">
            <SectionHeader
              title="Groupes de conducteurs"
              subtitle="Organisez les conducteurs par equipe ou zone. Chaque exploitant ne voit que son groupe sur le planning. L'IA de placement respecte ces perimetres."
            />
            <DriverGroupsSettings />
          </div>
        )}

        {/* ─ Aide ──────────────────────────────────────────────────────── */}
        {activeMenu === 'aide' && (
          <div className="space-y-4">
            <SectionHeader title="Aide & tutoriels" subtitle="Guides d utilisation selon vos droits d acces" />
            <TutorialList role={role} tenantAllowedPages={tenantAllowedPages} />
          </div>
        )}

        {activeMenu === 'developpement' && (
          <div className="space-y-4">
            <SectionHeader title="Developpement" subtitle="Cartographie des fonctionnalites selon leur statut" />
            <DevelopmentOverview devTab={devTab} setDevTab={setDevTab} />
          </div>
        )}

        {/* ─ Modules ERP ───────────────────────────────────────────────── */}
        {activeMenu === 'modules' && isCompanyManager && (
          <div className="space-y-4">
            <SectionHeader title="Modules ERP" subtitle="Configuration des modules et fournisseurs de services" />
            <ErpV11Settings />
            <OllamaChat />
          </div>
        )}

        {/* ─ Observabilite ──────────────────────────────────────────── */}
        {activeMenu === 'observabilite' && isAdmin && (
          <div className="space-y-4">
            <SectionHeader title="Observabilite" subtitle="Erreurs applicatives, journaux API et traces" />
            <ObservabilitePanel />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Composants utilitaires ────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="pb-2 border-b mb-2" style={{ borderColor: 'var(--border)' }}>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm nx-subtle">{subtitle}</p>
    </div>
  )
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      {children}
    </div>
  )
}

function CardLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.22em] nx-muted">{children}</p>
}

function DevelopmentOverview({
  devTab,
  setDevTab,
}: {
  devTab: 'developpe' | 'en-cours' | 'features' | 'versions'
  setDevTab: (tab: 'developpe' | 'en-cours' | 'features' | 'versions') => void
}) {
  const active = devTab === 'versions' ? null : DEVELOPMENT_TAB_CONTENT[devTab]

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] nx-muted">Pilotage produit</p>
            <h3 className="mt-2 text-2xl font-semibold text-[color:var(--text)]">Développement ERP</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--text-muted,#475569)]">
              Les fonctionnalités sont regroupées par statut et par domaine, avec la même logique de cartes et de surfaces que le reste de l ERP. Les onglets permettent de suivre le développé, les chantiers actifs, la roadmap et les versions.
            </p>
          </div>
          <div className="rounded-full border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border)', background: 'var(--surface-soft)', color: 'var(--text)' }}>
            {developedCatalogFeatures.length + inProgressCatalogFeatures.length + upcomingCatalogFeatures.length} entrées produit
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {DEV_HIGHLIGHTS.map(item => (
            <div key={item.label} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] nx-muted">{item.label}</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-2xl font-semibold text-[color:var(--text)]">{item.value}</p>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.accent }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2 rounded-2xl border p-2" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        {([
          ['developpe', 'Développé'],
          ['en-cours', 'En cours de développement'],
          ['features', 'Features'],
          ['versions', 'Versions'],
        ] as const).map(([id, label]) => {
          const isActive = devTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setDevTab(id)}
              className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
              style={isActive
                ? {
                    borderColor: 'var(--primary)',
                    background: 'color-mix(in srgb, var(--primary-soft) 78%, var(--surface))',
                    color: 'var(--text)',
                  }
                : {
                    borderColor: 'var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--muted)',
                  }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {devTab === 'versions' ? (
        <DevelopmentVersionsSection />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
          <DevelopmentFeatureSection tab={active!} />
          <DevelopmentSideCards devTab={devTab} />
        </div>
      )}
    </div>
  )
}

function DevelopmentFeatureSection({
  tab,
}: {
  tab: (typeof DEVELOPMENT_TAB_CONTENT)['developpe']
}) {
  const byCategory = tab.items.reduce<Map<string, CatalogFeature[]>>((acc, item) => {
    const key = item.categorie || 'Autres'
    const list = acc.get(key) ?? []
    list.push(item)
    acc.set(key, list)
    return acc
  }, new Map())

  const categories = Array.from(byCategory.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'fr'))

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: tab.accent }}>{tab.eyebrow}</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">{tab.title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">{tab.description}</p>
        </div>
        <div className="rounded-full px-4 py-2 text-sm font-semibold" style={{ background: tab.badgeBg, color: tab.accent }}>
          {tab.items.length} fonctionnalités
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {categories.map(([category, items]) => (
          <div key={category} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--surface) 88%, white)' }}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: tab.accent }}>{category}</p>
              <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-slate-800" style={{ background: 'rgba(148,163,184,0.18)' }}>{items.length}</span>
            </div>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-700">
              {items.map(item => (
                <li key={`${category}-${item.fonctionnalite}`} className="rounded-xl border border-slate-300/90 bg-white px-3 py-2.5">
                  <p className="font-medium text-slate-900">{item.fonctionnalite}</p>
                  {item.description && <p className="mt-1 text-xs leading-5 text-slate-700">{item.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  )
}

function DevelopmentSideCards({ devTab }: { devTab: 'developpe' | 'en-cours' | 'features' | 'versions' }) {
  if (devTab === 'developpe') {
    return (
      <div className="space-y-4">
        <DevelopmentBulletCard
          title="Lecture ERP"
          subtitle="Même logique visuelle que le site, mais pensée pour l usage interne."
          items={[
            'Les fonctionnalités proviennent maintenant d un catalogue partagé avec le site internet.',
            'La lecture se fait par statut puis par domaine, sans inventaire monolithique.',
            'Les cartes ERP complémentaires restent séparées pour suivre les écarts techniques.',
          ]}
        />
        <DevelopmentBulletCard
          title="Repères rapides"
          subtitle="Les blocs déjà opérationnels les plus structurants."
          items={[
            'Planning transport, exploitation OT, flotte et conformité.',
            'Facturation, analytique transport, trésorerie et comptabilité v1.',
            'Portails, communication, CRM, observabilité et sécurité tenant.',
          ]}
        />
      </div>
    )
  }

  const cards = devTab === 'en-cours' ? ERP_IN_PROGRESS_CARDS : ERP_FEATURE_CARDS

  return (
    <div className="space-y-4">
      {cards.map(card => (
        <DevelopmentBulletCard key={card.title} title={card.title} subtitle={card.subtitle} items={card.items} />
      ))}
    </div>
  )
}

function DevelopmentVersionsSection() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-900">Versions</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">Historique des releases interne ERP</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
              Cette vue reste strictement métier: elle indique les ajouts, modifications, rectifications et suppressions, sans exposer de détails techniques de conception.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800">
            {releaseNotes.length} versions
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {releaseNotes.map(note => (
            <article key={note.version} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--surface) 90%, white)' }}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ background: note.version === APP_VERSION ? '#DBEAFE' : '#F1F5F9', color: note.version === APP_VERSION ? '#1D4ED8' : '#475569' }}>
                  {note.version === APP_VERSION ? 'Version en ligne' : 'Release'}
                </span>
                <span className="text-sm text-slate-700">{note.date}</span>
              </div>
              <h4 className="mt-3 text-lg font-semibold text-slate-900">Version {note.version}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-700">Communication métier synthétique sans détail d implémentation.</p>

              <div className="mt-4 grid gap-3 lg:grid-cols-4">
                <DevelopmentVersionMetric title="Ajouts" count={note.additions.length} accent="#2563EB" description="Nouvelles capacités métier livrées." />
                <DevelopmentVersionMetric title="Modifications" count={note.modifications.length} accent="#0F766E" description="Parcours ou règles métier améliorés." />
                <DevelopmentVersionMetric title="Rectifications" count={note.fixes.length} accent="#DC2626" description="Anomalies ou écarts corrigés." />
                <DevelopmentVersionMetric title="Suppressions" count={countSuppressions(note)} accent="#7C2D12" description="Éléments retirés ou décommissionnés." />
              </div>
            </article>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <DevelopmentBulletCard
          title="Version actuelle"
          subtitle="Repère rapide sur la release active dans le build courant."
          items={[
            `Version déployée : ${APP_VERSION}`,
            'Le numéro suit automatiquement le build courant.',
            'Le journal interne conserve une communication métier non technique.',
          ]}
        />
        <DevelopmentBulletCard
          title="Mise à jour future"
          subtitle="Règles de communication pour les prochaines releases."
          items={[
            'Chaque version doit communiquer les catégories: ajouts, modifications, rectifications, suppressions.',
            'Ne pas publier de détails de conception ou de mise en oeuvre dans ce panneau.',
            'Maintenir une formulation orientée bénéfice métier et usage opérationnel.',
          ]}
        />
      </div>
    </div>
  )
}

function countSuppressions(note: ReleaseNote) {
  const suppressionPattern = /suppression|supprim|retir|decommission|désactiv|desactiv/i
  return [...note.additions, ...note.modifications, ...note.fixes].reduce((count, item) => {
    return count + (suppressionPattern.test(item) ? 1 : 0)
  }, 0)
}

function DevelopmentVersionMetric({
  title,
  count,
  accent,
  description,
}: {
  title: string
  count: number
  accent: string
  description: string
}) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(148,163,184,0.18)', background: 'rgba(255,255,255,0.8)' }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>{title}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{count}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
    </div>
  )
}

function DevelopmentBulletCard({
  title,
  subtitle,
  items,
}: {
  title: string
  subtitle: string
  items: readonly string[]
}) {
  return (
    <Card>
      <CardLabel>{title}</CardLabel>
      <p className="mt-2 text-sm leading-6 text-slate-700">{subtitle}</p>
      <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
        {items.map(item => (
          <li key={item} className="rounded-xl border border-slate-300/90 bg-white px-3 py-2.5 leading-6">
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="nx-subtle text-xs">{label}</span>
      <span className="font-medium text-sm">{children}</span>
    </div>
  )
}

const TUTORIALS = [
  {
    id: 'planning', page: 'planning',
    title: 'Suivre une journee conducteur',
    summary: 'Ouvrir le planning, verifier les missions puis basculer vers Tachygraphe ou PV si besoin.',
    steps: ['Ouvrir Planning', 'Filtrer par conducteur', 'Cliquer la mission pour verifier les details', 'Enchainer vers Tachygraphe ou PV & Amendes'],
  },
  {
    id: 'tchat', page: 'tchat',
    title: 'Envoyer un message ou un document',
    summary: 'La messagerie interne permet envoi groupe, pieces jointes et sauvegarde au coffre.',
    steps: ['Ouvrir Messagerie', 'Choisir une conversation ou un groupe', 'Ajouter photo ou document', 'Enregistrer dans le coffre si besoin'],
  },
  {
    id: 'mail', page: 'mail',
    title: 'Ne pas oublier ses mails',
    summary: 'Le module Mail reste separe de la messagerie interne.',
    steps: ['Ouvrir Mail', 'Traiter les non lus', 'Ouvrir une piece jointe', 'Sauvegarder au coffre si necessaire'],
  },
  {
    id: 'coffre', page: 'coffre',
    title: 'Retrouver ses documents personnels',
    summary: 'Le coffre centralise les pieces jointes et documents collaborateur.',
    steps: ['Ouvrir Coffre', 'Lire la section Dossier collaborateur', 'Signer les documents si signature active', 'Telecharger le PDF si necessaire'],
  },
  {
    id: 'amendes', page: 'amendes',
    title: 'Traiter une amende recue',
    summary: 'Importer le PDF, verifier le rapprochement vehicule/conducteur puis notifier.',
    steps: ['Ouvrir PV & Amendes', 'Importer le PDF', 'Verifier le conducteur detecte', 'Archiver et notifier'],
  },
]

function TutorialList({ role, tenantAllowedPages }: { role: ReturnType<typeof useAuth>['role']; tenantAllowedPages: string[] | null }) {
  const tutorials = TUTORIALS.filter(t => canAccess(role, t.page, tenantAllowedPages))
  if (tutorials.length === 0) {
    return <p className="text-sm nx-subtle">Aucun tutoriel disponible pour votre acces.</p>
  }
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {tutorials.map(tutorial => (
        <div key={tutorial.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">{tutorial.title}</p>
              <p className="mt-1 text-sm nx-subtle">{tutorial.summary}</p>
            </div>
            <span className="shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] nx-muted" style={{ borderColor: 'var(--border)' }}>
              {tutorial.page}
            </span>
          </div>
          <ol className="mt-4 space-y-2 text-sm nx-subtle">
            {tutorial.steps.map((step, i) => (
              <li key={step} className="flex items-start gap-2">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}
