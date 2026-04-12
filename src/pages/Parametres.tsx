import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { canAccess, ROLE_LABELS, useAuth } from '@/lib/auth'
import { DEFAULT_COMPANY_NAME, readCompanySettings, subscribeCompanySettings, updateCompanySettings } from '@/lib/companySettings'
import { getDigitalSignature, subscribeDigitalSignatures, upsertDigitalSignature } from '@/lib/signatureStore'
import { ErpV11Settings } from '@/components/settings/ErpV11Settings'
import OllamaChat from '@/components/OllamaChat'
import { ErpClientsSettings } from '@/components/settings/ErpClientsSettings'
import { DriverGroupsSettings } from '@/components/settings/DriverGroupsSettings'
import { ObservabilitePanel } from '@/components/settings/ObservabilitePanel'
import { ServicesOverviewCard } from '@/domains/services/components/ServicesOverviewCard'

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
const DEPLOYED_VERSION = import.meta.env.VITE_APP_VERSION ?? '1.12.6'

export default function Parametres() {
  const { role, sessionRole, isAdmin, isDemoSession, profil, accountProfil, tenantAllowedPages, companyId } = useAuth()
  const location = useLocation()
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const signatureInputRef = useRef<HTMLInputElement | null>(null)

  const [company, setCompany] = useState(readCompanySettings())
  const [signature, setSignature] = useState(profil ? getDigitalSignature(profil.id) : null)
  const [signatureText, setSignatureText] = useState('')
  const [devTab, setDevTab] = useState<'developpe'|'en-cours'|'features'>('features')
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
          <p className="text-xs nx-muted">Version deploiement</p>
          <p className="text-sm font-semibold">{DEPLOYED_VERSION}</p>
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDevTab('developpe')}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium ${devTab === 'developpe' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
              >
                Developpe
              </button>
              <button
                type="button"
                onClick={() => setDevTab('en-cours')}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium ${devTab === 'en-cours' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
              >
                En cours de developpement
              </button>
              <button
                type="button"
                onClick={() => setDevTab('features')}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium ${devTab === 'features' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
              >
                Features
              </button>
            </div>

            {devTab === 'developpe' && (
              <Card>
                <CardLabel>Statut OK DEV</CardLabel>
                <ul className="mt-3 list-disc pl-5 text-sm space-y-2">
                  <li>Dashboard (widgets role et personnalisation)</li>
                  <li>Tasks (CRUD, tri et filtres)</li>
                  <li>Transports (OT, statuts transport, affretement, reference auto, sites logistiques, historique)</li>
                  <li>Planning (cockpit exploitation ABC: vues jour/semaine, drag-and-drop, dock operations, urgences priorisees et retraction locale du bandeau haut)</li>
                  <li>Feuille de route</li>
                  <li>Map live (simulation GPS coherente avec statuts, lecture ponctualite et bascule points / itineraires)</li>
                  <li>Inter-ERP (connectivite, discussion et espace dedie)</li>
                  <li>Chauffeurs</li>
                  <li>Remorques</li>
                  <li>Maintenance (index constructeur RMI, auto-remontee des periodicites, alertes km/temps et vue mecanicien par vehicule, assignation mecanicien et priorites)</li>
                  <li>Entretiens RH (CRUD Supabase complet, evaluations, suivi professionnel, alertes planification)</li>
                  <li>Comptabilite lot A (socle SQL, journaux, ecritures, TVA, FEC et page dediee)</li>
                  <li>Acces demo et onboarding public (formulaire, demandes d acces et comptes de test)</li>
                  <li>Limitation du nombre d ecrans par utilisateur avec blocage de connexion au dela du quota</li>
                  <li>Clients ERP multi-tenant (creation client ERP, ecrans max, pages autorisees, rattachement des employes)</li>
                  <li>Connexion durcie face aux pannes du controle d ecrans (blocage reserve aux vrais depassements de quota)</li>
                  <li>Navigation rapide Ctrl+K (recherche modules instantanee, navigation clavier, raccourci global)</li>
                  <li>Demandes clients (workflow de validation)</li>
                  <li>Login / Auth / roles (roles etendus, session admin, profils, restrictions de pages par client ERP)</li>
                  <li>Parametres (menus par role, entreprise, juridique, aide, modules, developpement)</li>
                  <li>Site vitrine public (accueil, solution, planning intelligent, ROI, secteur transport, a propos, demonstration, contact, SEO ERP et galerie de captures produit avec zoom)</li>
                  <li>SEO technique du site public (meta, canonicals, sitemap, robots et FAQ structuree)</li>
                  <li>SEO contenu et structure accueil (Hn logiques, contenu metier et optimisation images hero WebP)</li>
                  <li>Base editoriale SEO et maillage interne (pages ERP/logiciel + 8 articles metier publies, navigation Blog dans le site public)</li>
                  <li>SEO multi-entree site public (6 pages positionnement : ERP, TMS, gestion flotte, telematique, chronotachygraphe, IA transport + maillage interne complet + bouton SEO footer)</li>
                  <li>Refonte SEO technique complete : titles optimises (suppr. doublons NEXORA Truck), H1 visible HomePage, H2/H3 corriges, meta descriptions metier, keywords etendus sur 15 pages</li>
                  <li>Lien reseaux sociaux : page Facebook officielle NEXORA Truck dans le footer site public</li>
                  <li>Parcours legal public (mentions legales, politique de confidentialite, CGU, bandeau cookies et reouverture des preferences)</li>
                  <li>Qualite front release (warnings ESLint resolus, socle PWA installable avec manifest/service worker et optimisations de chargement initial)</li>
                  <li>Durcissement securite backend (separation stricte client authentifie RLS et client systeme service role par endpoint)</li>
                  <li>Normalisation de marque NEXORA Truck sur l ERP et le site public</li>
                  <li>Google Analytics 4 (ID G-4QQVY1DQT2, script head index.html)</li>
                  <li>Gestion multi-tenant (page Reglages tenant, RLS SECURITY DEFINER non-recursive sur profils et companies, fonctions my_company_id / my_login_enabled)</li>
                  <li>Profils applicatifs garantis a la connexion (matricule DEFAULT, upsert corrige, bootstrap RequireAuth)</li>
                  <li>Optimisation SEO contenu et structure 6 pages (suppression sr-only cloaking HomePage et FeaturesPage, H2 imbriques corriges en H3 sur TMS et Flotte, meta titles et descriptions recalibers &lt;60/160 chars, H1 differencies par intention, contenu TMS / Flotte / ERP reecrit avec vocabulaire transport metier concret)</li>
                  <li>Approfondissement SEO contenu maximal (H1 + problems + solutionPillars + keyFeatures recrits sur IA, Telematique, Chronotachygraphe, TMS, Flotte, ERP routier, ERP transport, Logiciel transport ; scenarios avant/apres concrets par page ; maillage interne systematique ; sections Cas d usage ajoutees — v1.10.13)</li>
                  <li>Multi-site logistique : page Entrepots et Depots, section Logistique dans le menu, GPS map picker, sites filtres par tenant (v1.10.12)</li>
                  <li>Relais transport : onglet dedie, assignation conducteur/vehicule/remorque, statuts et historique (v1.10.12)</li>
                  <li>Role Logisticien : acces entrepots, transports, planning, map-live ; droits RLS et fonctions Netlify ; simulateur metier (v1.10.12)</li>
                  <li>Groupes de conducteurs : isolation planning par exploitant, UI Reglages, RLS et endpoint Netlify (v1.10.14)</li>
                  <li>IA placement retour en charge : moteur interne, config provider Ollama/Anthropic, endpoint Netlify dedie (v1.10.14)</li>
                  <li>Multi-tenant phase 1-3 : companies, permissions, super admin, isolation RLS complete ; Super Admin et Tenant Admin (v1.10.14)</li>
                  <li>SEO site 3 nouvelles pages : Telematique Transport, Chronotachygraphe, IA Transport — maillage inter-metier complet (v1.10.14)</li>
                  <li>SEO Bloc F : 2 nouvelles pages positionnement (Facturation Transport, Affretement Transport) + 5 articles metier supplementaires ; footer enrichi (v1.10.15)</li>
                  <li>SEO Bloc G : balises OG image individuelles sur 10 pages du site public (v1.10.15)</li>
                  <li>Accessibilite site public : variables CSS WCAG AA (text-secondary et text-discreet), suppression gradient SiteSection, couleurs footer corrigees (v1.10.15)</li>
                  <li>Audit SEO et corrections techniques v1.10.17 : GTM conditionnel au consentement RGPD (AnalyticsLoader), og:image:width/height sur toutes les pages, og:image:alt personnalisable par page, schemas AggregateRating et VideoObject sur la HomePage, logo Organization mis a jour vers PNG 192px avec ImageObject complet et sameAs reseaux sociaux, suppression directive Host: non standard dans robots.txt (v1.10.17)</li>
                  <li>Lisibilite heroes v1.10.18 : overlay sombre rgba(0,0,0,0.45) + textes en blanc (#FFFFFF, rgba(255,255,255,0.8), rgba(255,255,255,0.7)) sur 11 pages heroiques ; liens hero passes en bleu clair #93C5FD sur fond sombre (v1.10.18)</li>
                  <li>Design system ERP anti-fatigue visuelle v1.10.19 : refonte variables CSS (mode clair/sombre/nocturne WCAG AA), typographie Inter + hierarchie KPI lisible, mode nocturne night cycle toggle 3 etats, blocs planning lisibilite, boutons disabled WCAG, scrollbar fine (v1.10.19)</li>
                  <li>Correctif securite RLS Supabase v1.10.19 : activation Row Level Security sur 4 tables publiques sans protection (erp_v11_tenants, permissions, platform_admins, role_permissions) avec policies strictes (is_platform_admin) (v1.10.19)</li>
                  <li>Acces demo Magic Link v1.10.20 : remplacement du formulaire multi-champs par un acces instantane 1 email sur la page Login ; function Netlify demo-magic-link avec rate limiting IP, upsert profil demo, generation lien unique Supabase sans mot de passe expose (v1.10.20)</li>
                  <li>Presentation ERP TMS en PDF sur le site public : page /presentation avec visionneuse integree et telechargement direct (v1.10.21)</li>
                  <li>Refactoring complet systeme auth v1.10.22 : suppression screen limit mort, correction securite ?? null (plus de role admin par defaut sur echec profil), exports unifies RESERVED_ADMIN_EMAIL_ROLE / normalizeRole / fallbackRoleFromEmail, isDemoSession derive du role reel, simplification signIn/signOut, nettoyage dupliques RequireAuth / SessionPicker / Login / DemoAccess (v1.10.22)</li>
                  <li>Fix deconnexion v1.10.22 : scope local immediat (logout sans appel reseau), reset profilLoading dans signOut, protection race condition TOKEN_REFRESHED, fix dropdown portal (mousedown stopPropagation) (v1.10.22)</li>
                  <li>Connexion Google OAuth v1.10.22 : signInWithOAuth provider google, redirectTo /login, loader visuel, bootstrap profil automatique pour nouveaux utilisateurs Google (v1.10.22)</li>
                  <li>CRM Prospection complet v1.11.0 : pipeline Kanban multi-etapes, contacts, devis avec auto-pricing, relances schedulees, dashboard pipeline commercial (v1.11.0)</li>
                  <li>War Room Imprevu v1.11.0 : suivi temps reel des imprévus operationnels (panne, retard, absence), liaison OT/vehicule/conducteur, escalade par priorite, realtime Supabase (v1.11.0)</li>
                  <li>Analytique Transport v1.11.0 : marge par mission, cout/km, vues synthese/missions/clients/flotte, saisie couts directs par OT (v1.11.0)</li>
                  <li>Reglements clients v1.11.0 : module dedie suivi reglements, statuts et historique (v1.11.0)</li>
                  <li>Tresorerie v1.11.0 : module tresorerie dedie (v1.11.0)</li>
                  <li>Paie transport MVP v1.11.0 : bulletins de paie, parametrage convention collective transport, calcul brut/net (v1.11.0)</li>
                  <li>Radar km a vide Planning v1.11.0 : badge taux de charge 30j par vehicule dans le Gantt, estimation km a vide, code couleur vert/orange/rouge (v1.11.0)</li>
                  <li>Badge statut maintenance Planning v1.11.0 : indicateurs MAINT et HS sur les lignes vehicule du Gantt (v1.11.0)</li>
                  <li>Page Integrations API v1.12.0 : repertoire complet des 9 intégrations (Webfleet #1, Samsara #2, Google Maps indispensable ; roadmap Geotab, Trans.eu, Timocom, HERE, OpenStreetMap, VDO), positionnement honnete PAR integration, lien depuis footer et page Telematique (v1.12.0)</li>
                  <li>Performance site public v1.12.0 : chargement polices Google Fonts non bloquant (media=print onload), preconnect fonts, suppression @import CSS render-blocking, Vite chunks separes pour homepage, reportCompressedSize desactive (v1.12.0)</li>
                  <li>Corrections audit UX v1.12.0 : 5 echecs contraste corriges (WCAG AA), 27 touch targets 44px (nav, boutons, icones sociales), animation box-shadow non composite supprimee, hauteur page reduite de plus de 5 600px, debordement largeur contenu corrige (v1.12.0)</li>
                  <li>Fix ancres liens API v1.12.1 : textes de liens uniques par API sur la page Integrations ("Documentation Webfleet", "Documentation Samsara"…) au lieu du texte generique "Documentation officielle" non discriminant pour les crawlers SEO (v1.12.1)</li>
                  <li>Corrections SEO/UX homepage v1.12.2 : titre raccourci a 44 chars (WCAG 49 max), 3 contrastes #6E6E73 → #4b4b51, barre social proof flexbox (plus de &amp;nbsp; overflow mobile), aria-label sur liens features et cartes blog, CLS produit screenshot (width/height/maxHeight), paddings sections reduits (sectionPy clamp(24,3vw,56px), blog clamp(28,3.5vw,56px), CTA clamp(40,5vw,80px)) (v1.12.2)</li>
                  <li>Observabilite erreurs applicatives : table app_error_logs, Error Boundary React, handlers window.onerror + unhandledrejection, logAppError Netlify, panel admin avec KPIs / filtres / stack traces / logs API providers et purge 30j (v1.12.3)</li>
                  <li>Activation/desactivation metiers (modules) par tenant : section Metiers actifs dans Clients ERP, cartes cliquables par metier, PATCH companies.enabled_modules via Netlify function (v1.12.3)</li>
                  <li>Absences RH v1.12.4 : table Supabase absences_rh + soldes CP/RTT, workflow demande/validation/refus, lib TypeScript CRUD complet, onglet Absences integre dans la page RH (v1.12.4)</li>
                  <li>Journal comptable manuel v1.12.4 : table compta_journal_manuel (OD), saisies persistees en base, RLS, integration dans la page Facturation (v1.12.4)</li>
                  <li>Tachygraphe donnees dynamiques v1.12.4 : seed idempotent 6 conducteurs avec donnees semaine courante et mois precedent, lookup dynamique conducteurs/vehicules existants (v1.12.4)</li>
                  <li>Tachygraphe Supabase complet v1.12.4 : compliance EU calculee depuis vraies entrees tachygraphe_entrees, infractions derivees en temps reel, generation et persistance rapports (rapports_conducteurs), alertes documents depuis dates conducteurs reelles (v1.12.4)</li>
                  <li>Clients ERP Supabase complet : fiche commerciale, conditions paiement, IBAN/BIC, contacts multiples, adresses, historique OT et factures par client — zero mock (v1.12.4)</li>
                  <li>Planning custom blocks Supabase v1.12.5 : lignes et blocs personnalises persistes en base, drag-and-drop inter-lignes, assignation OT aux blocs custom (v1.12.5)</li>
                  <li>Planning pauses intelligentes v1.12.5 : placement auto dans les creneaux libres (CE 561), materialisation en bloc editable au clic (v1.12.5)</li>
                  <li>Disponibilite RH planning v1.12.5 : bandes visuelles absence sur le Gantt, badge ABSENT, alerte et blocage d assignation sur conducteur absent, filtrage selects (v1.12.5)</li>
                  <li>Demande d absence conducteur v1.12.5 : onglet Mes absences dans le portail conducteur, formulaire de demande, soldes CP/RTT, liste et statuts (v1.12.5)</li>
                  <li>Workflow multi-etapes conges v1.12.6 : demande → validation exploitation → validation direction → integration paie → validation finale avec document PDF attestation de conge et circuit complet (v1.12.6)</li>
                  <li>Coffre-fort numerique salarie v1.12.7 : endpoints Netlify list/sign/process-exit, validation employee scope et script de tests fonctionnels/securite/charge (v1.12.7)</li>
                </ul>
              </Card>
            )}

            {devTab === 'en-cours' && (
              <div className="space-y-4">
                <Card>
                  <CardLabel>Statut PARTIEL — Supabase partiel ou logic incomplète</CardLabel>
                  <ul className="mt-3 list-disc pl-5 text-sm space-y-2">
                    <li>Facturation (CRUD factures, tarifs, CNR, journal manuel et relances en Supabase ; manque lignes multi-article par facture, generation auto depuis OT et export comptable integre)</li>
                    <li>Paie (calcul brut/net URSSAF 2026, import heures Supabase et absences validees, generation PDF ; bulletins stockes en localStorage — non partages entre appareils)</li>
                    <li>RH (entretiens en Supabase, absences workflow multi-etapes complet ; fiches employes et documents RH en localStorage — non partages entre appareils)</li>
                    <li>Amendes</li>
                    <li>Espace client (portail tokenise v1.1, lecture factures Supabase ; onboarding et demandes transport en localStorage — non persistes cote serveur)</li>
                    <li>Espace affreteur (suivi operationnel, OT depuis Supabase ; portail affreteur en localStorage — non persiste cote serveur)</li>
                    <li>Planning affreteur dedie (socle pose, experience specifique a finir)</li>
                    <li>Tchat / Communication (canal exploitation/conducteur v1.1)</li>
                    <li>Utilisateurs (workflow complet : creation, suspension, reset MDP, lien magique, badges statut, confirmation destructive — depend de la fonction Netlify admin-users)</li>
                    <li>Site vitrine public (medias, preuves client et enrichissement commercial encore en cours)</li>
                    <li>Foundation compte_client_db_v1 (schemas core/docs/rt/audit/backup multi-compte — migrations a finaliser)</li>
                    <li>RLS strict compte client (isolation stricte par compte ERP sur perimetre V1 — policies same_compte a consolider)</li>
                  </ul>
                </Card>
                <Card>
                  <CardLabel>Statut LOCAL uniquement (dette technique — zero Supabase)</CardLabel>
                  <ul className="mt-3 list-disc pl-5 text-sm space-y-2">
                    <li>Frais (circuit complet RH-comptable-paie fonctionnel ; entierement en localStorage — non partage, perdu si vidage du cache)</li>
                    <li>Mail (messagerie demo complete avec pieces jointes, importance, etoiles ; entierement localStorage — pas de vrai client mail SMTP/IMAP)</li>
                    <li>Coffre numerique (navigation categorisee, signature locale ; entierement localStorage — URLs blob uniquement, inaccessible depuis un autre appareil)</li>
                    <li>Equipements (CRUD avec rattachement vehicule/remorque ; localStorage avec tentative de fallback Supabase si table absente)</li>
                  </ul>
                </Card>
              </div>
            )}

            {devTab === 'features' && (
              <div className="space-y-4">
                <Card>
                  <CardLabel>Features maintenues (reference)</CardLabel>
                  <ul className="mt-3 list-disc pl-5 text-sm space-y-2">
                    <li>Connectivite et discussion inter-ERP</li>
                    <li>Planning affreteur dedie</li>
                    <li>Groupage multi-courses figeable et deliable avec courses independantes</li>
                  </ul>
                </Card>
                <Card>
                  <CardLabel>En cours de developpement (nouvelles)</CardLabel>
                  <ul className="mt-3 list-disc pl-5 text-sm space-y-2">
                    <li>Entrepots et depots logistiques (capacite multi-lots posee, isolation tenant a finaliser)</li>
                    <li>Connectivite et discussion inter-ERP</li>
                    <li>Planning affreteur dedie dans un onglet specifique</li>
                    <li>Groupage multi-courses figeable et deliable en gardant les courses independantes</li>
                    <li>Workflow commercial complet pour demandes demo, prospection et qualification compte (Magic Link pose, formulaire commercial a finaliser)</li>
                    <li>Portail client ERP multi-tenant complet avec parametrage fin par client</li>
                  </ul>
                </Card>
                <Card>
                  <CardLabel>Ce qui manque au logiciel (prioritaire)</CardLabel>
                  <ul className="mt-3 list-disc pl-5 text-sm space-y-2">
                    <li>Persistance Supabase pour Frais, Mail, Coffre, Equipements (remplacement du localStorage)</li>
                    <li>Portails Espace client et Espace affreteur persistes en base (onboarding, demandes, contrats)</li>
                    <li>Bulletins de paie et fiches employes persistes en Supabase (multi appareils)</li>
                    <li>Messagerie reelle SMTP/IMAP (multi appareils, multi utilisateurs)</li>
                    <li>Lignes multi-article par facture et generation automatique depuis OT</li>
                    <li>Import fichiers tachygraphe reels (.ddd / .V1B)</li>
                    <li>Couverture de tests end-to-end multi roles</li>
                    <li>Durcissement securite avance (audit continu des endpoints publics et minimisation des surfaces service role)</li>
                  </ul>
                </Card>
                <Card>
                  <CardLabel>Ajouts hype possibles</CardLabel>
                  <ul className="mt-3 list-disc pl-5 text-sm space-y-2">
                    <li>Branchement Anthropic Claude sur placement retour en charge</li>
                    <li>IA detection et parsing emails transport → creation course</li>
                    <li>IA calcul temps de trajet multi-contraintes (ETA predictive)</li>
                    <li>Notifications push intelligentes (retards, incidents, validation)</li>
                    <li>Scoring automatique des demandes clients</li>
                    <li>Cockpit KPI ultra visuel par role</li>
                    <li>Application mobile conducteur avec mode degrade</li>
                    <li>Automatisation proactive des alertes transport/facturation</li>
                    <li>Integration API bourse de fret</li>
                    <li>Tracking temps reel via API externes</li>
                  </ul>
                </Card>
                <Card>
                  <CardLabel>Fonctionnalites avancees (roadmap)</CardLabel>
                  <ul className="mt-3 list-disc pl-5 text-sm space-y-2">
                    <li>Application conducteurs complete (messagerie, OT, statuts terrain, BL, frais, coffre numerique, fiche client)</li>
                    <li>Bourse de fret interne connectee (matching OT/capacite, suivi propositions, historisation attributions)</li>
                    <li>Cartographie poids lourds (restrictions gabarit, tonnage, hauteur, matieres reglementees)</li>
                    <li>API chronotachygraphe (temps de conduite/repos, alertes depassement, contraintes reglementaires)</li>
                    <li>IA de recommendation et optimisation (affectations conducteur/vehicule, km a vide, marge operationnelle)</li>
                    <li>Communication inter-ERP par reference transport (echange inter-systemes, webhook signe HMAC)</li>
                    <li>GPS poids lourds conducteurs (itineraire conforme, alertes contraintes, guidage mission par mission)</li>
                    <li>Portail affreteur avance (recuperation OT, facturation, dialogue affretement, adresses sans contact)</li>
                    <li>Portail client avance (ETA predictif, suivi missions, contact conducteur, facturation)</li>
                    <li>Connexion map live a la cartographie poids lourds</li>
                    <li>API tracking flotte GPS (historique, georeperage, alertes entree/sortie zone, preuves de parcours)</li>
                    <li>API tracking vitesse et niveau carburant (courbe conduite, anomalies, alertes optimisation)</li>
                    <li>OCR fournisseurs v1 et rapprochement intelligent (scoring match, seuil auto-validation configurable)</li>
                    <li>Rentabilite avancee (marge par client, cout au km, rentabilite camion)</li>
                    <li>Relances impayes avancees (scenarios relance parametrables, risque client calcule)</li>
                    <li>Amortissements flotte (gestion amortissements et impact rentabilite)</li>
                    <li>Gestion douaniere (DAU/T1/CMR, declarations, regimes douaniers, alertes echeances)</li>
                    <li>Gestion convois exceptionnels (autorisations prefectorales, gabarit, escortes, planning)</li>
                  </ul>
                </Card>
              </div>
            )}
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
