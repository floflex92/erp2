import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { ensureEmployeeJobSheets, ensurePolicyDocuments, HR_CATEGORY_LABELS, listHrDocumentsForViewer, signHrDocument, subscribeHrDocuments, type HrDocumentCategory, type HrDocumentRecord } from '@/lib/hrDocuments'
import { buildStaffDirectory, findStaffMember, staffDisplayName } from '@/lib/staffDirectory'
import { listVaultRecords, subscribeVaultUpdates, type VaultRecord } from '@/lib/vault'

type CoffreView = 'all' | 'signature' | 'paie' | 'identite' | 'societe' | 'pieces'

const CAREER_CATEGORIES: HrDocumentCategory[] = [
  'fiche_paie',
  'contrat_travail',
  'fiche_poste',
  'livret_integration',
  'fiche_information_embauche',
  'mutuelle',
]

const IDENTITY_CATEGORIES: HrDocumentCategory[] = [
  'carte_vitale',
  'carte_identite',
  'justificatif_domicile',
  'scan_complementaire',
]

const COMPANY_CATEGORIES: HrDocumentCategory[] = [
  'convention_collective',
  'charte_rgpd',
  'reglement_entreprise',
]

function formatSize(size: number) {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(1)} Mo`
  if (size >= 1_000) return `${Math.round(size / 1_000)} Ko`
  return `${size} o`
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('fr-FR')
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function sortDocuments(left: HrDocumentRecord, right: HrDocumentRecord) {
  const leftPriority = Number(left.requiresSignature && !left.signedAt)
  const rightPriority = Number(right.requiresSignature && !right.signedAt)
  if (leftPriority !== rightPriority) return rightPriority - leftPriority
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
}

function documentMatchesSearch(document: HrDocumentRecord, query: string) {
  if (!query) return true
  const haystack = normalizeText([
    document.title,
    document.fileName,
    document.employeeName,
    HR_CATEGORY_LABELS[document.category],
    document.createdByName,
  ].join(' '))
  return haystack.includes(query)
}

function attachmentMatchesSearch(item: VaultRecord, query: string) {
  if (!query) return true
  const haystack = normalizeText([item.name, item.source_label, item.source].join(' '))
  return haystack.includes(query)
}

export default function Coffre() {
  const { profil, accountProfil, role } = useAuth()
  const [items, setItems] = useState<VaultRecord[]>([])
  const [employeeDocs, setEmployeeDocs] = useState<HrDocumentRecord[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')
  const [activeView, setActiveView] = useState<CoffreView>('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ name: string; url: string } | null>(null)

  const staff = useMemo(
    () => buildStaffDirectory([profil, accountProfil]),
    [profil, accountProfil],
  )
  const isPrivileged = role === 'admin' || role === 'dirigeant' || role === 'rh'
  const effectiveEmployeeId = isPrivileged ? (selectedEmployeeId === 'all' ? null : selectedEmployeeId) : profil?.id ?? null
  const currentEmployee = findStaffMember(staff, profil?.id)
  const selectedEmployee = findStaffMember(staff, effectiveEmployeeId ?? profil?.id)
  const searchQuery = normalizeText(search.trim())

  useEffect(() => {
    if (!profil || !role) return

    ensurePolicyDocuments(staff, profil)
    ensureEmployeeJobSheets(staff, profil)

    const loadVault = () => setItems(listVaultRecords(profil.id))
    const loadHrDocs = () => setEmployeeDocs(listHrDocumentsForViewer(profil.id, role, effectiveEmployeeId))

    loadVault()
    loadHrDocs()

    const stopVault = subscribeVaultUpdates(loadVault)
    const stopHr = subscribeHrDocuments(loadHrDocs)
    return () => {
      stopVault()
      stopHr()
    }
  }, [profil, role, effectiveEmployeeId, staff])

  useEffect(() => {
    if (!profil || isPrivileged) return
    setSelectedEmployeeId(profil.id)
  }, [profil, isPrivileged])

  if (!profil || !role) return null

  const currentProfil = profil
  const filteredDocs = employeeDocs.filter(document => documentMatchesSearch(document, searchQuery)).sort(sortDocuments)
  const filteredAttachments = items.filter(item => attachmentMatchesSearch(item, searchQuery))

  const docsToSign = filteredDocs.filter(item => item.employeeId === currentProfil.id && item.requiresSignature && !item.signedAt)
  const paieAndContracts = filteredDocs.filter(item => CAREER_CATEGORIES.includes(item.category))
  const identityDocs = filteredDocs.filter(item => IDENTITY_CATEGORIES.includes(item.category))
  const companyDocs = filteredDocs.filter(item => COMPANY_CATEGORIES.includes(item.category))
  const mailAttachments = filteredAttachments.filter(item => item.source === 'mail')
  const tchatAttachments = filteredAttachments.filter(item => item.source === 'tchat')
  const signatureAttachments = filteredAttachments.filter(item => item.source === 'signature')

  const visibleBlocks =
    activeView === 'signature'
      ? [{ key: 'signature', title: 'Documents a signer', subtitle: 'Uniquement les documents qui attendent votre signature.', docs: docsToSign, empty: 'Aucun document a signer pour ce profil.' }]
      : activeView === 'paie'
        ? [{ key: 'paie', title: 'Paie, contrats et integration', subtitle: 'Bulletins, contrats, fiches metier et dossier d integration.', docs: paieAndContracts, empty: 'Aucun document de paie ou contrat dans ce filtre.' }]
        : activeView === 'identite'
          ? [{ key: 'identite', title: 'Identite et administratif', subtitle: 'Pieces personnelles et scans RH utiles au dossier collaborateur.', docs: identityDocs, empty: 'Aucun document d identite ou administratif disponible.' }]
          : activeView === 'societe'
            ? [{ key: 'societe', title: 'Documents entreprise', subtitle: 'Convention collective, reglement et charte mis a disposition du collaborateur.', docs: companyDocs, empty: 'Aucun document entreprise dans ce filtre.' }]
            : []

  async function handleSign(document: HrDocumentRecord) {
    if (document.employeeId !== currentProfil.id) {
      setError('Seul le collaborateur concerne peut signer ce document.')
      return
    }

    const employee = findStaffMember(staff, currentProfil.id)
    if (!employee) {
      setError('Profil collaborateur introuvable pour la signature.')
      return
    }

    try {
      signHrDocument(document.id, employee)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signature numerique impossible.'
      setError(message)
    }
  }

  function handlePreview(name: string, url: string) {
    setPreview({ name, url })
  }

  return (
    <div className="space-y-5 p-5 md:p-6">
      <div className="nx-panel px-6 py-5" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #111827 55%, #164e63 100%)' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/70">Archivage securise</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Coffre numerique</h2>
            <p className="mt-1.5 max-w-3xl text-sm text-slate-300">
              Vue reorganisee par usage: signature, paie, identite, documents entreprise et pieces jointes sauvegardees.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-200">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Lecture active</p>
            <p className="mt-1 font-semibold text-white">{selectedEmployee ? staffDisplayName(selectedEmployee) : 'Tous les collaborateurs'}</p>
            <p className="mt-1 text-xs text-slate-300">
              {isPrivileged ? 'Filtre dirigeant / RH' : 'Vue personnelle securisee'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <MetricCard label="A signer" value={String(docsToSign.length)} detail="Action immediate" />
        <MetricCard label="Paie & contrats" value={String(paieAndContracts.length)} detail="Parcours salarie" />
        <MetricCard label="Identite & RH" value={String(identityDocs.length)} detail="Pieces admin" />
        <MetricCard label="Docs entreprise" value={String(companyDocs.length)} detail="Reference commune" />
        <MetricCard label="Pieces jointes" value={String(filteredAttachments.length)} detail="Mail + messagerie" />
      </div>

      <div className="nx-panel overflow-hidden">
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Navigation du coffre</p>
              <p className="mt-1 text-xs text-slate-400">Utilise les vues ci-dessous pour lire le dossier par intention, pas par ordre technique.</p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <label className="flex min-w-[260px] items-center gap-3 rounded-2xl border px-4 py-3 text-sm text-slate-200" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.04)' }}>
                <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Rechercher un document, un nom ou un type"
                  className="w-full border-0 bg-transparent p-0 text-sm text-white outline-none"
                />
              </label>

              {isPrivileged && (
                <select
                  value={selectedEmployeeId}
                  onChange={event => setSelectedEmployeeId(event.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm text-slate-100"
                  style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.04)' }}
                >
                  <option value="all">Tous les collaborateurs</option>
                  {staff.map(member => (
                    <option key={member.id} value={member.id}>{staffDisplayName(member)}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ViewChip label="Tout" active={activeView === 'all'} onClick={() => setActiveView('all')} />
            <ViewChip label="A signer" active={activeView === 'signature'} onClick={() => setActiveView('signature')} count={docsToSign.length} />
            <ViewChip label="Paie & contrats" active={activeView === 'paie'} onClick={() => setActiveView('paie')} count={paieAndContracts.length} />
            <ViewChip label="Identite & RH" active={activeView === 'identite'} onClick={() => setActiveView('identite')} count={identityDocs.length} />
            <ViewChip label="Entreprise" active={activeView === 'societe'} onClick={() => setActiveView('societe')} count={companyDocs.length} />
            <ViewChip label="Pieces jointes" active={activeView === 'pieces'} onClick={() => setActiveView('pieces')} count={filteredAttachments.length} />
          </div>
        </div>

        {error && (
          <div className="border-b px-5 py-3 text-sm text-rose-300" style={{ borderColor: 'rgba(244,114,182,0.25)', background: 'rgba(127,29,29,0.24)' }}>
            {error}
          </div>
        )}

        {(activeView === 'all' || activeView === 'signature') && (
          <DocumentSection
            title="Documents a signer"
            subtitle="Uniquement les documents dont la signature vous est personnellement demandee."
            docs={docsToSign}
            empty="Aucun document a signer pour ce profil."
            onSign={handleSign}
            onPreview={handlePreview}
            currentProfileId={currentProfil.id}
            highlighted
          />
        )}

        {(activeView === 'all' || activeView === 'paie' || activeView === 'identite' || activeView === 'societe') && activeView !== 'all' && visibleBlocks.map(block => (
          <DocumentSection
            key={block.key}
            title={block.title}
            subtitle={block.subtitle}
            docs={block.docs}
            empty={block.empty}
            onSign={handleSign}
            onPreview={handlePreview}
            currentProfileId={currentProfil.id}
          />
        ))}

        {activeView === 'all' && (
          <>
            <DocumentSection
              title="Paie, contrats et integration"
              subtitle="Les documents qui structurent le parcours salarie, dont la fiche metier individuelle a signer."
              docs={paieAndContracts}
              empty="Aucun document de paie ou contrat dans ce filtre."
              onSign={handleSign}
              onPreview={handlePreview}
              currentProfileId={currentProfil.id}
            />

            <DocumentSection
              title="Identite et administratif"
              subtitle="Les pieces personnelles et justificatifs RH classes ensemble."
              docs={identityDocs}
              empty="Aucun document d identite ou administratif disponible."
              onSign={handleSign}
              onPreview={handlePreview}
              currentProfileId={currentProfil.id}
            />

            <DocumentSection
              title="Documents entreprise"
              subtitle="Les documents de reference remis par l entreprise au collaborateur."
              docs={companyDocs}
              empty="Aucun document entreprise dans ce filtre."
              onSign={handleSign}
              onPreview={handlePreview}
              currentProfileId={currentProfil.id}
            />
          </>
        )}

        {(activeView === 'all' || activeView === 'pieces') && (
          <AttachmentSection
            title="Pieces jointes sauvegardees"
            subtitle="Les documents enregistres depuis Mail, Messagerie et signatures CMR, regroupes par source."
            mailAttachments={mailAttachments}
            tchatAttachments={tchatAttachments}
            signatureAttachments={signatureAttachments}
            onPreview={handlePreview}
          />
        )}
      </div>

      {!isPrivileged && currentEmployee && (
        <div className="rounded-2xl border px-5 py-4 text-sm text-slate-300" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.03)' }}>
          Vue personnelle active pour <span className="font-semibold text-white">{staffDisplayName(currentEmployee)}</span>. Les dirigeants et RH disposent d un filtre collaborateur, mais la signature reste reservee au salarie concerne.
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/86 p-4">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{preview.name}</p>
                <p className="mt-1 text-xs text-slate-400">Lecture du document depuis le coffre numerique</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={preview.url} download={preview.name} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-200">
                  Telecharger
                </a>
                <button type="button" onClick={() => setPreview(null)} className="rounded-xl bg-[color:var(--primary)] px-3 py-2 text-xs font-medium text-white">
                  Fermer
                </button>
              </div>
            </div>
            <div className="flex-1 p-4">
              <iframe title={preview.name} src={preview.url} className="h-full w-full rounded-2xl border border-white/10 bg-white" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ViewChip({
  label,
  active,
  onClick,
  count,
}: {
  label: string
  active: boolean
  onClick: () => void
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
      }`}
    >
      {label}
      {typeof count === 'number' && <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-white/18 text-white' : 'bg-white/10 text-slate-300'}`}>{count}</span>}
    </button>
  )
}

function DocumentSection({
  title,
  subtitle,
  docs,
  empty,
  onSign,
  onPreview,
  currentProfileId,
  highlighted = false,
}: {
  title: string
  subtitle: string
  docs: HrDocumentRecord[]
  empty: string
  onSign: (document: HrDocumentRecord) => void
  onPreview: (name: string, url: string) => void
  currentProfileId: string
  highlighted?: boolean
}) {
  return (
    <section className={`border-b ${highlighted ? 'bg-blue-500/[0.04]' : ''}`} style={{ borderColor: 'var(--border)' }}>
      <div className="px-5 py-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          </div>
          <p className="text-xs text-slate-500">{docs.length} document(s)</p>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="px-5 pb-6 text-sm text-slate-400">{empty}</div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {docs.map(document => (
            <EmployeeDocumentRow
              key={document.id}
              document={document}
              canSign={document.employeeId === currentProfileId && document.requiresSignature && !document.signedAt}
              onPreview={() => onPreview(document.fileName, document.url)}
              onSign={() => onSign(document)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function AttachmentSection({
  title,
  subtitle,
  mailAttachments,
  tchatAttachments,
  signatureAttachments,
  onPreview,
}: {
  title: string
  subtitle: string
  mailAttachments: VaultRecord[]
  tchatAttachments: VaultRecord[]
  signatureAttachments: VaultRecord[]
  onPreview: (name: string, url: string) => void
}) {
  return (
    <section>
      <div className="px-5 py-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          </div>
          <p className="text-xs text-slate-500">{mailAttachments.length + tchatAttachments.length + signatureAttachments.length} piece(s)</p>
        </div>
      </div>

      <AttachmentGroup title="Depuis Mail" items={mailAttachments} empty="Aucune piece jointe sauvegardee depuis Mail." onPreview={onPreview} />
      <AttachmentGroup title="Depuis Messagerie" items={tchatAttachments} empty="Aucune piece jointe sauvegardee depuis la Messagerie." onPreview={onPreview} />
      <AttachmentGroup title="Depuis Signatures CMR" items={signatureAttachments} empty="Aucune preuve PDF de signature CMR enregistree." onPreview={onPreview} />
    </section>
  )
}

function AttachmentGroup({
  title,
  items,
  empty,
  onPreview,
}: {
  title: string
  items: VaultRecord[]
  empty: string
  onPreview: (name: string, url: string) => void
}) {
  return (
    <div className="border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      </div>

      {items.length === 0 ? (
        <div className="px-5 pb-5 text-sm text-slate-400">{empty}</div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {items.map(item => (
            <div key={item.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                <p className="mt-1 text-xs text-slate-400">{item.source_label}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.created_at)} - {formatSize(item.size)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onPreview(item.name, item.url)} className="rounded-xl border px-3 py-2 text-xs font-medium text-slate-200" style={{ borderColor: 'var(--border)' }}>
                  Lire
                </button>
                <a href={item.url} download={item.name} className="rounded-xl bg-[color:var(--primary)] px-3 py-2 text-xs font-medium text-white">
                  Telecharger
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmployeeDocumentRow({
  document,
  canSign,
  onPreview,
  onSign,
}: {
  document: HrDocumentRecord
  canSign: boolean
  onPreview: () => void
  onSign: () => void
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-white">{document.title}</p>
          <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300" style={{ borderColor: 'var(--border)' }}>
            {HR_CATEGORY_LABELS[document.category]}
          </span>
          {document.requiresSignature && !document.signedAt && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
              Signature attendue
            </span>
          )}
          {document.signedAt && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
              Signe
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">{document.employeeName} - {document.fileName}</p>
        <p className="mt-1 text-xs text-slate-500">
          Cree le {formatDateTime(document.createdAt)} - {formatSize(document.size)}
          {document.signatureLabel ? ` - ${document.signatureLabel}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onPreview} className="rounded-xl border px-3 py-2 text-xs font-medium text-slate-200" style={{ borderColor: 'var(--border)' }}>
          Lire
        </button>
        <a href={document.url} download={document.fileName} className="rounded-xl border px-3 py-2 text-xs font-medium text-slate-200" style={{ borderColor: 'var(--border)' }}>
          Telecharger
        </a>
        {canSign && (
          <button type="button" onClick={onSign} className="rounded-xl bg-[color:var(--primary)] px-3 py-2 text-xs font-medium text-white">
            Signer numeriquement
          </button>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="nx-panel px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  )
}
