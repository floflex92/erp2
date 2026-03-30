import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useAuth } from '@/lib/auth'
import { deliverDemoMailToInbox, ensureDemoMailbox } from '@/lib/demoMail'
import { DEMO_PROFILES } from '@/lib/demoUsers'
import { createFineRecord, ensureDemoFineSeeds, extractPdfSearchText, listFineRecords, normalizePlate, parseFineDocument, patchFineRecord, subscribeFineUpdates, type FineConfidence, type FineNature, type FineRecord } from '@/lib/fines'
import { supabase } from '@/lib/supabase'
import { serializeTchatPayload } from '@/lib/tchatMessage'

type ConducteurLite = {
  id: string
  nom: string
  prenom: string
  email: string | null
  statut: string
}

type VehiculeLite = {
  id: string
  immatriculation: string
  marque: string | null
  modele: string | null
  statut: string
}

type AffectationLite = {
  conducteur_id: string
  vehicule_id: string | null
  actif: boolean
  date_debut: string | null
  date_fin: string | null
}

const NATURE_LABELS: Record<FineNature, string> = {
  stationnement: 'Stationnement',
  vitesse: 'Exces de vitesse',
  peage: 'Peage',
  circulation: 'Circulation',
  autre: 'Autre',
}

const CONFIDENCE_LABELS: Record<FineConfidence, string> = {
  faible: 'Faible',
  moyenne: 'Moyenne',
  haute: 'Haute',
}

function normalizeIdentity(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '')
    .toLowerCase()
}

function conducteurIdentity(conducteur: { prenom: string | null; nom: string | null; email?: string | null }) {
  return `${normalizeIdentity(conducteur.prenom)}-${normalizeIdentity(conducteur.nom)}`
}

function fineBelongsToConducteurSession(
  fine: FineRecord,
  profil: { prenom: string | null; nom: string | null; email?: string | null } | null,
  currentConducteur: ConducteurLite | null,
) {
  if (!profil) return false
  if (currentConducteur && fine.conducteur_id === currentConducteur.id) return true

  const profileEmail = normalizeIdentity(profil.email)
  const fineEmail = normalizeIdentity(fine.conducteur_email)
  if (profileEmail && fineEmail && profileEmail === fineEmail) return true

  const prenom = normalizeIdentity(profil.prenom)
  const nom = normalizeIdentity(profil.nom)
  const fineName = normalizeIdentity(fine.conducteur_name)
  if (fineName && prenom && nom && fineName.includes(prenom) && fineName.includes(nom)) return true

  return false
}

function displayConducteur(conducteur: ConducteurLite | null | undefined) {
  if (!conducteur) return 'Non assigne'
  return [conducteur.prenom, conducteur.nom].filter(Boolean).join(' ')
}

function formatDateTime(value: string | null) {
  if (!value) return 'Non detecte'
  return new Date(value).toLocaleString('fr-FR')
}

function formatCurrency(value: number | null) {
  if (value === null) return 'Non detecte'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
}

function confidenceStyle(confidence: FineConfidence) {
  if (confidence === 'haute') return 'nx-status-success'
  if (confidence === 'moyenne') return 'nx-status-warning'
  return 'nx-status-error'
}

function statusStyle(status: FineRecord['status']) {
  if (status === 'archivee') return 'nx-status-success'
  if (status === 'notifiee' || status === 'redirigee') return 'nx-status-warning'
  return 'nx-status-error'
}

function statusLabel(status: FineRecord['status']) {
  if (status === 'notifiee') return 'Notifiee'
  if (status === 'redirigee') return 'Redirigee'
  if (status === 'archivee') return 'Archivee'
  return 'Recue'
}

function vehicleLabel(vehicule: VehiculeLite | null | undefined) {
  if (!vehicule) return 'Vehicule non detecte'
  return [vehicule.immatriculation, vehicule.marque, vehicule.modele].filter(Boolean).join(' · ')
}

function buildFallbackVehicule(): VehiculeLite {
  return {
    id: 'demo-fine-vehicule',
    immatriculation: 'AA-000-AA',
    marque: 'Demo',
    modele: 'Conducteur',
    statut: 'actif',
  }
}

function buildSessionConducteur(profil: { id?: string; nom: string | null; prenom: string | null; email?: string | null }): ConducteurLite {
  return {
    id: `demo-conducteur-${profil.id ?? 'session'}`,
    nom: profil.nom ?? 'Conducteur',
    prenom: profil.prenom ?? 'Session',
    email: profil.email ?? null,
    statut: 'actif',
  }
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error(`Lecture impossible pour ${file.name}.`))
    }
    reader.onerror = () => reject(new Error(`Lecture impossible pour ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

function matchVehicule(immatriculation: string | null, vehicules: VehiculeLite[]) {
  if (!immatriculation) return null
  const needle = normalizePlate(immatriculation)
  return vehicules.find(vehicule => normalizePlate(vehicule.immatriculation) === needle) ?? null
}

function matchConducteurByVehicle(vehiculeId: string | null, conducteurs: ConducteurLite[], affectations: AffectationLite[]) {
  if (!vehiculeId) return null
  const affectation = affectations.find(item => item.actif && item.vehicule_id === vehiculeId) ?? null
  if (!affectation) return null
  return conducteurs.find(conducteur => conducteur.id === affectation.conducteur_id) ?? null
}

function matchConducteurByName(name: string | null, conducteurs: ConducteurLite[]) {
  if (!name) return null
  const normalized = normalizeIdentity(name)
  return conducteurs.find(conducteur => normalized.includes(normalizeIdentity(conducteur.prenom)) && normalized.includes(normalizeIdentity(conducteur.nom))) ?? null
}

function findMailboxProfileForConducteur(conducteur: ConducteurLite) {
  const normalizedEmail = normalizeIdentity(conducteur.email)
  if (normalizedEmail) {
    const byEmail = DEMO_PROFILES.find(profile => normalizeIdentity(profile.email) === normalizedEmail)
    if (byEmail) return byEmail
  }

  const identity = conducteurIdentity(conducteur)
  const byName = DEMO_PROFILES.find(profile => profile.role === 'conducteur' && conducteurIdentity(profile) === identity)
  if (byName) return byName

  return DEMO_PROFILES.find(profile => profile.role === 'conducteur') ?? null
}

async function notifyConducteurFine(conducteur: ConducteurLite, fine: FineRecord) {
  const mailboxProfile = findMailboxProfileForConducteur(conducteur)
  if (!mailboxProfile) return false

  ensureDemoMailbox(mailboxProfile)
  const body = serializeTchatPayload(
    [
      `Bonjour ${conducteur.prenom},`,
      '',
      `Une amende de type ${NATURE_LABELS[fine.nature]} a ete enregistree et redirigee vers vous.`,
      `Montant : ${formatCurrency(fine.amount)}`,
      `Date/heure : ${formatDateTime(fine.occured_at)}`,
      `Lieu : ${fine.location ?? 'Non detecte'}`,
      `Vehicule : ${fine.vehicule_plate ?? 'Non detecte'}`,
      '',
      'Le PDF d origine est joint a ce mail pour traitement.',
    ].join('\n'),
    [
      {
        id: `fine-pdf-${fine.id}`,
        kind: 'document',
        name: fine.pdf_name,
        mimeType: 'application/pdf',
        size: fine.pdf_size,
        url: fine.pdf_url,
      },
    ],
  )

  deliverDemoMailToInbox(
    mailboxProfile,
    'NEXORA truck - PV et amendes',
    'amendes@nexora.local',
    `${NATURE_LABELS[fine.nature]} - ${fine.vehicule_plate ?? 'vehicule a confirmer'}`,
    body,
    ['amende', 'prioritaire'],
  )
  return true
}

export default function Amendes() {
  const { profil, role } = useAuth()
  const [fines, setFines] = useState<FineRecord[]>([])
  const [conducteurs, setConducteurs] = useState<ConducteurLite[]>([])
  const [vehicules, setVehicules] = useState<VehiculeLite[]>([])
  const [affectations, setAffectations] = useState<AffectationLite[]>([])
  const [loading, setLoading] = useState(true)
  const [scanLoading, setScanLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selectedFineId, setSelectedFineId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [manualConducteurId, setManualConducteurId] = useState<string>('')
  const [manualVehiculeId, setManualVehiculeId] = useState<string>('')
  const [managerNote, setManagerNote] = useState('')

  const isConducteurSession = role === 'conducteur'
  const canManage = role === 'admin' || role === 'dirigeant' || role === 'exploitant' || role === 'comptable'

  const currentConducteur = useMemo(() => {
    if (!isConducteurSession || !profil) return null
    const normalizedEmail = normalizeIdentity(profil.email)
    const identity = conducteurIdentity({ prenom: profil.prenom ?? '', nom: profil.nom ?? '', email: profil.email ?? null })
    return conducteurs.find(conducteur =>
      (normalizedEmail && normalizeIdentity(conducteur.email) === normalizedEmail)
      || conducteurIdentity(conducteur) === identity,
    ) ?? null
  }, [conducteurs, isConducteurSession, profil])

  const visibleFines = useMemo(() => {
    const base = isConducteurSession
      ? fines.filter(fine => fineBelongsToConducteurSession(fine, profil, currentConducteur))
      : fines
    const needle = normalizeIdentity(search)
    if (!needle) return base
    return base.filter(fine =>
      normalizeIdentity([
        fine.reference,
        fine.location,
        fine.vehicule_plate,
        fine.conducteur_name,
        fine.nature,
      ].filter(Boolean).join(' ')).includes(needle),
    )
  }, [currentConducteur, fines, isConducteurSession, profil, search])

  const selectedFine = useMemo(
    () => visibleFines.find(fine => fine.id === selectedFineId) ?? visibleFines[0] ?? null,
    [selectedFineId, visibleFines],
  )

  useEffect(() => {
    if (!selectedFine && selectedFineId) setSelectedFineId(null)
  }, [selectedFine, selectedFineId])

  useEffect(() => {
    if (!selectedFine) {
      setManualConducteurId('')
      setManualVehiculeId('')
      setManagerNote('')
      return
    }
    setManualConducteurId(selectedFine.conducteur_id ?? '')
    setManualVehiculeId(selectedFine.vehicule_id ?? '')
    setManagerNote(selectedFine.manager_notes ?? '')
  }, [selectedFine])

  const refreshFines = useCallback(() => {
    const next = listFineRecords()
    setFines(next)
    if (!selectedFineId && next[0]) setSelectedFineId(next[0].id)
  }, [selectedFineId])

  const loadContext = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [conducteursRes, vehiculesRes, affectationsRes] = await Promise.all([
        supabase.from('conducteurs').select('id,nom,prenom,email,statut').eq('statut', 'actif').order('nom'),
        supabase.from('vehicules').select('id,immatriculation,marque,modele,statut').order('immatriculation'),
        supabase.from('affectations').select('conducteur_id,vehicule_id,actif,date_debut,date_fin').eq('actif', true),
      ])

      const firstError = conducteursRes.error ?? vehiculesRes.error ?? affectationsRes.error
      if (firstError && !isConducteurSession) throw firstError

      const nextConducteurs = conducteursRes.error ? [] : (conducteursRes.data ?? []) as ConducteurLite[]
      const nextVehicules = vehiculesRes.error ? [] : (vehiculesRes.data ?? []) as VehiculeLite[]
      const nextAffectations = affectationsRes.error ? [] : (affectationsRes.data ?? []) as AffectationLite[]

      setConducteurs(nextConducteurs)
      setVehicules(nextVehicules)
      setAffectations(nextAffectations)

      const fallbackVehicule = buildFallbackVehicule()
      const seedVehicules = nextVehicules.length > 0 ? nextVehicules : [fallbackVehicule]
      const hasSessionConducteur =
        Boolean(profil) &&
        nextConducteurs.some(item =>
          (profil?.email && normalizeIdentity(item.email) === normalizeIdentity(profil.email))
          || conducteurIdentity(item) === conducteurIdentity({ prenom: profil?.prenom ?? '', nom: profil?.nom ?? '', email: profil?.email ?? null }),
        )
      const sessionConducteur = profil ? buildSessionConducteur({ id: profil.id, nom: profil.nom, prenom: profil.prenom, email: profil.email ?? null }) : null
      const seedConducteurs = isConducteurSession && sessionConducteur && !hasSessionConducteur
        ? [sessionConducteur, ...nextConducteurs]
        : nextConducteurs
      const seedAffectations = nextAffectations.length > 0
        ? nextAffectations
        : (isConducteurSession && sessionConducteur
          ? [{ conducteur_id: sessionConducteur.id, vehicule_id: seedVehicules[0]?.id ?? null, actif: true, date_debut: new Date().toISOString(), date_fin: null }]
          : [])

      ensureDemoFineSeeds({
        conducteurs: seedConducteurs,
        vehicules: seedVehicules,
        affectations: seedAffectations,
      })
      refreshFines()
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [isConducteurSession, profil, refreshFines])

  useEffect(() => {
    void loadContext()
  }, [loadContext])

  useEffect(() => subscribeFineUpdates(() => refreshFines()), [refreshFines])

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Seuls les PDF sont acceptes dans ce module.')
      return
    }
    if (file.size > 2_500_000) {
      setError('Le PDF depasse 2,5 Mo. Reduis le scan avant import.')
      return
    }

    setScanLoading(true)
    setError(null)
    setNotice(null)

    try {
      const rawText = await extractPdfSearchText(file)
      const parsed = parseFineDocument(rawText, file.name)
      const pdfUrl = await fileToDataUrl(file)

      const matchedVehicule = matchVehicule(parsed.immatriculation, vehicules)
      const matchedConducteur =
        matchConducteurByVehicle(matchedVehicule?.id ?? null, conducteurs, affectations)
        ?? matchConducteurByName(parsed.conducteurName, conducteurs)

      let fine = createFineRecord({
        pdf_name: file.name,
        pdf_url: pdfUrl,
        pdf_size: file.size,
        extracted_text: parsed.rawText,
        reference: parsed.reference,
        nature: parsed.nature,
        amount: parsed.amount,
        occured_at: parsed.occuredAt,
        location: parsed.location,
        vehicule_id: matchedVehicule?.id ?? null,
        vehicule_plate: matchedVehicule?.immatriculation ?? parsed.immatriculation,
        conducteur_id: matchedConducteur?.id ?? null,
        conducteur_name: matchedConducteur ? displayConducteur(matchedConducteur) : parsed.conducteurName,
        conducteur_email: matchedConducteur?.email ?? null,
        status: 'recue',
        confidence: parsed.confidence,
        manager_notes: parsed.rawText ? null : 'PDF scanne sans texte lisible. Verification manuelle requise.',
        notified_at: null,
        redirected_at: null,
      })

      if (matchedConducteur) {
        const notified = await notifyConducteurFine(matchedConducteur, fine)
        if (notified) {
          const stamp = new Date().toISOString()
          fine = patchFineRecord(fine.id, {
            status: 'notifiee',
            notified_at: stamp,
          }) ?? fine
        }
      }

      refreshFines()
      setSelectedFineId(fine.id)
      setNotice(
        matchedConducteur
          ? `Amende importee et notifiee a ${displayConducteur(matchedConducteur)}.`
          : 'Amende importee. Affectation manuelle requise avant notification.',
      )
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Import impossible.')
    } finally {
      setScanLoading(false)
    }
  }

  async function handleRedirect() {
    if (!selectedFine) return
    const conducteur = conducteurs.find(item => item.id === manualConducteurId) ?? null
    const vehicule = vehicules.find(item => item.id === manualVehiculeId) ?? null
    if (!conducteur) {
      setError('Choisis d abord le conducteur concerne.')
      return
    }

    const nextStatus = selectedFine.conducteur_id && selectedFine.conducteur_id !== conducteur.id ? 'redirigee' : 'notifiee'
    const stamp = new Date().toISOString()
    const updated = patchFineRecord(selectedFine.id, {
      conducteur_id: conducteur.id,
      conducteur_name: displayConducteur(conducteur),
      conducteur_email: conducteur.email,
      vehicule_id: vehicule?.id ?? selectedFine.vehicule_id,
      vehicule_plate: vehicule?.immatriculation ?? selectedFine.vehicule_plate,
      manager_notes: managerNote.trim() || null,
      status: nextStatus,
      notified_at: stamp,
      redirected_at: nextStatus === 'redirigee' ? stamp : selectedFine.redirected_at,
    })

    if (!updated) {
      setError('Mise a jour impossible.')
      return
    }

    const notified = await notifyConducteurFine(conducteur, updated)
    refreshFines()
    setSelectedFineId(selectedFine.id)
    setNotice(
      notified
        ? `${displayConducteur(conducteur)} a ete notifie depuis la boite mail interne.`
        : 'Affectation enregistree, mais aucune boite demo conducteur n a ete trouvee.',
    )
  }

  function handleArchive() {
    if (!selectedFine) return
    patchFineRecord(selectedFine.id, { status: 'archivee', manager_notes: managerNote.trim() || selectedFine.manager_notes })
    refreshFines()
    setNotice('Amende archivee dans le registre.')
  }

  const pendingCount = visibleFines.filter(fine => fine.status === 'recue').length
  const notifiedCount = visibleFines.filter(fine => fine.status === 'notifiee' || fine.status === 'redirigee').length

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-5 p-5 md:p-6">
      <div className="nx-panel px-6 py-5" style={{ background: 'linear-gradient(135deg, #140b0d 0%, #111827 55%, #1f2937 100%)' }}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-200/70">Conformite route</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">PV & Amendes</h2>
            <p className="mt-1.5 max-w-3xl text-sm text-slate-300">Import des avis en PDF, lecture automatique des informations, rapprochement camion/conducteur, notification et redirection interne.</p>
          </div>
          {canManage && (
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-white/15 bg-white/8 px-5 py-3 text-sm font-medium text-white hover:bg-white/12">
              <input type="file" accept="application/pdf" className="hidden" onChange={handleImport} />
              {scanLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" /></svg>
              )}
              Importer un PDF d amende
            </label>
          )}
        </div>
      </div>

      {isConducteurSession && (
        <div className="nx-panel border border-blue-500/20 bg-blue-500/5 px-5 py-4">
          <p className="text-sm font-medium text-[color:var(--primary)]">Acces conducteur</p>
          <p className="mt-1 text-sm text-slate-600">Seules vos propres amendes et notifications sont visibles dans cette session.</p>
        </div>
      )}

      {!isConducteurSession && (
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Registre" value={String(visibleFines.length)} detail="PDF archives" />
          <MetricCard label="A traiter" value={String(pendingCount)} detail="Affectation ou verification" accent="#fb7185" />
          <MetricCard label="Notifiees" value={String(notifiedCount)} detail="Conducteur informe" accent="#60a5fa" />
        </div>
      )}

      {error && <div className="nx-status-error rounded-2xl border border-red-200 px-4 py-3 text-sm">{error}</div>}
      {notice && <div className="nx-status-success rounded-2xl border border-green-200 px-4 py-3 text-sm">{notice}</div>}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="nx-panel overflow-hidden">
          <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Registre des amendes</p>
                <p className="mt-1 text-xs text-slate-400">{visibleFines.length} dossier(s)</p>
              </div>
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Rechercher plaque, lieu, reference"
                className="w-full max-w-[180px] rounded-xl border bg-transparent px-3 py-2 text-xs outline-none"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
          </div>
          <div className="max-h-[68vh] overflow-y-auto p-3">
            {visibleFines.length === 0 ? (
              <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-slate-400" style={{ borderColor: 'var(--border)' }}>
                Aucune amende importee pour le moment.
              </div>
            ) : (
              <div className="space-y-2">
                {visibleFines.map(fine => (
                  <button
                    key={fine.id}
                    type="button"
                    onClick={() => setSelectedFineId(fine.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selectedFine?.id === fine.id ? 'bg-[color:var(--primary-soft)]' : 'hover:bg-slate-50'}`}
                    style={{ borderColor: selectedFine?.id === fine.id ? 'var(--primary)' : 'var(--border)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{NATURE_LABELS[fine.nature]}</p>
                        <p className="mt-1 truncate text-xs text-slate-400">{fine.vehicule_plate ?? 'Plaque non detectee'} · {fine.location ?? 'Lieu a confirmer'}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusStyle(fine.status)}`}>{statusLabel(fine.status)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>{formatCurrency(fine.amount)}</span>
                      <span>{formatDateTime(fine.occured_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {selectedFine ? (
            <>
              <div className="nx-panel overflow-hidden">
                <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{selectedFine.reference ?? selectedFine.pdf_name}</p>
                      <p className="mt-1 text-xs text-slate-400">{selectedFine.pdf_name}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyle(selectedFine.status)}`}>{statusLabel(selectedFine.status)}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${confidenceStyle(selectedFine.confidence)}`}>Detection {CONFIDENCE_LABELS[selectedFine.confidence]}</span>
                      <a href={selectedFine.pdf_url} target="_blank" rel="noreferrer" className="rounded-full border px-2.5 py-1 text-[10px] font-semibold text-slate-700" style={{ borderColor: 'var(--border)' }}>
                        Ouvrir le PDF
                      </a>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
                  <InfoTile label="Nature" value={NATURE_LABELS[selectedFine.nature]} />
                  <InfoTile label="Montant" value={formatCurrency(selectedFine.amount)} />
                  <InfoTile label="Date / heure" value={formatDateTime(selectedFine.occured_at)} />
                  <InfoTile label="Lieu" value={selectedFine.location ?? 'A confirmer'} />
                  <InfoTile label="Vehicule" value={selectedFine.vehicule_plate ?? 'A confirmer'} />
                  <InfoTile label="Conducteur" value={selectedFine.conducteur_name ?? 'Non identifie'} />
                  <InfoTile label="Notification" value={selectedFine.notified_at ? formatDateTime(selectedFine.notified_at) : 'Non envoyee'} />
                  <InfoTile label="Creation" value={formatDateTime(selectedFine.created_at)} />
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="nx-panel overflow-hidden">
                  <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-semibold text-slate-950">Lecture automatique</p>
                    <p className="mt-1 text-xs text-slate-400">Extraction heuristique du texte PDF. Si le document est un scan image pur, une verification manuelle reste necessaire.</p>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto px-5 py-4">
                    <pre className="whitespace-pre-wrap text-xs leading-6 text-slate-700">{selectedFine.extracted_text || 'Aucun texte exploitable detecte dans le PDF.'}</pre>
                  </div>
                </div>

                <div className="nx-panel overflow-hidden">
                  <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-semibold text-slate-950">Affectation et redirection</p>
                    <p className="mt-1 text-xs text-slate-400">Confirme le camion, le conducteur et envoie la notification au collaborateur concerne.</p>
                  </div>
                  <div className="space-y-4 px-5 py-4">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Vehicule</span>
                      <select
                        value={manualVehiculeId}
                        onChange={event => {
                          const nextVehicleId = event.target.value
                          setManualVehiculeId(nextVehicleId)
                          const byVehicle = matchConducteurByVehicle(nextVehicleId || null, conducteurs, affectations)
                          if (byVehicle) setManualConducteurId(byVehicle.id)
                        }}
                        disabled={!canManage}
                        className="w-full rounded-2xl border bg-transparent px-3 py-3 text-sm outline-none"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <option value="">Vehicule a confirmer</option>
                        {vehicules.map(vehicule => (
                          <option key={vehicule.id} value={vehicule.id}>{vehicleLabel(vehicule)}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Conducteur</span>
                      <select
                        value={manualConducteurId}
                        onChange={event => setManualConducteurId(event.target.value)}
                        disabled={!canManage}
                        className="w-full rounded-2xl border bg-transparent px-3 py-3 text-sm outline-none"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <option value="">Conducteur a confirmer</option>
                        {conducteurs.map(conducteur => (
                          <option key={conducteur.id} value={conducteur.id}>{displayConducteur(conducteur)}{conducteur.email ? ` · ${conducteur.email}` : ''}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Note gestionnaire</span>
                      <textarea
                        value={managerNote}
                        onChange={event => setManagerNote(event.target.value)}
                        disabled={!canManage}
                        rows={5}
                        className="w-full rounded-2xl border bg-transparent px-3 py-3 text-sm outline-none"
                        style={{ borderColor: 'var(--border)' }}
                        placeholder="Ex: reaffectation apres verification de la tournee ou du stationnement."
                      />
                    </label>

                    {canManage ? (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void handleRedirect()} className="rounded-2xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-medium text-white">
                          Notifier / rediriger
                        </button>
                        <button type="button" onClick={handleArchive} className="rounded-2xl border px-4 py-2.5 text-sm font-medium text-slate-700" style={{ borderColor: 'var(--border)' }}>
                          Archiver
                        </button>
                      </div>
                    ) : (
                      <p className="nx-status-warning rounded-2xl border border-amber-200 px-4 py-3 text-sm">
                        Cette vue est informative. La redirection et le classement restent reserves au gestionnaire.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="nx-panel px-6 py-16 text-center text-sm text-slate-400">
              Aucun dossier selectionne.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, detail, accent }: { label: string; value: string; detail: string; accent?: string }) {
  return (
    <div className="nx-panel px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold" style={accent ? { color: accent } : {}}>{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}
