import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { looseSupabase } from '@/lib/supabaseLoose'
import type { Tables, TablesInsert } from '@/lib/database.types'

type Remorque = Tables<'remorques'>
type RemorqueRow = Remorque & {
  numero_parc: string | null
  numero_carte_grise?: string | null
  vin?: string | null
  date_mise_en_circulation?: string | null
  date_achat?: string | null
  cout_achat_ht?: number | null
  type_propriete?: string | null
  garantie_expiration?: string | null
  contrat_entretien?: boolean | null
  prestataire_entretien?: string | null
  garage_entretien?: string | null
}
type RemorqueForm = TablesInsert<'remorques'> & {
  numero_carte_grise?: string | null
  vin?: string | null
  date_mise_en_circulation?: string | null
  date_achat?: string | null
  cout_achat_ht?: number | null
  type_propriete?: string | null
  garantie_expiration?: string | null
  contrat_entretien?: boolean | null
  prestataire_entretien?: string | null
  garage_entretien?: string | null
}
type FlotteDocument = {
  id: string
  category: string | null
  title: string
  file_name: string
  storage_bucket: string
  storage_path: string
  issued_at: string | null
  expires_at: string | null
  notes: string | null
}
type FlotteEntretien = Tables<'flotte_entretiens'>
type FlotteAlerte = {
  id: string
  asset_id: string | null
  asset_label?: string | null
  due_on: string | null
  label?: string | null
  alert_type?: string | null
  days_remaining?: number | null
}
type FlotteCoutMensuel = {
  month: string | null
  total_cout_ht: number | null
}
type RemorqueKm = {
  id: string
  remorque_id: string
  reading_date: string
  km_compteur: number
  source: string | null
  notes: string | null
}
type KmForm = {
  reading_date: string
  km_compteur: number
  source: string | null
  notes: string | null
}

const STATUT_COLORS: Record<string, string> = {
  disponible: 'bg-green-100 text-green-700',
  en_service: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-orange-100 text-orange-700',
  hs: 'bg-red-100 text-red-700',
  vendu: 'bg-slate-100 text-slate-500',
}

const STATUT_LABELS: Record<string, string> = {
  disponible: 'Disponible',
  en_service: 'En service',
  maintenance: 'Maintenance',
  hs: 'Hors service',
  vendu: 'Vendu',
}

const PROPERTY_TYPES = ['achat', 'location', 'credit_bail', 'leasing', 'autre'] as const
const PROPERTY_LABELS: Record<(typeof PROPERTY_TYPES)[number], string> = {
  achat: 'Achat',
  location: 'Location',
  credit_bail: 'Credit-bail',
  leasing: 'Leasing',
  autre: 'Autre',
}

const DOC_CATEGORIES = ['carte_grise', 'assurance', 'controle_technique', 'entretien', 'garantie', 'autre'] as const
const DOC_CATEGORY_LABELS: Record<(typeof DOC_CATEGORIES)[number], string> = {
  carte_grise: 'Carte grise',
  assurance: 'Assurance',
  controle_technique: 'Controle technique',
  entretien: 'Entretien',
  garantie: 'Garantie',
  autre: 'Autre',
}

const MAINTENANCE_TYPES = ['revision', 'pneus', 'freinage', 'controle_technique', 'reparation', 'autre'] as const
const MAINTENANCE_TYPE_LABELS: Record<(typeof MAINTENANCE_TYPES)[number], string> = {
  revision: 'Revision',
  pneus: 'Pneus',
  freinage: 'Freinage',
  controle_technique: 'Controle technique',
  reparation: 'Reparation',
  autre: 'Autre',
}

const EMPTY: RemorqueForm = {
  immatriculation: '',
  type_remorque: 'fourgon',
  marque: null,
  charge_utile_kg: null,
  longueur_m: null,
  numero_carte_grise: null,
  vin: null,
  date_mise_en_circulation: null,
  date_achat: null,
  cout_achat_ht: null,
  type_propriete: 'achat',
  garantie_expiration: null,
  ct_expiration: null,
  assurance_expiration: null,
  contrat_entretien: false,
  prestataire_entretien: null,
  garage_entretien: null,
  statut: 'disponible',
  notes: null,
  preferences: null,
}

const EMPTY_DOCUMENT = { category: 'autre', title: '', issued_at: '', expires_at: '', notes: '' }

const EMPTY_MAINTENANCE: TablesInsert<'flotte_entretiens'> = {
  maintenance_type: 'revision',
  service_date: new Date().toISOString().slice(0, 10),
  km_compteur: null,
  cout_ht: 0,
  cout_ttc: null,
  covered_by_contract: false,
  prestataire: null,
  garage: null,
  next_due_date: null,
  next_due_km: null,
  notes: null,
  invoice_document_id: null,
}

const EMPTY_KM: KmForm = {
  reading_date: new Date().toISOString().slice(0, 10),
  km_compteur: 0,
  source: null,
  notes: null,
}

function expColor(date: string | null) {
  if (!date) return 'text-slate-400'
  const delta = (new Date(date).getTime() - Date.now()) / 86400000
  return delta < 0 ? 'text-red-600 font-semibold' : delta < 60 ? 'text-orange-500 font-semibold' : 'text-slate-600'
}

function formatDate(date: string | null) {
  return date ? new Date(date).toLocaleDateString('fr-FR') : 'Non renseigne'
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Non renseigne'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
}

function formatKm(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Non renseigne'
  return `${value.toLocaleString('fr-FR')} km`
}

function countExpiringSoon(dates: Array<string | null>) {
  return dates.filter(date => {
    if (!date) return false
    const delta = (new Date(date).getTime() - Date.now()) / 86400000
    return delta >= 0 && delta < 60
  }).length
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function flotteFeatureError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback
  if (message.includes('flotte_') || message.includes('vue_alertes_flotte') || message.includes('vue_couts_flotte_mensuels') || message.includes('remorque_releves_km')) {
    return 'Le dossier flotte necessite la migration Supabase flotte avant utilisation.'
  }
  if (message.includes('Bucket not found')) return 'Le bucket Supabase `flotte-documents` est introuvable.'
  return message || fallback
}

function isMissingOptionalFlotteFeature(err: unknown) {
  const message = err instanceof Error
    ? err.message
    : typeof err === 'string'
      ? err
      : JSON.stringify(err)
  const normalized = message.toLowerCase()
  return (
    normalized.includes('vue_alertes_flotte')
    || normalized.includes('vue_couts_flotte_mensuels')
    || normalized.includes('flotte_documents')
    || normalized.includes('flotte_entretiens')
    || normalized.includes('remorque_releves_km')
    || normalized.includes('does not exist')
    || normalized.includes('could not find the table')
    || normalized.includes('pgrst205')
    || normalized.includes('42p01')
  )
}

function normalizePayload(form: RemorqueForm): RemorqueForm {
  return {
    ...form,
    immatriculation: form.immatriculation.trim().toUpperCase(),
    type_remorque: form.type_remorque?.trim() || 'fourgon',
    marque: form.marque?.trim() || null,
    numero_carte_grise: form.numero_carte_grise?.trim() || null,
    vin: form.vin?.trim().toUpperCase() || null,
    type_propriete: form.type_propriete?.trim() || null,
    prestataire_entretien: form.prestataire_entretien?.trim() || null,
    garage_entretien: form.garage_entretien?.trim() || null,
    notes: form.notes?.trim() || null,
    preferences: form.preferences?.trim() || null,
  }
}

export default function Remorques() {
  const { role } = useAuth()
  const canManageFleetAssets = role === 'mecanicien' || role === 'dirigeant'
  const [list, setList] = useState<RemorqueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<RemorqueForm>(EMPTY)
  const [numeroParc, setNumeroParc] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [globalAlerts, setGlobalAlerts] = useState<FlotteAlerte[]>([])
  const [latestKmByRemorque, setLatestKmByRemorque] = useState<Record<string, number>>({})
  const [documents, setDocuments] = useState<FlotteDocument[]>([])
  const [entretiens, setEntretiens] = useState<FlotteEntretien[]>([])
  const [kmReadings, setKmReadings] = useState<RemorqueKm[]>([])
  const [assetAlerts, setAssetAlerts] = useState<FlotteAlerte[]>([])
  const [costSeries, setCostSeries] = useState<FlotteCoutMensuel[]>([])
  const [dossierLoading, setDossierLoading] = useState(false)
  const [dossierError, setDossierError] = useState<string | null>(null)
  const [documentForm, setDocumentForm] = useState(EMPTY_DOCUMENT)
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [savingDocument, setSavingDocument] = useState(false)
  const [maintenanceForm, setMaintenanceForm] = useState<TablesInsert<'flotte_entretiens'>>(EMPTY_MAINTENANCE)
  const [savingMaintenance, setSavingMaintenance] = useState(false)
  const [kmForm, setKmForm] = useState<KmForm>(EMPTY_KM)
  const [savingKm, setSavingKm] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const remorquesRes = await looseSupabase.from('remorques').select('*').order('immatriculation')
      if (remorquesRes.error) throw remorquesRes.error
      const remorques = (remorquesRes.data ?? []) as unknown as RemorqueRow[]
      setList(remorques)

      const kmRes = await looseSupabase.from('remorque_releves_km').select('remorque_id, reading_date, km_compteur').order('reading_date', { ascending: false })
      if (kmRes.error && !isMissingOptionalFlotteFeature(kmRes.error)) throw kmRes.error
      const latestMap: Record<string, number> = {}
      ;(kmRes.data ?? []).forEach((row: { remorque_id: string; km_compteur: number }) => {
        if (latestMap[row.remorque_id] === undefined) latestMap[row.remorque_id] = Number(row.km_compteur)
      })
      setLatestKmByRemorque(latestMap)

      const alertsRes = await looseSupabase.from('vue_alertes_flotte').select('*').eq('asset_type', 'remorque')
      if (alertsRes.error) {
        setGlobalAlerts([])
        if (!isMissingOptionalFlotteFeature(alertsRes.error)) {
          setError(flotteFeatureError(alertsRes.error, 'Chargement partiel des remorques.'))
        }
      } else {
        setGlobalAlerts((alertsRes.data ?? []) as FlotteAlerte[])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const alertMap = useMemo(() => {
    const map = new Map<string, FlotteAlerte[]>()
    globalAlerts.forEach(alert => {
      if (!alert.asset_id) return
      const current = map.get(alert.asset_id) ?? []
      current.push(alert)
      map.set(alert.asset_id, current)
    })
    return map
  }, [globalAlerts])

  const filtered = list.filter(remorque => {
    const haystack = [
      remorque.immatriculation,
      remorque.type_remorque,
      remorque.marque,
      remorque.numero_carte_grise,
      remorque.vin,
      remorque.numero_parc,
      remorque.type_propriete,
      remorque.garage_entretien,
      remorque.prestataire_entretien,
      remorque.preferences,
      remorque.notes,
    ].filter(Boolean).join(' ').toLowerCase()

    return haystack.includes(search.toLowerCase().trim())
  })

  const stats = {
    disponibles: list.filter(item => item.statut === 'disponible').length,
    ctExpirent: countExpiringSoon(list.map(item => item.ct_expiration)),
    assuranceExpire: countExpiringSoon(list.map(item => item.assurance_expiration)),
    garantieExpire: countExpiringSoon(list.map(item => item.garantie_expiration)),
  }

  function resetFeedback() {
    setError(null)
    setNotice(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY)
    setNumeroParc('')
    setDocuments([])
    setEntretiens([])
    setKmReadings([])
    setAssetAlerts([])
    setCostSeries([])
    setDossierError(null)
    setDocumentForm(EMPTY_DOCUMENT)
    setDocumentFile(null)
    setMaintenanceForm(EMPTY_MAINTENANCE)
    setKmForm(EMPTY_KM)
  }

  function openCreate() {
    if (!canManageFleetAssets) {
      setError('Seuls les mecaniciens et dirigeants peuvent ajouter une remorque.')
      return
    }
    resetFeedback()
    closeForm()
    setShowForm(true)
  }

  function openEdit(remorque: RemorqueRow) {
    resetFeedback()
    setEditingId(remorque.id)
    setForm({
      immatriculation: remorque.immatriculation,
      type_remorque: remorque.type_remorque,
      marque: remorque.marque,
      charge_utile_kg: remorque.charge_utile_kg,
      longueur_m: remorque.longueur_m,
      numero_carte_grise: remorque.numero_carte_grise,
      vin: remorque.vin,
      date_mise_en_circulation: remorque.date_mise_en_circulation,
      date_achat: remorque.date_achat,
      cout_achat_ht: remorque.cout_achat_ht,
      type_propriete: remorque.type_propriete,
      garantie_expiration: remorque.garantie_expiration,
      ct_expiration: remorque.ct_expiration,
      assurance_expiration: remorque.assurance_expiration,
      contrat_entretien: remorque.contrat_entretien,
      prestataire_entretien: remorque.prestataire_entretien,
      garage_entretien: remorque.garage_entretien,
      statut: remorque.statut,
      notes: remorque.notes,
      preferences: remorque.preferences,
    })
    setNumeroParc(remorque.numero_parc ?? '')
    const currentKm = latestKmByRemorque[remorque.id] ?? 0
    setKmForm({ ...EMPTY_KM, km_compteur: currentKm })
    setMaintenanceForm({ ...EMPTY_MAINTENANCE, km_compteur: currentKm, next_due_km: currentKm > 0 ? currentKm + 30000 : null })
    setShowForm(true)
    void loadDossier(remorque.id)
  }

  function set<K extends keyof RemorqueForm>(key: K, value: RemorqueForm[K]) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function loadDossier(remorqueId: string) {
    setDossierLoading(true)
    setDossierError(null)
    try {
      const [documentsRes, entretiensRes, kmRes] = await Promise.all([
        looseSupabase.from('flotte_documents').select('*').eq('remorque_id', remorqueId).is('archived_at', null).order('created_at', { ascending: false }),
        supabase.from('flotte_entretiens').select('*').eq('remorque_id', remorqueId).order('service_date', { ascending: false }),
        looseSupabase.from('remorque_releves_km').select('*').eq('remorque_id', remorqueId).order('reading_date', { ascending: false }),
      ])
      if (documentsRes.error) throw documentsRes.error
      if (entretiensRes.error) throw entretiensRes.error
      if (kmRes.error && !isMissingOptionalFlotteFeature(kmRes.error)) throw kmRes.error

      setDocuments((documentsRes.data ?? []) as FlotteDocument[])
      setEntretiens(entretiensRes.data ?? [])
      const readings = (kmRes.data ?? []) as unknown as RemorqueKm[]
      setKmReadings(readings)
      if (readings.length > 0) {
        const latestKm = Number(readings[0].km_compteur)
        setKmForm(current => ({ ...current, km_compteur: latestKm }))
        setMaintenanceForm(current => ({ ...current, km_compteur: latestKm, next_due_km: current.next_due_km ?? latestKm + 30000 }))
      }

      const [alertsRes, costsRes] = await Promise.all([
        looseSupabase.from('vue_alertes_flotte').select('*').eq('asset_type', 'remorque').eq('asset_id', remorqueId).order('due_on', { ascending: true }),
        looseSupabase.from('vue_couts_flotte_mensuels').select('*').eq('asset_type', 'remorque').eq('asset_id', remorqueId).order('month', { ascending: true }),
      ])
      setAssetAlerts(alertsRes.error ? [] : ((alertsRes.data ?? []) as FlotteAlerte[]))
      setCostSeries(costsRes.error ? [] : ((costsRes.data ?? []) as FlotteCoutMensuel[]))
      if (alertsRes.error || costsRes.error) {
        setDossierError('Le dossier remorque est charge partiellement. Les vues d alertes ou de couts ne sont pas encore disponibles.')
      }
    } catch (err) {
      setDocuments([])
      setEntretiens([])
      setKmReadings([])
      setAssetAlerts([])
      setCostSeries([])
      setDossierError(flotteFeatureError(err, 'Chargement du dossier remorque impossible.'))
    } finally {
      setDossierLoading(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    resetFeedback()
    const payload = normalizePayload(form)
    if (!payload.immatriculation) {
      setError('Immatriculation obligatoire.')
      return
    }
    if (!editingId && !canManageFleetAssets) {
      setError('Seuls les mecaniciens et dirigeants peuvent ajouter une remorque.')
      return
    }
    setSaving(true)
    try {
      const payloadWithParc = { ...payload, numero_parc: numeroParc.trim() || null }
      const query = editingId
        ? looseSupabase.from('remorques').update(payloadWithParc).eq('id', editingId)
        : looseSupabase.from('remorques').insert(payloadWithParc)
      const { error: saveError } = await query
      if (saveError) throw saveError
      setNotice(editingId ? 'Remorque mise a jour.' : 'Remorque ajoutee.')
      closeForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function del(id: string) {
    resetFeedback()
    if (!canManageFleetAssets) {
      setError('Seuls les mecaniciens et dirigeants peuvent supprimer une remorque.')
      return
    }
    if (!confirm('Supprimer cette remorque ?')) return
    try {
      const { error: deleteError } = await supabase.from('remorques').delete().eq('id', id)
      if (deleteError) throw deleteError
      setNotice('Remorque supprimee.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.')
    }
  }

  async function saveDocument(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId || !documentFile) return
    setSavingDocument(true)
    setDossierError(null)
    const safeName = sanitizeFilename(documentFile.name)
    const storagePath = `${editingId}/${Date.now()}-${safeName}`
    try {
      const { error: uploadError } = await supabase.storage.from('flotte-documents').upload(storagePath, documentFile, { contentType: documentFile.type || 'application/pdf', upsert: false })
      if (uploadError) throw uploadError
      const { error: insertError } = await looseSupabase.from('flotte_documents').insert({
        vehicule_id: null,
        remorque_id: editingId,
        category: documentForm.category,
        title: documentForm.title.trim() || documentFile.name,
        file_name: documentFile.name,
        mime_type: documentFile.type || 'application/pdf',
        storage_bucket: 'flotte-documents',
        storage_path: storagePath,
        issued_at: documentForm.issued_at || null,
        expires_at: documentForm.expires_at || null,
        notes: documentForm.notes.trim() || null,
      })
      if (insertError) throw insertError
      setNotice('Document remorque televerse.')
      setDocumentForm(EMPTY_DOCUMENT)
      setDocumentFile(null)
      await loadDossier(editingId)
    } catch (err) {
      setDossierError(flotteFeatureError(err, 'Televersement du document remorque impossible.'))
    } finally {
      setSavingDocument(false)
    }
  }

  async function archiveDocument(id: string) {
    if (!editingId) return
    try {
      const { error: updateError } = await looseSupabase.from('flotte_documents').update({ archived_at: new Date().toISOString() }).eq('id', id)
      if (updateError) throw updateError
      setNotice('Document remorque archive.')
      await loadDossier(editingId)
    } catch (err) {
      setDossierError(flotteFeatureError(err, 'Archivage du document remorque impossible.'))
    }
  }

  async function openDocument(document: FlotteDocument) {
    try {
      const { data, error: urlError } = await supabase.storage.from(document.storage_bucket).createSignedUrl(document.storage_path, 60)
      if (urlError) throw urlError
      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setDossierError(flotteFeatureError(err, 'Ouverture du document remorque impossible.'))
    }
  }

  async function saveMaintenance(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setSavingMaintenance(true)
    setDossierError(null)
    try {
      const payload: TablesInsert<'flotte_entretiens'> = {
        vehicule_id: null,
        remorque_id: editingId,
        maintenance_type: maintenanceForm.maintenance_type,
        service_date: maintenanceForm.service_date,
        km_compteur: maintenanceForm.km_compteur ?? null,
        cout_ht: maintenanceForm.cout_ht ?? 0,
        cout_ttc: maintenanceForm.cout_ttc ?? null,
        covered_by_contract: maintenanceForm.covered_by_contract ?? false,
        prestataire: maintenanceForm.prestataire?.trim() || null,
        garage: maintenanceForm.garage?.trim() || null,
        next_due_date: maintenanceForm.next_due_date || null,
        next_due_km: maintenanceForm.next_due_km ?? null,
        notes: maintenanceForm.notes?.trim() || null,
        invoice_document_id: maintenanceForm.invoice_document_id || null,
      }
      const { error: insertError } = await supabase.from('flotte_entretiens').insert(payload)
      if (insertError) throw insertError
      setNotice('Entretien remorque enregistre.')
      setMaintenanceForm(EMPTY_MAINTENANCE)
      await loadDossier(editingId)
    } catch (err) {
      setDossierError(flotteFeatureError(err, 'Enregistrement entretien remorque impossible.'))
    } finally {
      setSavingMaintenance(false)
    }
  }

  async function deleteMaintenance(id: string) {
    if (!editingId) return
    try {
      const { error: deleteError } = await supabase.from('flotte_entretiens').delete().eq('id', id)
      if (deleteError) throw deleteError
      setNotice('Entretien remorque supprime.')
      await loadDossier(editingId)
    } catch (err) {
      setDossierError(flotteFeatureError(err, 'Suppression entretien remorque impossible.'))
    }
  }

  async function saveKmReading(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    if (!kmForm.reading_date || !Number.isFinite(kmForm.km_compteur) || kmForm.km_compteur <= 0) {
      setDossierError('Renseignez une date et un kilometre valide pour le releve.')
      return
    }
    setSavingKm(true)
    setDossierError(null)
    try {
      const { error: insertError } = await looseSupabase.from('remorque_releves_km').upsert({
        remorque_id: editingId,
        reading_date: kmForm.reading_date,
        km_compteur: Math.trunc(kmForm.km_compteur),
        source: kmForm.source?.trim() || null,
        notes: kmForm.notes?.trim() || null,
      }, { onConflict: 'remorque_id,reading_date' })
      if (insertError) throw insertError
      setNotice('Releve kilometrique enregistre.')
      await loadDossier(editingId)
      await load()
    } catch (err) {
      setDossierError(flotteFeatureError(err, 'Enregistrement du releve kilometrique impossible.'))
    } finally {
      setSavingKm(false)
    }
  }

  async function deleteKmReading(id: string) {
    if (!editingId) return
    try {
      const { error: deleteError } = await looseSupabase.from('remorque_releves_km').delete().eq('id', id)
      if (deleteError) throw deleteError
      setNotice('Releve kilometrique supprime.')
      await loadDossier(editingId)
      await load()
    } catch (err) {
      setDossierError(flotteFeatureError(err, 'Suppression du releve kilometrique impossible.'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Remorques</h2>
          <p className="text-slate-500 text-sm">{list.length} remorque{list.length !== 1 ? 's' : ''}</p>
        </div>
        {canManageFleetAssets && <button onClick={openCreate} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">+ Ajouter</button>}
      </div>

      {(error || notice) && <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error ?? notice}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Disponibles" value={stats.disponibles} tone="emerald" />
        <StatCard label="CT < 60 j" value={stats.ctExpirent} tone="amber" />
        <StatCard label="Assurance < 60 j" value={stats.assuranceExpire} tone="amber" />
        <StatCard label="Garantie < 60 j" value={stats.garantieExpire} tone="amber" />
      </div>

      <input type="text" placeholder="Immatriculation, type, VIN, garage..." value={search} onChange={e => setSearch(e.target.value)} className="mb-4 px-3 py-2 border border-slate-200 rounded-lg text-sm w-full max-w-md outline-none focus:ring-2 focus:ring-slate-300" />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">{search ? 'Aucun resultat' : 'Aucune remorque enregistree'}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Remorque', 'Administratif', 'Entretien / km', 'Statut', ''].map(header => <th key={header} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((remorque, index) => {
                const alerts = alertMap.get(remorque.id) ?? []
                return (
                  <tr key={remorque.id} className={`border-t border-slate-100 ${index % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium font-mono text-slate-800">{remorque.immatriculation}</div>
                      {remorque.numero_parc && <div className="text-xs text-slate-500">Parc: {remorque.numero_parc}</div>}
                      <div className="text-xs text-slate-400">{remorque.type_remorque} {remorque.marque ? `· ${remorque.marque}` : ''}</div>
                      {remorque.longueur_m !== null && <div className="text-xs text-slate-400">Longueur: {remorque.longueur_m} m</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`text-xs ${expColor(remorque.ct_expiration)}`}>CT: {formatDate(remorque.ct_expiration)}</div>
                      <div className={`text-xs ${expColor(remorque.assurance_expiration)}`}>Assurance: {formatDate(remorque.assurance_expiration)}</div>
                      <div className="text-xs text-slate-400">Carte grise: {remorque.numero_carte_grise ?? 'Non renseignee'}</div>
                      {alerts.length > 0 && <div className="mt-1 text-xs text-amber-600">{alerts.length} alerte{alerts.length > 1 ? 's' : ''}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-600">{PROPERTY_LABELS[(remorque.type_propriete as (typeof PROPERTY_TYPES)[number]) ?? 'autre'] ?? (remorque.type_propriete ?? 'Non renseigne')}</div>
                      <div className="text-xs text-slate-400">Achat: {formatCurrency(remorque.cout_achat_ht)}</div>
                      <div className="text-xs text-slate-400">Km suivi: {formatKm(latestKmByRemorque[remorque.id])}</div>
                      <div className="text-xs text-slate-400">Garage: {remorque.garage_entretien ?? 'Non renseigne'}</div>
                      <div className="text-xs text-slate-400">{remorque.contrat_entretien ? 'Contrat entretien actif' : 'Sans contrat entretien'}</div>
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUT_COLORS[remorque.statut] ?? 'bg-slate-100 text-slate-600'}`}>{STATUT_LABELS[remorque.statut] ?? remorque.statut}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => openEdit(remorque)} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">Modifier</button>
                        {canManageFleetAssets && <button onClick={() => void del(remorque.id)} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Suppr.</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">{editingId ? 'Modifier une remorque' : 'Ajouter une remorque'}</h3>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">x</button>
            </div>

            <form onSubmit={submit} className="p-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="space-y-4">
                  <SectionTitle title="Identification" subtitle="Immatriculation, type, carte grise, VIN et dimensions." />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Immatriculation *"><input className={inp} value={form.immatriculation} onChange={e => set('immatriculation', e.target.value.toUpperCase())} required /></Field>
                    <Field label="Numero de parc"><input className={inp} value={numeroParc} onChange={e => setNumeroParc(e.target.value)} /></Field>
                    <Field label="Type remorque"><input className={inp} value={form.type_remorque ?? ''} onChange={e => set('type_remorque', e.target.value || 'fourgon')} /></Field>
                    <Field label="Marque"><input className={inp} value={form.marque ?? ''} onChange={e => set('marque', e.target.value || null)} /></Field>
                    <Field label="Charge utile (kg)"><input className={inp} type="number" value={form.charge_utile_kg ?? ''} onChange={e => set('charge_utile_kg', e.target.value ? Number.parseInt(e.target.value, 10) : null)} /></Field>
                    <Field label="Longueur (m)"><input className={inp} type="number" step="0.1" value={form.longueur_m ?? ''} onChange={e => set('longueur_m', e.target.value ? Number.parseFloat(e.target.value) : null)} /></Field>
                    <Field label="Numero carte grise"><input className={inp} value={form.numero_carte_grise ?? ''} onChange={e => set('numero_carte_grise', e.target.value || null)} /></Field>
                    <Field label="VIN"><input className={inp} value={form.vin ?? ''} onChange={e => set('vin', e.target.value || null)} /></Field>
                    <Field label="Mise en circulation"><input className={inp} type="date" value={form.date_mise_en_circulation ?? ''} onChange={e => set('date_mise_en_circulation', e.target.value || null)} /></Field>
                    <Field label="Statut">
                      <select className={inp} value={form.statut ?? 'disponible'} onChange={e => set('statut', e.target.value)}>
                        {Object.entries(STATUT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                <div className="space-y-4">
                  <SectionTitle title="Achat et entretien" subtitle="Propriete, garantie, CT, assurance et contrat entretien." />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Date achat"><input className={inp} type="date" value={form.date_achat ?? ''} onChange={e => set('date_achat', e.target.value || null)} /></Field>
                    <Field label="Cout achat HT"><input className={inp} type="number" step="0.01" value={form.cout_achat_ht ?? ''} onChange={e => set('cout_achat_ht', e.target.value ? Number.parseFloat(e.target.value) : null)} /></Field>
                    <Field label="Type propriete">
                      <select className={inp} value={form.type_propriete ?? 'achat'} onChange={e => set('type_propriete', e.target.value)}>
                        {PROPERTY_TYPES.map(type => <option key={type} value={type}>{PROPERTY_LABELS[type]}</option>)}
                      </select>
                    </Field>
                    <Field label="Garantie jusqu'au"><input className={inp} type="date" value={form.garantie_expiration ?? ''} onChange={e => set('garantie_expiration', e.target.value || null)} /></Field>
                    <Field label="Expiration CT"><input className={inp} type="date" value={form.ct_expiration ?? ''} onChange={e => set('ct_expiration', e.target.value || null)} /></Field>
                    <Field label="Expiration assurance"><input className={inp} type="date" value={form.assurance_expiration ?? ''} onChange={e => set('assurance_expiration', e.target.value || null)} /></Field>
                    <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={form.contrat_entretien ?? false} onChange={e => set('contrat_entretien', e.target.checked)} />
                      Contrat entretien actif
                    </label>
                    <Field label="Prestataire entretien"><input className={inp} value={form.prestataire_entretien ?? ''} onChange={e => set('prestataire_entretien', e.target.value || null)} /></Field>
                    <Field label="Garage entretien"><input className={inp} value={form.garage_entretien ?? ''} onChange={e => set('garage_entretien', e.target.value || null)} /></Field>
                  </div>

                  <SectionTitle title="Specificites" subtitle="Bloc-notes et preferences." />
                  <Field label="Notes"><textarea className={`${inp} resize-none`} rows={3} value={form.notes ?? ''} onChange={e => set('notes', e.target.value || null)} /></Field>
                  <Field label="Preferences"><textarea className={`${inp} resize-none`} rows={3} value={form.preferences ?? ''} onChange={e => set('preferences', e.target.value || null)} /></Field>
                </div>
              </div>

              {editingId && (
                <div className="mt-8 border-t pt-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Dossier remorque</p>
                      <p className="text-xs text-slate-400">Documents PDF, entretiens, alertes et couts.</p>
                    </div>
                    {dossierLoading && <span className="text-xs text-slate-400">Chargement...</span>}
                  </div>

                  {dossierError && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{dossierError}</div>}

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard label="Alertes ouvertes" value={assetAlerts.length} tone="amber" />
                    <StatCard label="Documents actifs" value={documents.length} tone="slate" />
                    <StatCard label="Entretiens" value={entretiens.length} tone="slate" />
                    <StatCard label="Km courant" value={formatKm(kmReadings[0]?.km_compteur ?? latestKmByRemorque[editingId] ?? null)} tone="slate" />
                  </div>

                  <ChartPanel
                    title="Graphique couts entretien"
                    subtitle="Couts HT par mois"
                    emptyText="Aucun cout enregistre."
                    items={costSeries.map(item => ({ label: new Date(item.month ?? '').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }), value: Number(item.total_cout_ht ?? 0), formatted: formatCurrency(item.total_cout_ht) }))}
                  />

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-sm font-semibold text-slate-800">Documents PDF</h4>
                      <form onSubmit={saveDocument} className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Categorie">
                            <select className={inp} value={documentForm.category} onChange={e => setDocumentForm(current => ({ ...current, category: e.target.value }))}>
                              {DOC_CATEGORIES.map(category => <option key={category} value={category}>{DOC_CATEGORY_LABELS[category]}</option>)}
                            </select>
                          </Field>
                          <Field label="Titre"><input className={inp} value={documentForm.title} onChange={e => setDocumentForm(current => ({ ...current, title: e.target.value }))} /></Field>
                          <Field label="Date emission"><input className={inp} type="date" value={documentForm.issued_at} onChange={e => setDocumentForm(current => ({ ...current, issued_at: e.target.value }))} /></Field>
                          <Field label="Expiration"><input className={inp} type="date" value={documentForm.expires_at} onChange={e => setDocumentForm(current => ({ ...current, expires_at: e.target.value }))} /></Field>
                        </div>
                        <Field label="Fichier PDF"><input className={inp} type="file" accept="application/pdf" onChange={e => setDocumentFile(e.target.files?.[0] ?? null)} required /></Field>
                        <Field label="Notes"><textarea className={`${inp} resize-none`} rows={3} value={documentForm.notes} onChange={e => setDocumentForm(current => ({ ...current, notes: e.target.value }))} /></Field>
                        <div className="flex justify-end"><button type="submit" disabled={savingDocument || !documentFile} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50">{savingDocument ? 'Televersement...' : 'Ajouter document'}</button></div>
                      </form>

                      <div className="mt-4 space-y-2">
                        {documents.length === 0 ? <p className="text-xs text-slate-400">Aucun document remorque enregistre.</p> : documents.map(document => (
                          <div key={document.id} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium text-slate-800">{document.title}</div>
                                <div className="text-xs text-slate-400">{DOC_CATEGORY_LABELS[(document.category as (typeof DOC_CATEGORIES)[number]) ?? 'autre'] ?? document.category} · {document.file_name}</div>
                                {document.expires_at && <div className={`text-xs ${expColor(document.expires_at)}`}>Expiration {formatDate(document.expires_at)}</div>}
                              </div>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => void openDocument(document)} className="text-xs text-slate-400 hover:text-slate-700">Ouvrir</button>
                                <button type="button" onClick={() => void archiveDocument(document.id)} className="text-xs text-slate-400 hover:text-red-500">Archiver</button>
                              </div>
                            </div>
                            {document.notes && <p className="mt-2 text-xs text-slate-500 whitespace-pre-line">{document.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-sm font-semibold text-slate-800">Releves kilometriques</h4>
                      <form onSubmit={saveKmReading} className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Date releve"><input className={inp} type="date" value={kmForm.reading_date} onChange={e => setKmForm(current => ({ ...current, reading_date: e.target.value }))} required /></Field>
                          <Field label="Kilometrage compteur"><input className={inp} type="number" min={0} value={kmForm.km_compteur} onChange={e => setKmForm(current => ({ ...current, km_compteur: Number.parseInt(e.target.value || '0', 10) }))} required /></Field>
                          <Field label="Source"><input className={inp} value={kmForm.source ?? ''} onChange={e => setKmForm(current => ({ ...current, source: e.target.value || null }))} placeholder="Atelier, controle, chauffeur..." /></Field>
                          <Field label="Notes"><input className={inp} value={kmForm.notes ?? ''} onChange={e => setKmForm(current => ({ ...current, notes: e.target.value || null }))} placeholder="Commentaire optionnel" /></Field>
                        </div>
                        <div className="flex justify-end">
                          <button type="submit" disabled={savingKm} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50">{savingKm ? 'Enregistrement...' : 'Ajouter releve km'}</button>
                        </div>
                      </form>

                      <div className="mt-4 space-y-2">
                        {kmReadings.length === 0 ? <p className="text-xs text-slate-400">Aucun releve kilometrique enregistre.</p> : kmReadings.map(reading => (
                          <div key={reading.id} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium text-slate-800">{formatKm(reading.km_compteur)}</div>
                                <div className="text-xs text-slate-400">{formatDate(reading.reading_date)}{reading.source ? ` · ${reading.source}` : ''}</div>
                              </div>
                              <button type="button" onClick={() => void deleteKmReading(reading.id)} className="text-xs text-slate-400 hover:text-red-500">Suppr.</button>
                            </div>
                            {reading.notes && <p className="mt-2 text-xs text-slate-500 whitespace-pre-line">{reading.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-sm font-semibold text-slate-800">Entretien et couts</h4>
                      <form onSubmit={saveMaintenance} className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Type entretien">
                            <select className={inp} value={maintenanceForm.maintenance_type ?? 'revision'} onChange={e => setMaintenanceForm(current => ({ ...current, maintenance_type: e.target.value }))}>
                              {MAINTENANCE_TYPES.map(type => <option key={type} value={type}>{MAINTENANCE_TYPE_LABELS[type]}</option>)}
                            </select>
                          </Field>
                          <Field label="Date intervention"><input className={inp} type="date" value={maintenanceForm.service_date ?? ''} onChange={e => setMaintenanceForm(current => ({ ...current, service_date: e.target.value }))} required /></Field>
                          <Field label="Cout HT"><input className={inp} type="number" step="0.01" value={maintenanceForm.cout_ht ?? 0} onChange={e => setMaintenanceForm(current => ({ ...current, cout_ht: e.target.value ? Number.parseFloat(e.target.value) : 0 }))} /></Field>
                          <Field label="Cout TTC"><input className={inp} type="number" step="0.01" value={maintenanceForm.cout_ttc ?? ''} onChange={e => setMaintenanceForm(current => ({ ...current, cout_ttc: e.target.value ? Number.parseFloat(e.target.value) : null }))} /></Field>
                          <Field label="Facture PDF">
                            <select className={inp} value={maintenanceForm.invoice_document_id ?? ''} onChange={e => setMaintenanceForm(current => ({ ...current, invoice_document_id: e.target.value || null }))}>
                              <option value="">Aucune facture liee</option>
                              {documents.map(document => <option key={document.id} value={document.id}>{document.title}</option>)}
                            </select>
                          </Field>
                          <Field label="Prestataire"><input className={inp} value={maintenanceForm.prestataire ?? ''} onChange={e => setMaintenanceForm(current => ({ ...current, prestataire: e.target.value || null }))} /></Field>
                          <Field label="Garage"><input className={inp} value={maintenanceForm.garage ?? ''} onChange={e => setMaintenanceForm(current => ({ ...current, garage: e.target.value || null }))} /></Field>
                          <Field label="Prochaine echeance"><input className={inp} type="date" value={maintenanceForm.next_due_date ?? ''} onChange={e => setMaintenanceForm(current => ({ ...current, next_due_date: e.target.value || null }))} /></Field>
                          <Field label="Km au moment entretien"><input className={inp} type="number" min={0} value={maintenanceForm.km_compteur ?? ''} onChange={e => setMaintenanceForm(current => ({ ...current, km_compteur: e.target.value ? Number.parseInt(e.target.value, 10) : null }))} /></Field>
                          <Field label="Prochaine echeance km"><input className={inp} type="number" min={0} value={maintenanceForm.next_due_km ?? ''} onChange={e => setMaintenanceForm(current => ({ ...current, next_due_km: e.target.value ? Number.parseInt(e.target.value, 10) : null }))} /></Field>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input type="checkbox" checked={maintenanceForm.covered_by_contract ?? false} onChange={e => setMaintenanceForm(current => ({ ...current, covered_by_contract: e.target.checked }))} />
                          Pris en charge par contrat entretien
                        </label>
                        <Field label="Notes"><textarea className={`${inp} resize-none`} rows={3} value={maintenanceForm.notes ?? ''} onChange={e => setMaintenanceForm(current => ({ ...current, notes: e.target.value || null }))} /></Field>
                        <div className="flex justify-end"><button type="submit" disabled={savingMaintenance} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50">{savingMaintenance ? 'Enregistrement...' : 'Ajouter entretien'}</button></div>
                      </form>

                      <div className="mt-4 space-y-2">
                        {entretiens.length === 0 ? <p className="text-xs text-slate-400">Aucun entretien enregistre.</p> : entretiens.map(entretien => (
                          <div key={entretien.id} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium text-slate-800">{MAINTENANCE_TYPE_LABELS[(entretien.maintenance_type as (typeof MAINTENANCE_TYPES)[number]) ?? 'autre'] ?? entretien.maintenance_type}</div>
                                <div className="text-xs text-slate-400">{formatDate(entretien.service_date)} · {formatCurrency(entretien.cout_ht)}{typeof entretien.km_compteur === 'number' ? ` · ${formatKm(entretien.km_compteur)}` : ''}</div>
                                {entretien.next_due_date && <div className="text-xs text-slate-400">Prochaine echeance: {formatDate(entretien.next_due_date)}</div>}
                                {typeof entretien.next_due_km === 'number' && <div className="text-xs text-slate-400">Prochaine echeance km: {formatKm(entretien.next_due_km)}</div>}
                              </div>
                              <button type="button" onClick={() => void deleteMaintenance(entretien.id)} className="text-xs text-slate-400 hover:text-red-500">Suppr.</button>
                            </div>
                            {(entretien.prestataire || entretien.garage || entretien.notes) && <p className="mt-2 text-xs text-slate-500 whitespace-pre-line">{[entretien.prestataire, entretien.garage, entretien.notes].filter(Boolean).join(' · ')}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-sm font-semibold text-slate-800">Alertes remorque</h4>
                    <div className="mt-4 space-y-2">
                      {assetAlerts.length === 0 ? <p className="text-xs text-slate-400">Aucune alerte active.</p> : assetAlerts.map(alert => (
                        <div key={alert.id ?? `${alert.alert_type}-${alert.due_on}`} className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="text-sm font-medium text-slate-800">{alert.label ?? alert.alert_type}</div>
                          <div className={`text-xs ${expColor(alert.due_on)}`}>{formatDate(alert.due_on)}{typeof alert.days_remaining === 'number' ? ` · ${alert.days_remaining} j` : ''}</div>
                          <div className="text-xs text-slate-400">{alert.asset_label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={closeForm} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">{saving ? 'Enregistrement...' : editingId ? 'Sauvegarder' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const inp = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary-soft)]'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: number | string; tone: 'emerald' | 'amber' | 'slate' }) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <div className="text-xs uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-t pt-4 first:border-t-0 first:pt-0">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  )
}

function ChartPanel({
  title,
  subtitle,
  emptyText,
  items,
}: {
  title: string
  subtitle: string
  emptyText: string
  items: Array<{ label: string; value: number; formatted: string }>
}) {
  const max = Math.max(...items.map(item => item.value), 0)
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      {items.length === 0 ? (
        <p className="mt-4 text-xs text-slate-400">{emptyText}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map(item => (
            <div key={`${item.label}-${item.formatted}`} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{item.label}</span>
                <span>{item.formatted}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-slate-700" style={{ width: `${max > 0 ? Math.max((item.value / max) * 100, 4) : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
