import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { looseSupabase } from '@/lib/supabaseLoose'
import { listAssets } from '@/lib/services/assetsService'
import type { Tables, TablesInsert } from '@/lib/database.types'
import FlotteAmortissements from '@/components/flotte/FlotteAmortissements'

type Vehicule = Tables<'vehicules'>
type VehiculeRow = Vehicule & {
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
type VehiculeForm = TablesInsert<'vehicules'> & {
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
type VehiculeKm = {
  id: string
  vehicule_id: string
  reading_date: string
  km_compteur: number
  source: string | null
  notes: string | null
}
type FlotteAlerte = {
  id: string | null
  asset_id: string | null
  asset_label: string | null
  alert_type: string | null
  days_remaining: number | null
  due_on: string | null
}
type FlotteCoutMensuel = {
  month: string | null
  total_cout_ht: number | null
}
type VehiculeCoutKm = {
  month: string | null
  cout_km_ht: number | null
}
type KmForm = {
  reading_date: string
  km_compteur: number
  source: string | null
  notes: string | null
}

const TYPE_LABELS: Record<string, string> = {
  tracteur: 'Tracteur',
  porteur: 'Porteur',
  semi: 'Semi-remorque',
  remorque: 'Remorque',
  utilitaire: 'Utilitaire',
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

const DOC_CATEGORIES = ['carte_grise', 'assurance', 'controle_technique', 'entretien', 'garantie', 'tachygraphe', 'autre'] as const
const DOC_CATEGORY_LABELS: Record<(typeof DOC_CATEGORIES)[number], string> = {
  carte_grise: 'Carte grise',
  assurance: 'Assurance',
  controle_technique: 'Controle technique',
  entretien: 'Entretien',
  garantie: 'Garantie',
  tachygraphe: 'Tachygraphe',
  autre: 'Autre',
}

const MAINTENANCE_TYPES = ['revision', 'pneus', 'freinage', 'vidange', 'controle_technique', 'reparation', 'tachygraphe', 'autre'] as const
const MAINTENANCE_TYPE_LABELS: Record<(typeof MAINTENANCE_TYPES)[number], string> = {
  revision: 'Revision',
  pneus: 'Pneus',
  freinage: 'Freinage',
  vidange: 'Vidange',
  controle_technique: 'Controle technique',
  reparation: 'Reparation',
  tachygraphe: 'Tachygraphe',
  autre: 'Autre',
}

const EMPTY: VehiculeForm = {
  immatriculation: '',
  marque: null,
  modele: null,
  annee: null,
  type_vehicule: 'tracteur',
  ptac_kg: null,
  numero_carte_grise: null,
  vin: null,
  date_mise_en_circulation: null,
  date_achat: null,
  cout_achat_ht: null,
  type_propriete: 'achat',
  garantie_expiration: null,
  ct_expiration: null,
  assurance_expiration: null,
  vignette_expiration: null,
  tachy_serie: null,
  tachy_etalonnage_prochain: null,
  contrat_entretien: false,
  prestataire_entretien: null,
  garage_entretien: null,
  km_actuel: 0,
  statut: 'disponible',
  notes: null,
  preferences: null,
}

const EMPTY_DOCUMENT = {
  category: 'autre',
  title: '',
  issued_at: '',
  expires_at: '',
  notes: '',
}

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

function monthLabel(date: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

function flotteFeatureError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback
  if (message.includes('flotte_') || message.includes('vehicule_releves_km') || message.includes('vue_cout') || message.includes('vue_alertes_flotte')) {
    return 'Le dossier flotte necessite la migration Supabase flotte avant utilisation.'
  }
  if (message.includes('Bucket not found')) {
    return 'Le bucket Supabase `flotte-documents` est introuvable.'
  }
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
    || normalized.includes('vue_cout_kilometrique_vehicules')
    || normalized.includes('flotte_documents')
    || normalized.includes('flotte_entretiens')
    || normalized.includes('vehicule_releves_km')
    || normalized.includes('does not exist')
    || normalized.includes('could not find the table')
    || normalized.includes('pgrst205')
    || normalized.includes('42p01')
  )
}

function normalizeVehiculePayload(form: VehiculeForm): VehiculeForm {
  return {
    ...form,
    immatriculation: form.immatriculation.trim().toUpperCase(),
    marque: form.marque?.trim() || null,
    modele: form.modele?.trim() || null,
    numero_carte_grise: form.numero_carte_grise?.trim() || null,
    vin: form.vin?.trim().toUpperCase() || null,
    type_propriete: form.type_propriete?.trim() || null,
    prestataire_entretien: form.prestataire_entretien?.trim() || null,
    garage_entretien: form.garage_entretien?.trim() || null,
    notes: form.notes?.trim() || null,
    preferences: form.preferences?.trim() || null,
  }
}

export default function Vehicules() {
  const { role } = useAuth()
  const canManageFleetAssets = role === 'mecanicien' || role === 'dirigeant'
  const [list, setList] = useState<VehiculeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<VehiculeForm>(EMPTY)
  const [numeroParc, setNumeroParc] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [globalAlerts, setGlobalAlerts] = useState<FlotteAlerte[]>([])

  const [documents, setDocuments] = useState<FlotteDocument[]>([])
  const [entretiens, setEntretiens] = useState<FlotteEntretien[]>([])
  const [kmReadings, setKmReadings] = useState<VehiculeKm[]>([])
  const [assetAlerts, setAssetAlerts] = useState<FlotteAlerte[]>([])
  const [costSeries, setCostSeries] = useState<FlotteCoutMensuel[]>([])
  const [costKmSeries, setCostKmSeries] = useState<VehiculeCoutKm[]>([])
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
      const vehiculesRes = await looseSupabase.from('vehicules').select('*').order('immatriculation')
      if (vehiculesRes.error) throw vehiculesRes.error
      const legacyVehicules = ((vehiculesRes.data ?? []) as unknown as VehiculeRow[])

      if (legacyVehicules.length > 0) {
        setList(legacyVehicules)
      } else {
        const assets = await listAssets()
        const fallbackVehicules = assets
          .filter(asset => asset.type === 'vehicle')
          .map(asset => ({
            id: asset.legacy_vehicule_id ?? asset.id,
            immatriculation: asset.registration ?? '-',
            marque: null,
            modele: null,
            annee: null,
            type_vehicule: 'tracteur',
            ptac_kg: null,
            ct_expiration: null,
            assurance_expiration: null,
            vignette_expiration: null,
            tachy_serie: null,
            tachy_etalonnage_prochain: null,
            statut: asset.status ?? 'disponible',
            notes: null,
            preferences: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            km_actuel: 0,
            numero_parc: asset.fleet_number ?? null,
          })) as unknown as VehiculeRow[]

        setList(fallbackVehicules)
      }

      const alertsRes = await looseSupabase.from('vue_alertes_flotte').select('*').eq('asset_type', 'vehicule')
      if (alertsRes.error) {
        setGlobalAlerts([])
        if (!isMissingOptionalFlotteFeature(alertsRes.error)) {
          setError(flotteFeatureError(alertsRes.error, 'Chargement partiel du parc.'))
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

  useEffect(() => {
    void load()
  }, [])

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

  const filtered = list.filter(vehicle => {
    const haystack = [
      vehicle.immatriculation,
      vehicle.marque,
      vehicle.modele,
      vehicle.numero_carte_grise,
      vehicle.vin,
      vehicle.numero_parc,
      vehicle.type_propriete,
      vehicle.prestataire_entretien,
      vehicle.garage_entretien,
      vehicle.preferences,
      vehicle.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(search.toLowerCase().trim())
  })

  const stats = {
    disponibles: list.filter(vehicle => vehicle.statut === 'disponible').length,
    ctExpirent: countExpiringSoon(list.map(vehicle => vehicle.ct_expiration)),
    assuranceExpire: countExpiringSoon(list.map(vehicle => vehicle.assurance_expiration)),
    garantieExpire: countExpiringSoon(list.map(vehicle => vehicle.garantie_expiration)),
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
    setCostKmSeries([])
    setDossierError(null)
    setDocumentForm(EMPTY_DOCUMENT)
    setDocumentFile(null)
    setMaintenanceForm(EMPTY_MAINTENANCE)
    setKmForm(EMPTY_KM)
  }

  function openCreate() {
    if (!canManageFleetAssets) {
      setError('Seuls les mecaniciens et dirigeants peuvent ajouter un vehicule.')
      return
    }
    resetFeedback()
    closeForm()
    setShowForm(true)
  }

  function openEdit(vehicle: VehiculeRow) {
    resetFeedback()
    setEditingId(vehicle.id)
    setForm({
      immatriculation: vehicle.immatriculation,
      marque: vehicle.marque,
      modele: vehicle.modele,
      annee: vehicle.annee,
      type_vehicule: vehicle.type_vehicule,
      ptac_kg: vehicle.ptac_kg,
      numero_carte_grise: vehicle.numero_carte_grise,
      vin: vehicle.vin,
      date_mise_en_circulation: vehicle.date_mise_en_circulation,
      date_achat: vehicle.date_achat,
      cout_achat_ht: vehicle.cout_achat_ht,
      type_propriete: vehicle.type_propriete,
      garantie_expiration: vehicle.garantie_expiration,
      ct_expiration: vehicle.ct_expiration,
      assurance_expiration: vehicle.assurance_expiration,
      vignette_expiration: vehicle.vignette_expiration,
      tachy_serie: vehicle.tachy_serie,
      tachy_etalonnage_prochain: vehicle.tachy_etalonnage_prochain,
      contrat_entretien: vehicle.contrat_entretien,
      prestataire_entretien: vehicle.prestataire_entretien,
      garage_entretien: vehicle.garage_entretien,
      km_actuel: vehicle.km_actuel,
      statut: vehicle.statut,
      notes: vehicle.notes,
      preferences: vehicle.preferences,
    })
    setNumeroParc(vehicle.numero_parc ?? '')
    setDossierError(null)
    setDocumentForm(EMPTY_DOCUMENT)
    setDocumentFile(null)
    setMaintenanceForm(EMPTY_MAINTENANCE)
    setKmForm({
      ...EMPTY_KM,
      km_compteur: vehicle.km_actuel ?? 0,
    })
    setShowForm(true)
    void loadDossier(vehicle.id)
  }

  function set<K extends keyof VehiculeForm>(key: K, value: VehiculeForm[K]) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function loadDossier(vehiculeId: string) {
    setDossierLoading(true)
    setDossierError(null)

    try {
      const [documentsRes, entretiensRes, kmRes] = await Promise.all([
        looseSupabase.from('flotte_documents').select('*').eq('vehicule_id', vehiculeId).is('archived_at', null).order('created_at', { ascending: false }),
        supabase.from('flotte_entretiens').select('*').eq('vehicule_id', vehiculeId).order('service_date', { ascending: false }),
        looseSupabase.from('vehicule_releves_km').select('*').eq('vehicule_id', vehiculeId).order('reading_date', { ascending: false }),
      ])

      if (documentsRes.error) throw documentsRes.error
      if (entretiensRes.error) throw entretiensRes.error
      if (kmRes.error) throw kmRes.error

      setDocuments((documentsRes.data ?? []) as FlotteDocument[])
      setEntretiens(entretiensRes.data ?? [])
      setKmReadings((kmRes.data ?? []) as VehiculeKm[])

      const [alertsRes, costsRes, costKmRes] = await Promise.all([
        looseSupabase.from('vue_alertes_flotte').select('*').eq('asset_type', 'vehicule').eq('asset_id', vehiculeId).order('due_on', { ascending: true }),
        looseSupabase.from('vue_couts_flotte_mensuels').select('*').eq('asset_type', 'vehicule').eq('asset_id', vehiculeId).order('month', { ascending: true }),
        looseSupabase.from('vue_cout_kilometrique_vehicules').select('*').eq('vehicule_id', vehiculeId).order('month', { ascending: true }),
      ])

      setAssetAlerts(alertsRes.error ? [] : ((alertsRes.data ?? []) as FlotteAlerte[]))
      setCostSeries(costsRes.error ? [] : ((costsRes.data ?? []) as FlotteCoutMensuel[]))
      setCostKmSeries(costKmRes.error ? [] : ((costKmRes.data ?? []) as VehiculeCoutKm[]))

      if (alertsRes.error || costsRes.error || costKmRes.error) {
        setDossierError('Le dossier flotte est charge partiellement. Les vues d alertes ou de couts ne sont pas encore disponibles.')
      }
    } catch (err) {
      setDocuments([])
      setEntretiens([])
      setKmReadings([])
      setAssetAlerts([])
      setCostSeries([])
      setCostKmSeries([])
      setDossierError(flotteFeatureError(err, 'Chargement du dossier flotte impossible.'))
    } finally {
      setDossierLoading(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    resetFeedback()

    const payload = normalizeVehiculePayload(form)
    if (!payload.immatriculation) {
      setError('Immatriculation obligatoire.')
      return
    }

    if (!editingId && !canManageFleetAssets) {
      setError('Seuls les mecaniciens et dirigeants peuvent ajouter un vehicule.')
      return
    }

    setSaving(true)

    try {
      const payloadWithParc = { ...payload, numero_parc: numeroParc.trim() || null }
      const query = editingId
        ? looseSupabase.from('vehicules').update(payloadWithParc).eq('id', editingId)
        : looseSupabase.from('vehicules').insert(payloadWithParc)

      const { error: saveError } = await query
      if (saveError) throw saveError

      setNotice(editingId ? 'Vehicule mis a jour.' : 'Vehicule ajoute.')
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
      setError('Seuls les mecaniciens et dirigeants peuvent supprimer un vehicule.')
      return
    }
    if (!confirm('Supprimer ce vehicule ?')) return

    try {
      const { error: deleteError } = await supabase.from('vehicules').delete().eq('id', id)
      if (deleteError) throw deleteError
      setNotice('Vehicule supprime.')
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
      const { error: uploadError } = await supabase.storage.from('flotte-documents').upload(storagePath, documentFile, {
        contentType: documentFile.type || 'application/pdf',
        upsert: false,
      })
      if (uploadError) throw uploadError

      const { error: insertError } = await looseSupabase.from('flotte_documents').insert({
        vehicule_id: editingId,
        remorque_id: null,
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

      setNotice('Document flotte televerse.')
      setDocumentForm(EMPTY_DOCUMENT)
      setDocumentFile(null)
      await loadDossier(editingId)
    } catch (err) {
      setDossierError(flotteFeatureError(err, 'Televersement du document flotte impossible.'))
    } finally {
      setSavingDocument(false)
    }
  }

  async function archiveDocument(id: string) {
    if (!editingId) return
    try {
      const { error: updateError } = await looseSupabase.from('flotte_documents').update({ archived_at: new Date().toISOString() }).eq('id', id)
      if (updateError) throw updateError
      setNotice('Document flotte archive.')
      await loadDossier(editingId)
    } catch (err) {
      setDossierError(flotteFeatureError(err, 'Archivage du document flotte impossible.'))
    }
  }

  async function openDocument(document: FlotteDocument) {
    try {
      const { data, error: urlError } = await supabase.storage.from(document.storage_bucket).createSignedUrl(document.storage_path, 60)
      if (urlError) throw urlError
      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setDossierError(flotteFeatureError(err, 'Ouverture du document flotte impossible.'))
    }
  }

  async function saveMaintenance(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return

    setSavingMaintenance(true)
    setDossierError(null)

    try {
      const payload: TablesInsert<'flotte_entretiens'> = {
        vehicule_id: editingId,
        remorque_id: null,
        maintenance_type: maintenanceForm.maintenance_type,
        service_date: maintenanceForm.service_date,
        km_compteur: maintenanceForm.km_compteur,
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

      setNotice('Entretien enregistre.')
      setMaintenanceForm(EMPTY_MAINTENANCE)
      await loadDossier(editingId)
    } catch (err) {
      setDossierError(flotteFeatureError(err, 'Enregistrement entretien impossible.'))
    } finally {
      setSavingMaintenance(false)
    }
  }

  async function deleteMaintenance(id: string) {
    if (!editingId) return
    try {
      const { error: deleteError } = await supabase.from('flotte_entretiens').delete().eq('id', id)
      if (deleteError) throw deleteError
      setNotice('Entretien supprime.')
      await loadDossier(editingId)
    } catch (err) {
      setDossierError(flotteFeatureError(err, 'Suppression entretien impossible.'))
    }
  }

  async function saveKmReading(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return

    setSavingKm(true)
    setDossierError(null)

    try {
      const payload = {
        vehicule_id: editingId,
        reading_date: kmForm.reading_date,
        km_compteur: kmForm.km_compteur,
        source: kmForm.source?.trim() || null,
        notes: kmForm.notes?.trim() || null,
      }

      const { error: kmError } = await looseSupabase.from('vehicule_releves_km').upsert(payload, { onConflict: 'vehicule_id,reading_date' })
      if (kmError) throw kmError

      const { error: vehiculeError } = await supabase.from('vehicules').update({ km_actuel: payload.km_compteur }).eq('id', editingId)
      if (vehiculeError) throw vehiculeError

      setForm(current => ({ ...current, km_actuel: payload.km_compteur }))
      setNotice('Releve kilometrique enregistre.')
      setKmForm({ ...EMPTY_KM, km_compteur: payload.km_compteur })
      await load()
      await loadDossier(editingId)
    } catch (err) {
      setDossierError(flotteFeatureError(err, 'Enregistrement kilometrique impossible.'))
    } finally {
      setSavingKm(false)
    }
  }

  async function deleteKmReading(id: string) {
    if (!editingId) return
    try {
      const { error: deleteError } = await looseSupabase.from('vehicule_releves_km').delete().eq('id', id)
      if (deleteError) throw deleteError
      setNotice('Releve kilometrique supprime.')
      await loadDossier(editingId)
    } catch (err) {
      setDossierError(flotteFeatureError(err, 'Suppression releve kilometrique impossible.'))
    }
  }

  const currentMonthCost = costSeries[costSeries.length - 1]?.total_cout_ht ?? null
  const currentCostKm = costKmSeries[costKmSeries.length - 1]?.cout_km_ht ?? null
  const [pageTab, setPageTab] = useState<'liste' | 'amortissements'>('liste')

  // Adapter la liste des véhicules pour FlotteAmortissements
  const vehiculesForAmort = useMemo(() => list.map(v => ({
    id: v.id,
    immatriculation: v.immatriculation,
    marque: v.marque,
    modele: v.modele,
    type: 'vehicule' as const,
    cout_achat_ht: v.cout_achat_ht,
    date_achat: v.date_achat ?? null,
    date_mise_en_circulation: v.date_mise_en_circulation ?? null,
    km_actuel: v.km_actuel,
  })), [list])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Vehicules</h2>
          <p className="text-slate-500 text-sm">{list.length} vehicule{list.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {(['liste', 'amortissements'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setPageTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                pageTab === t ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t === 'liste' ? 'Liste' : '📊 Amortissements'}
            </button>
          ))}
          {canManageFleetAssets && pageTab === 'liste' && (
            <button onClick={openCreate} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
              + Ajouter
            </button>
          )}
        </div>
      </div>

      {(error || notice) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error ?? notice}
        </div>
      )}

      {pageTab === 'amortissements' && (
        <FlotteAmortissements vehicules={vehiculesForAmort} remorques={[]} />
      )}

      {pageTab === 'liste' && (<>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Disponibles" value={stats.disponibles} tone="emerald" />
        <StatCard label="CT < 60 j" value={stats.ctExpirent} tone="amber" />
        <StatCard label="Assurance < 60 j" value={stats.assuranceExpire} tone="amber" />
        <StatCard label="Garantie < 60 j" value={stats.garantieExpire} tone="amber" />
      </div>

      <input
        type="text"
        placeholder="Immatriculation, VIN, carte grise, garage..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-4 px-3 py-2 border border-slate-200 rounded-lg text-sm w-full max-w-md outline-none focus:ring-2 focus:ring-slate-300"
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">{search ? 'Aucun resultat' : 'Aucun vehicule enregistre'}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Vehicule', 'Administratif', 'Entretien / couts', 'Km / tachy', 'Statut', ''].map(header => (
                  <th key={header} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((vehicle, index) => {
                const alerts = alertMap.get(vehicle.id) ?? []
                return (
                  <tr key={vehicle.id} className={`border-t border-slate-100 ${index % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium font-mono text-slate-800">{vehicle.immatriculation}</div>
                      {vehicle.numero_parc && <div className="text-xs text-slate-500">Parc: {vehicle.numero_parc}</div>}
                      <div className="text-xs text-slate-400">{vehicle.marque ?? 'Marque non renseignee'} {vehicle.modele ?? ''} {vehicle.annee ? `(${vehicle.annee})` : ''}</div>
                      <div className="text-xs text-slate-400 mt-1">{TYPE_LABELS[vehicle.type_vehicule] ?? vehicle.type_vehicule}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`text-xs ${expColor(vehicle.ct_expiration)}`}>CT: {formatDate(vehicle.ct_expiration)}</div>
                      <div className={`text-xs ${expColor(vehicle.assurance_expiration)}`}>Assurance: {formatDate(vehicle.assurance_expiration)}</div>
                      <div className="text-xs text-slate-400">Carte grise: {vehicle.numero_carte_grise ?? 'Non renseignee'}</div>
                      {alerts.length > 0 && <div className="mt-1 text-xs text-amber-600">{alerts.length} alerte{alerts.length > 1 ? 's' : ''}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-600">{PROPERTY_LABELS[(vehicle.type_propriete as (typeof PROPERTY_TYPES)[number]) ?? 'autre'] ?? (vehicle.type_propriete ?? 'Non renseigne')}</div>
                      <div className="text-xs text-slate-400">Achat: {formatCurrency(vehicle.cout_achat_ht)}</div>
                      <div className="text-xs text-slate-400">Garage: {vehicle.garage_entretien ?? 'Non renseigne'}</div>
                      <div className="text-xs text-slate-400">{vehicle.contrat_entretien ? 'Contrat entretien actif' : 'Sans contrat entretien'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-600">{formatKm(vehicle.km_actuel)}</div>
                      <div className="text-xs text-slate-400">Tachy: {vehicle.tachy_serie ?? 'Non renseigne'}</div>
                      <div className={`text-xs ${expColor(vehicle.tachy_etalonnage_prochain)}`}>Etalonnage: {formatDate(vehicle.tachy_etalonnage_prochain)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUT_COLORS[vehicle.statut] ?? 'bg-slate-100 text-slate-600'}`}>{STATUT_LABELS[vehicle.statut] ?? vehicle.statut}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => openEdit(vehicle)} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">Modifier</button>
                        {canManageFleetAssets && <button onClick={() => void del(vehicle.id)} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Suppr.</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      </>)}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">{editingId ? 'Modifier un vehicule' : 'Ajouter un vehicule'}</h3>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">x</button>
            </div>

            <form onSubmit={submit} className="p-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="space-y-4">
                  <SectionTitle title="Identification" subtitle="Immatriculation, type, carte grise, VIN et mise en circulation." />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Immatriculation *"><input className={inp} value={form.immatriculation} onChange={e => set('immatriculation', e.target.value.toUpperCase())} required /></Field>
                    <Field label="Numero de parc"><input className={inp} value={numeroParc} onChange={e => setNumeroParc(e.target.value)} /></Field>
                    <Field label="Type *">
                      <select className={inp} value={form.type_vehicule ?? 'tracteur'} onChange={e => set('type_vehicule', e.target.value)}>
                        {Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                      </select>
                    </Field>
                    <Field label="Marque"><input className={inp} value={form.marque ?? ''} onChange={e => set('marque', e.target.value || null)} /></Field>
                    <Field label="Modele"><input className={inp} value={form.modele ?? ''} onChange={e => set('modele', e.target.value || null)} /></Field>
                    <Field label="Annee"><input className={inp} type="number" value={form.annee ?? ''} onChange={e => set('annee', e.target.value ? Number.parseInt(e.target.value, 10) : null)} /></Field>
                    <Field label="PTAC (kg)"><input className={inp} type="number" value={form.ptac_kg ?? ''} onChange={e => set('ptac_kg', e.target.value ? Number.parseInt(e.target.value, 10) : null)} /></Field>
                    <Field label="Numero carte grise"><input className={inp} value={form.numero_carte_grise ?? ''} onChange={e => set('numero_carte_grise', e.target.value || null)} /></Field>
                    <Field label="VIN"><input className={inp} value={form.vin ?? ''} onChange={e => set('vin', e.target.value || null)} /></Field>
                    <Field label="Mise en circulation"><input className={inp} type="date" value={form.date_mise_en_circulation ?? ''} onChange={e => set('date_mise_en_circulation', e.target.value || null)} /></Field>
                    <Field label="Statut">
                      <select className={inp} value={form.statut ?? 'disponible'} onChange={e => set('statut', e.target.value)}>
                        {Object.entries(STATUT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                      </select>
                    </Field>
                  </div>

                  <SectionTitle title="Achat et propriete" subtitle="Date d'achat, cout, type de propriete et garantie." />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Date achat"><input className={inp} type="date" value={form.date_achat ?? ''} onChange={e => set('date_achat', e.target.value || null)} /></Field>
                    <Field label="Cout achat HT"><input className={inp} type="number" step="0.01" value={form.cout_achat_ht ?? ''} onChange={e => set('cout_achat_ht', e.target.value ? Number.parseFloat(e.target.value) : null)} /></Field>
                    <Field label="Type propriete">
                      <select className={inp} value={form.type_propriete ?? 'achat'} onChange={e => set('type_propriete', e.target.value)}>
                        {PROPERTY_TYPES.map(type => <option key={type} value={type}>{PROPERTY_LABELS[type]}</option>)}
                      </select>
                    </Field>
                    <Field label="Garantie jusqu'au"><input className={inp} type="date" value={form.garantie_expiration ?? ''} onChange={e => set('garantie_expiration', e.target.value || null)} /></Field>
                  </div>

                  <SectionTitle title="Documents et echeances" subtitle="Controle technique, assurance et vignette." />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Expiration CT"><input className={inp} type="date" value={form.ct_expiration ?? ''} onChange={e => set('ct_expiration', e.target.value || null)} /></Field>
                    <Field label="Expiration assurance"><input className={inp} type="date" value={form.assurance_expiration ?? ''} onChange={e => set('assurance_expiration', e.target.value || null)} /></Field>
                    <Field label="Expiration vignette"><input className={inp} type="date" value={form.vignette_expiration ?? ''} onChange={e => set('vignette_expiration', e.target.value || null)} /></Field>
                  </div>
                </div>

                <div className="space-y-4">
                  <SectionTitle title="Kilometrage et tachygraphe" subtitle="Compteur actuel, tachygraphe et prochain etalonnage." />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Km actuel"><input className={inp} type="number" value={form.km_actuel ?? ''} onChange={e => set('km_actuel', e.target.value ? Number.parseInt(e.target.value, 10) : 0)} /></Field>
                    <Field label="Numero tachygraphe"><input className={inp} value={form.tachy_serie ?? ''} onChange={e => set('tachy_serie', e.target.value || null)} /></Field>
                    <Field label="Prochain etalonnage"><input className={inp} type="date" value={form.tachy_etalonnage_prochain ?? ''} onChange={e => set('tachy_etalonnage_prochain', e.target.value || null)} /></Field>
                  </div>

                  <SectionTitle title="Entretien" subtitle="Prestataire, garage et contrat d'entretien." />
                  <div className="grid grid-cols-2 gap-4">
                    <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={form.contrat_entretien ?? false} onChange={e => set('contrat_entretien', e.target.checked)} />
                      Contrat entretien actif
                    </label>
                    <Field label="Prestataire entretien"><input className={inp} value={form.prestataire_entretien ?? ''} onChange={e => set('prestataire_entretien', e.target.value || null)} /></Field>
                    <Field label="Garage entretien"><input className={inp} value={form.garage_entretien ?? ''} onChange={e => set('garage_entretien', e.target.value || null)} /></Field>
                  </div>

                  <SectionTitle title="Specificites" subtitle="Bloc-notes et preferences operationnelles." />
                  <div className="space-y-4">
                    <Field label="Notes"><textarea className={`${inp} resize-none`} rows={4} value={form.notes ?? ''} onChange={e => set('notes', e.target.value || null)} /></Field>
                    <Field label="Preferences / contraintes"><textarea className={`${inp} resize-none`} rows={4} value={form.preferences ?? ''} onChange={e => set('preferences', e.target.value || null)} /></Field>
                  </div>
                </div>
              </div>

              {editingId && (
                <div className="mt-8 border-t pt-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Dossier flotte</p>
                      <p className="text-xs text-slate-400">Documents PDF, entretiens, couts et releves kilometriques.</p>
                    </div>
                    {dossierLoading && <span className="text-xs text-slate-400">Chargement...</span>}
                  </div>

                  {dossierError && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{dossierError}</div>}

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard label="Alertes ouvertes" value={assetAlerts.length} tone="amber" />
                    <StatCard label="Documents actifs" value={documents.length} tone="slate" />
                    <StatCard label="Cout mois" value={currentMonthCost === null ? '0 EUR' : formatCurrency(currentMonthCost)} tone="slate" />
                    <StatCard label="Cout / km" value={currentCostKm === null ? '0 EUR' : `${currentCostKm.toFixed(2)} EUR/km`} tone="slate" />
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <ChartPanel
                      title="Graphique couts entretien"
                      subtitle="Couts HT par mois"
                      emptyText="Aucun cout enregistre."
                      items={costSeries.map(item => ({ label: monthLabel(item.month), value: Number(item.total_cout_ht ?? 0), formatted: formatCurrency(item.total_cout_ht) }))}
                    />
                    <ChartPanel
                      title="Graphique cout kilometrique"
                      subtitle="Cout HT par kilometre et par mois"
                      emptyText="Aucune donnee cout/km."
                      items={costKmSeries.map(item => ({ label: monthLabel(item.month), value: Number(item.cout_km_ht ?? 0), formatted: item.cout_km_ht === null ? 'Non calcule' : `${item.cout_km_ht.toFixed(3)} EUR/km` }))}
                    />
                  </div>

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
                        <div className="flex justify-end">
                          <button type="submit" disabled={savingDocument || !documentFile} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50">{savingDocument ? 'Televersement...' : 'Ajouter document'}</button>
                        </div>
                      </form>

                      <div className="mt-4 space-y-2">
                        {documents.length === 0 ? (
                          <p className="text-xs text-slate-400">Aucun document flotte enregistre.</p>
                        ) : documents.map(document => (
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
                      <h4 className="text-sm font-semibold text-slate-800">Entretien et couts</h4>
                      <form onSubmit={saveMaintenance} className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Type entretien">
                            <select className={inp} value={maintenanceForm.maintenance_type ?? 'revision'} onChange={e => setMaintenanceForm(current => ({ ...current, maintenance_type: e.target.value }))}>
                              {MAINTENANCE_TYPES.map(type => <option key={type} value={type}>{MAINTENANCE_TYPE_LABELS[type]}</option>)}
                            </select>
                          </Field>
                          <Field label="Date intervention"><input className={inp} type="date" value={maintenanceForm.service_date ?? ''} onChange={e => setMaintenanceForm(current => ({ ...current, service_date: e.target.value }))} required /></Field>
                          <Field label="Km compteur"><input className={inp} type="number" value={maintenanceForm.km_compteur ?? ''} onChange={e => setMaintenanceForm(current => ({ ...current, km_compteur: e.target.value ? Number.parseInt(e.target.value, 10) : null }))} /></Field>
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
                          <Field label="Prochaine echeance date"><input className={inp} type="date" value={maintenanceForm.next_due_date ?? ''} onChange={e => setMaintenanceForm(current => ({ ...current, next_due_date: e.target.value || null }))} /></Field>
                          <Field label="Prochaine echeance km"><input className={inp} type="number" value={maintenanceForm.next_due_km ?? ''} onChange={e => setMaintenanceForm(current => ({ ...current, next_due_km: e.target.value ? Number.parseInt(e.target.value, 10) : null }))} /></Field>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input type="checkbox" checked={maintenanceForm.covered_by_contract ?? false} onChange={e => setMaintenanceForm(current => ({ ...current, covered_by_contract: e.target.checked }))} />
                          Pris en charge par contrat entretien
                        </label>
                        <Field label="Notes"><textarea className={`${inp} resize-none`} rows={3} value={maintenanceForm.notes ?? ''} onChange={e => setMaintenanceForm(current => ({ ...current, notes: e.target.value || null }))} /></Field>
                        <div className="flex justify-end">
                          <button type="submit" disabled={savingMaintenance} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50">{savingMaintenance ? 'Enregistrement...' : 'Ajouter entretien'}</button>
                        </div>
                      </form>

                      <div className="mt-4 space-y-2">
                        {entretiens.length === 0 ? (
                          <p className="text-xs text-slate-400">Aucun entretien enregistre.</p>
                        ) : entretiens.map(entretien => (
                          <div key={entretien.id} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium text-slate-800">{MAINTENANCE_TYPE_LABELS[(entretien.maintenance_type as (typeof MAINTENANCE_TYPES)[number]) ?? 'autre'] ?? entretien.maintenance_type}</div>
                                <div className="text-xs text-slate-400">{formatDate(entretien.service_date)} · {formatCurrency(entretien.cout_ht)}</div>
                                {entretien.km_compteur !== null && <div className="text-xs text-slate-400">Compteur: {formatKm(entretien.km_compteur)}</div>}
                                {entretien.next_due_date && <div className="text-xs text-slate-400">Prochaine echeance: {formatDate(entretien.next_due_date)}</div>}
                              </div>
                              <button type="button" onClick={() => void deleteMaintenance(entretien.id)} className="text-xs text-slate-400 hover:text-red-500">Suppr.</button>
                            </div>
                            {(entretien.prestataire || entretien.garage || entretien.notes) && <p className="mt-2 text-xs text-slate-500 whitespace-pre-line">{[entretien.prestataire, entretien.garage, entretien.notes].filter(Boolean).join(' · ')}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-sm font-semibold text-slate-800">Releves kilometriques</h4>
                      <form onSubmit={saveKmReading} className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Date releve"><input className={inp} type="date" value={kmForm.reading_date ?? ''} onChange={e => setKmForm(current => ({ ...current, reading_date: e.target.value }))} required /></Field>
                          <Field label="Km compteur"><input className={inp} type="number" value={kmForm.km_compteur ?? 0} onChange={e => setKmForm(current => ({ ...current, km_compteur: e.target.value ? Number.parseInt(e.target.value, 10) : 0 }))} required /></Field>
                          <Field label="Source"><input className={inp} value={kmForm.source ?? ''} onChange={e => setKmForm(current => ({ ...current, source: e.target.value || null }))} /></Field>
                        </div>
                        <Field label="Notes"><textarea className={`${inp} resize-none`} rows={3} value={kmForm.notes ?? ''} onChange={e => setKmForm(current => ({ ...current, notes: e.target.value || null }))} /></Field>
                        <div className="flex justify-end">
                          <button type="submit" disabled={savingKm} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50">{savingKm ? 'Enregistrement...' : 'Ajouter releve'}</button>
                        </div>
                      </form>

                      <div className="mt-4 space-y-2">
                        {kmReadings.length === 0 ? (
                          <p className="text-xs text-slate-400">Aucun releve kilometrique enregistre.</p>
                        ) : kmReadings.map(reading => (
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
                      <h4 className="text-sm font-semibold text-slate-800">Alertes flotte</h4>
                      <div className="mt-4 space-y-2">
                        {assetAlerts.length === 0 ? (
                          <p className="text-xs text-slate-400">Aucune alerte active.</p>
                        ) : assetAlerts.map(alert => (
                          <div key={alert.id ?? `${alert.alert_type}-${alert.due_on}`} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="text-sm font-medium text-slate-800">{alert.alert_type ?? 'Alerte flotte'}</div>
                            <div className={`text-xs ${expColor(alert.due_on)}`}>{formatDate(alert.due_on)}{typeof alert.days_remaining === 'number' ? ` · ${alert.days_remaining} j` : ''}</div>
                            <div className="text-xs text-slate-400">{alert.asset_label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={closeForm} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                  {saving ? 'Enregistrement...' : editingId ? 'Sauvegarder' : 'Enregistrer'}
                </button>
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
