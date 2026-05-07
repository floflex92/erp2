import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import SiteMapPicker from '@/components/transports/SiteMapPicker'
import { listUnifiedConducteurs } from '@/lib/services/personsService'

// ── Types ────────────────────────────────────────────────────────────────────

type EntrepotTab = 'depots' | 'emplacements' | 'en_depot'

type Site = {
  id: string
  nom: string
  adresse: string
  enterprise_id: string | null
  entreprise_id: string | null
  usage_type: string | null
  type_site: string | null
  est_depot_relais: boolean | null
  code_postal: string | null
  ville: string | null
  pays: string | null
  contact_nom: string | null
  contact_tel: string | null
  capacite_m3: number | null
  notes: string | null
  latitude: number | null
  longitude: number | null
  horaires_ouverture: string | null
  notes_livraison: string | null
  is_primary: boolean
  clients?: { id: string; nom: string; code_client?: string | null } | null
}

type Relais = {
  id: string
  ot_id: string | null
  type_relais: 'depot_marchandise' | 'relais_conducteur'
  statut: 'en_attente' | 'assigne' | 'en_cours_reprise' | 'termine' | 'annule'
  site_id: string | null
  lieu_libre_nom: string | null
  lieu_libre_adresse: string | null
  conducteur_depose_id: string | null
  vehicule_depose_id: string | null
  date_depot: string | null
  conducteur_reprise_id: string | null
  vehicule_reprise_id: string | null
  remorque_reprise_id: string | null
  date_reprise_prevue: string | null
  date_reprise_reelle: string | null
  notes: string | null
  created_at: string
  // Enriched
  ot_reference?: string | null
  conducteur_depose_nom?: string | null
  conducteur_reprise_nom?: string | null
  vehicule_depose_immat?: string | null
  vehicule_reprise_immat?: string | null
  site_nom?: string | null
}

type Conducteur = { id: string; nom: string; prenom: string }
type Vehicule   = { id: string; immatriculation: string }
type Remorque   = { id: string; immatriculation: string }
type Client     = { id: string; nom: string; code_client?: string | null }

type DepotLocation = {
  id: string
  depot_site_id: string
  code: string
  libelle: string | null
  zone: string | null
  allee: string | null
  rayon: string | null
  niveau: string | null
  position: string | null
  type_emplacement: string
  capacite_m3: number | null
  actif: boolean
  notes: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_SITE_LABELS: Record<string, string> = {
  entrepot: 'Centre',
  depot: 'Centre',
  agence: 'Agence',
  client: 'Site client',
  quai: 'Quai',
  autre: 'Autre',
}

const STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  assigne: 'Assigné',
  en_cours_reprise: 'En reprise',
  termine: 'Terminé',
  annule: 'Annulé',
}

const STATUT_COLORS: Record<string, string> = {
  en_attente: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  assigne: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  en_cours_reprise: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  termine: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  annule: 'bg-slate-500/20 text-muted border-slate-500/30',
}

const DEFAULT_PRIMARY_MARSEILLE_SITE = {
  nom: 'Centre principal Marseille',
  adresse: '16 boulevard du Littoral',
  code_postal: '13002',
  ville: 'Marseille',
  pays: 'France',
  latitude: '43.3047',
  longitude: '5.3673',
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function Entrepots() {
  const { role, companyId } = useAuth()
  const canEdit = role === 'admin' || role === 'dirigeant' || role === 'exploitant' || role === 'logisticien'
  const canDelete = role === 'admin' || role === 'dirigeant'

  const [tab, setTab] = useState<EntrepotTab>('depots')
  const [notice, setNotice] = useState<string | null>(null)

  // Data
  const [sites, setSites]           = useState<Site[]>([])
  const [relaisList, setRelais]     = useState<Relais[]>([])
  const [locations, setLocations]   = useState<DepotLocation[]>([])
  const [conducteurs, setConducteurs] = useState<Conducteur[]>([])
  const [vehicules, setVehicules]   = useState<Vehicule[]>([])
  const [remorques, setRemorques]   = useState<Remorque[]>([])
  const [clients, setClients]       = useState<Client[]>([])

  const [sitesLoading, setSitesLoading]   = useState(false)
  const [relaisLoading, setRelaisLoading] = useState(false)
  const [locationsLoading, setLocationsLoading] = useState(false)

  // Site create/edit
  const [siteModal, setSiteModal] = useState<{ mode: 'create' | 'edit'; site?: Site } | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [siteForm, setSiteForm] = useState({
    nom: '', adresse: '', code_postal: '', ville: '', pays: 'France',
    entreprise_id: '', contact_nom: '', contact_tel: '',
    type_site: 'entrepot', est_depot_relais: true, capacite_m3: '',
    horaires_ouverture: '', notes: '', latitude: '', longitude: '',
  })
  const [siteSaving, setSiteSaving] = useState(false)

  // Assign reprise modal
  const [assignModal, setAssignModal] = useState<{ relais: Relais } | null>(null)
  const [assignForm, setAssignForm] = useState({
    conducteur_reprise_id: '', vehicule_reprise_id: '', remorque_reprise_id: '', date_reprise_prevue: '',
  })
  const [assignSaving, setAssignSaving] = useState(false)

  // Site search
  const [siteSearch, setSiteSearch] = useState('')
  const [selectedDepotId, setSelectedDepotId] = useState('')
  const [locationSaving, setLocationSaving] = useState(false)
  const [locationForm, setLocationForm] = useState({
    depot_site_id: '',
    code: '',
    libelle: '',
    zone: '',
    allee: '',
    rayon: '',
    niveau: '',
    position: '',
    type_emplacement: 'stockage',
    capacite_m3: '',
    actif: true,
    notes: '',
  })

  // ── Loaders ────────────────────────────────────────────────────────────────

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c.nom])), [clients])

  const loadSites = useCallback(async () => {
    setSitesLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setSites([])
        setNotice('Session expirée. Recharge la page puis reconnecte-toi.')
        return
      }

      const response = await fetch('/.netlify/functions/v11-logistic-sites', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await response.json().catch(() => ({} as { data?: Site[]; error?: string }))
      if (!response.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : `Erreur HTTP ${response.status}`)
      }

      const rawSites = Array.isArray(body.data) ? body.data : []
      let normalized = rawSites
        .filter(site => {
          if (site.type_site === 'client') return false

          const codeClient = site.clients?.code_client ?? null
          const tenantInternalCode = `TENANT_INTERNE_${companyId ?? 0}`

          // Centre tenant uniquement: client interne du tenant, ou ancien centre sans client lie.
          return !site.entreprise_id || codeClient === tenantInternalCode
        })
        .sort((a, b) => {
          const primaryDelta = Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary))
          if (primaryDelta !== 0) return primaryDelta
          return (a.nom ?? '').localeCompare(b.nom ?? '', 'fr', { sensitivity: 'base' })
        })

      const tenantCenters = normalized
      if (tenantCenters.length > 0 && !tenantCenters.some(site => site.is_primary) && (companyId ?? 1) > 0) {
        const fallbackPrimary = tenantCenters[0]
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          const token = sessionData.session?.access_token
          if (!token) throw new Error('Session expirée.')
          await fetch(`/.netlify/functions/v11-logistic-sites?action=set_primary&site_id=${encodeURIComponent(fallbackPrimary.id)}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          })
          normalized = normalized.map(site => {
            return { ...site, is_primary: site.id === fallbackPrimary.id }
          })
        } catch {
          // Silencieux: on ne bloque pas l'affichage si la promotion automatique échoue.
        }
      }
      setSites(normalized)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Chargement des centres impossible.')
      setSites([])
    } finally {
      setSitesLoading(false)
    }
  }, [companyId])

  const loadRelais = useCallback(async () => {
    setRelaisLoading(true)
    const { data } = await supabase
      .from('transport_relais')
      .select(`
        id, ot_id, type_relais, statut, site_id, lieu_libre_nom, lieu_libre_adresse,
        conducteur_depose_id, vehicule_depose_id, date_depot,
        conducteur_reprise_id, vehicule_reprise_id, remorque_reprise_id,
        date_reprise_prevue, date_reprise_reelle, notes, created_at
      `)
      .neq('statut', 'annule')
      .order('created_at', { ascending: false })
    setRelais((data as Relais[] | null) ?? [])
    setRelaisLoading(false)
  }, [])

  const loadLocations = useCallback(async (depotSiteId?: string) => {
    setLocationsLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        setLocations([])
        setNotice('Session expirée. Recharge la page puis reconnecte-toi.')
        return
      }

      const query = depotSiteId ? `?depot_site_id=${encodeURIComponent(depotSiteId)}` : ''
      const response = await fetch(`/.netlify/functions/v11-depot-locations${query}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await response.json().catch(() => ({} as { data?: DepotLocation[]; error?: string }))
      if (!response.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : `Erreur HTTP ${response.status}`)
      }

      setLocations(Array.isArray(body.data) ? body.data : [])
    } catch (err) {
      setLocations([])
      setNotice(err instanceof Error ? err.message : 'Chargement des emplacements impossible.')
    } finally {
      setLocationsLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.all([
      loadSites(),
      loadRelais(),
      listUnifiedConducteurs(companyId, { activeOnly: true }).then(data => setConducteurs(data.map(c => ({ id: c.id, nom: c.nom, prenom: c.prenom })))),
      supabase.from('vehicules').select('id, immatriculation').neq('statut', 'hors_service').order('immatriculation').then(r => { if (!r.error && r.data) setVehicules(r.data) }),
      supabase.from('remorques').select('id, immatriculation').neq('statut', 'hors_service').order('immatriculation').then(r => { if (!r.error && r.data) setRemorques(r.data) }),
      supabase.from('clients').select('id, nom, code_client').eq('actif', true).order('nom').then(r => { if (!r.error && r.data) setClients(r.data) }),
    ])
  }, [companyId, loadSites, loadRelais])

  useEffect(() => {
    if (sites.length === 0) {
      setSelectedDepotId('')
      setLocationForm(prev => ({ ...prev, depot_site_id: '' }))
      setLocations([])
      return
    }

    const activeSelection = sites.some(site => site.id === selectedDepotId)
      ? selectedDepotId
      : sites[0].id

    if (activeSelection !== selectedDepotId) {
      setSelectedDepotId(activeSelection)
    }

    setLocationForm(prev => ({
      ...prev,
      depot_site_id: activeSelection,
    }))

    void loadLocations(activeSelection)
  }, [sites, selectedDepotId, loadLocations])

  // Helpers lookup
  const conducteurName = (id: string | null | undefined) => {
    if (!id) return '—'
    const c = conducteurs.find(x => x.id === id)
    return c ? `${c.prenom} ${c.nom}` : id.slice(0, 8)
  }
  const siteName = (id: string | null | undefined) => {
    if (!id) return null
    return sites.find(x => x.id === id)?.nom ?? null
  }

  // ── Site CRUD ──────────────────────────────────────────────────────────────

  function openCreateSite() {
    const hasPrimarySite = sites.some(site => site.is_primary)
    setSiteForm({
      nom: hasPrimarySite ? '' : DEFAULT_PRIMARY_MARSEILLE_SITE.nom,
      adresse: hasPrimarySite ? '' : DEFAULT_PRIMARY_MARSEILLE_SITE.adresse,
      code_postal: hasPrimarySite ? '' : DEFAULT_PRIMARY_MARSEILLE_SITE.code_postal,
      ville: hasPrimarySite ? '' : DEFAULT_PRIMARY_MARSEILLE_SITE.ville,
      pays: 'France',
      entreprise_id: '',
      contact_nom: '',
      contact_tel: '',
      type_site: 'depot',
      est_depot_relais: true,
      capacite_m3: '',
      horaires_ouverture: '',
      notes: hasPrimarySite ? '' : 'Point de départ conseillé pour le site principal.',
      latitude: hasPrimarySite ? '' : DEFAULT_PRIMARY_MARSEILLE_SITE.latitude,
      longitude: hasPrimarySite ? '' : DEFAULT_PRIMARY_MARSEILLE_SITE.longitude,
    })
    setShowMap(false)
    setSiteModal({ mode: 'create' })
  }

  function openEditSite(site: Site) {
    setShowMap(false)
    setSiteForm({
      nom: site.nom ?? '', adresse: site.adresse ?? '', code_postal: site.code_postal ?? '', ville: site.ville ?? '',
      pays: site.pays ?? 'France', entreprise_id: site.entreprise_id ?? '', contact_nom: site.contact_nom ?? '',
      contact_tel: site.contact_tel ?? '', type_site: site.type_site ?? 'entrepot',
      est_depot_relais: site.est_depot_relais ?? true, capacite_m3: site.capacite_m3 != null ? String(site.capacite_m3) : '',
      horaires_ouverture: site.horaires_ouverture ?? '', notes: site.notes ?? '',
      latitude: site.latitude != null ? String(site.latitude) : '',
      longitude: site.longitude != null ? String(site.longitude) : '',
    })
    setSiteModal({ mode: 'edit', site })
  }

  async function submitSite(e: React.FormEvent) {
    e.preventDefault()
    if (!siteForm.nom.trim()) {
      setNotice('Le nom du site est obligatoire.')
      return
    }
    if (!siteForm.adresse.trim()) {
      setNotice('L\'adresse du centre est obligatoire.')
      return
    }

    setSiteSaving(true)
    const payload = {
      nom: siteForm.nom.trim(),
      adresse: siteForm.adresse.trim(),
      usage_type: 'mixte',
      code_postal: siteForm.code_postal.trim() || null, ville: siteForm.ville.trim() || null,
      pays: siteForm.pays.trim() || 'France', entreprise_id: siteForm.entreprise_id.trim() || null,
      contact_nom: siteForm.contact_nom.trim() || null, contact_tel: siteForm.contact_tel.trim() || null,
      type_site: siteForm.type_site, est_depot_relais: siteForm.est_depot_relais,
      capacite_m3: siteForm.capacite_m3 ? Number(siteForm.capacite_m3) : null,
      horaires_ouverture: siteForm.horaires_ouverture.trim() || null, notes: siteForm.notes.trim() || null,
      latitude: siteForm.latitude ? Number(siteForm.latitude) : null,
      longitude: siteForm.longitude ? Number(siteForm.longitude) : null,
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        throw new Error('Session expirée. Recharge la page puis reconnecte-toi.')
      }

      const isEdit = siteModal?.mode === 'edit' && !!siteModal.site
      const query = isEdit ? `?site_id=${encodeURIComponent(siteModal!.site!.id)}` : ''
      const response = await fetch(`/.netlify/functions/v11-logistic-sites${query}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const body = await response.json().catch(() => ({} as Record<string, unknown>))
      if (!response.ok) {
        const msg = typeof body.error === 'string' ? body.error : `Erreur HTTP ${response.status}`
        throw new Error(msg)
      }

      setSiteModal(null)
      await loadSites()
      setNotice(siteModal?.mode === 'edit' ? 'Centre mis à jour.' : 'Centre créé avec succès.')
    } catch (err) {
      const details = (typeof err === 'object' && err !== null)
        ? [
          (err as { message?: string }).message,
          (err as { details?: string }).details,
          (err as { hint?: string }).hint,
        ].filter(Boolean).join(' · ')
        : ''
      setNotice(details || (err instanceof Error ? err.message : 'Impossible d\'enregistrer le centre.'))
    } finally {
      setSiteSaving(false)
    }
  }

  async function deleteSite(id: string) {
    if (!confirm('Supprimer ce site ? Cette action est irréversible.')) return
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        throw new Error('Session expirée. Recharge la page puis reconnecte-toi.')
      }

      const response = await fetch(`/.netlify/functions/v11-logistic-sites?site_id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const body = await response.json().catch(() => ({} as Record<string, unknown>))
      if (!response.ok) {
        const msg = typeof body.error === 'string' ? body.error : `Erreur HTTP ${response.status}`
        throw new Error(msg)
      }
      await loadSites()
      setNotice('Centre supprimé.')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Impossible de supprimer le centre.')
    }
  }

  async function makePrimarySite(site: Site) {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        throw new Error('Session expirée. Recharge la page puis reconnecte-toi.')
      }

      const response = await fetch(`/.netlify/functions/v11-logistic-sites?action=set_primary&site_id=${encodeURIComponent(site.id)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const body = await response.json().catch(() => ({} as Record<string, unknown>))
      if (!response.ok) {
        const msg = typeof body.error === 'string' ? body.error : `Erreur HTTP ${response.status}`
        throw new Error(msg)
      }

      setNotice(`${site.nom} défini comme centre principal.`)
      await loadSites()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Impossible de définir le centre principal.')
    }
  }

  // ── Assign reprise ─────────────────────────────────────────────────────────

  function openAssign(relais: Relais) {
    setAssignForm({ conducteur_reprise_id: relais.conducteur_reprise_id ?? '', vehicule_reprise_id: relais.vehicule_reprise_id ?? '', remorque_reprise_id: relais.remorque_reprise_id ?? '', date_reprise_prevue: relais.date_reprise_prevue?.slice(0, 16) ?? '' })
    setAssignModal({ relais })
  }

  async function submitAssign(e: React.FormEvent) {
    e.preventDefault()
    if (!assignModal) return
    setAssignSaving(true)
    await supabase.from('transport_relais').update({
      conducteur_reprise_id: assignForm.conducteur_reprise_id || null,
      vehicule_reprise_id: assignForm.vehicule_reprise_id || null,
      remorque_reprise_id: assignForm.remorque_reprise_id || null,
      date_reprise_prevue: assignForm.date_reprise_prevue || null,
      statut: 'assigne',
    }).eq('id', assignModal.relais.id)
    setAssignSaving(false)
    setAssignModal(null)
    await loadRelais()
  }

  async function updateStatut(id: string, statut: Relais['statut']) {
    await supabase.from('transport_relais').update({ statut }).eq('id', id)
    await loadRelais()
  }

  async function submitLocation(e: React.FormEvent) {
    e.preventDefault()
    if (!locationForm.depot_site_id) {
      setNotice('Selectionne un centre pour creer un emplacement.')
      return
    }
    if (!locationForm.code.trim()) {
      setNotice('Le code emplacement est obligatoire.')
      return
    }

    setLocationSaving(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session expirée. Recharge la page puis reconnecte-toi.')

      const payload = {
        depot_site_id: locationForm.depot_site_id,
        code: locationForm.code.trim(),
        libelle: locationForm.libelle.trim() || null,
        zone: locationForm.zone.trim() || null,
        allee: locationForm.allee.trim() || null,
        rayon: locationForm.rayon.trim() || null,
        niveau: locationForm.niveau.trim() || null,
        position: locationForm.position.trim() || null,
        type_emplacement: locationForm.type_emplacement,
        capacite_m3: locationForm.capacite_m3 ? Number(locationForm.capacite_m3) : null,
        actif: locationForm.actif,
        notes: locationForm.notes.trim() || null,
      }

      const response = await fetch('/.netlify/functions/v11-depot-locations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const body = await response.json().catch(() => ({} as { error?: string }))
      if (!response.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : `Erreur HTTP ${response.status}`)
      }

      setLocationForm(prev => ({
        ...prev,
        code: '',
        libelle: '',
        zone: '',
        allee: '',
        rayon: '',
        niveau: '',
        position: '',
        type_emplacement: 'stockage',
        capacite_m3: '',
        actif: true,
        notes: '',
      }))
      await loadLocations(locationForm.depot_site_id)
      setNotice('Emplacement cree.')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Creation emplacement impossible.')
    } finally {
      setLocationSaving(false)
    }
  }

  async function toggleLocationActive(location: DepotLocation) {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session expirée. Recharge la page puis reconnecte-toi.')

      const response = await fetch(`/.netlify/functions/v11-depot-locations?location_id=${encodeURIComponent(location.id)}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          depot_site_id: location.depot_site_id,
          code: location.code,
          libelle: location.libelle,
          zone: location.zone,
          allee: location.allee,
          rayon: location.rayon,
          niveau: location.niveau,
          position: location.position,
          type_emplacement: location.type_emplacement,
          capacite_m3: location.capacite_m3,
          actif: !location.actif,
          notes: location.notes,
        }),
      })
      const body = await response.json().catch(() => ({} as { error?: string }))
      if (!response.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : `Erreur HTTP ${response.status}`)
      }

      await loadLocations(selectedDepotId)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Mise a jour emplacement impossible.')
    }
  }

  async function deleteLocation(locationId: string) {
    if (!confirm('Supprimer cet emplacement ?')) return
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session expirée. Recharge la page puis reconnecte-toi.')

      const response = await fetch(`/.netlify/functions/v11-depot-locations?location_id=${encodeURIComponent(locationId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await response.json().catch(() => ({} as { error?: string }))
      if (!response.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : `Erreur HTTP ${response.status}`)
      }

      await loadLocations(selectedDepotId)
      setNotice('Emplacement supprime.')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Suppression emplacement impossible.')
    }
  }

  // ── Filtered data ──────────────────────────────────────────────────────────

  const filteredSites = useMemo(() => {
    const kw = siteSearch.trim().toLowerCase()
    if (!kw) return sites
    return sites.filter(s =>
      [s.nom, s.adresse, s.ville, clientMap[s.entreprise_id ?? '']]
        .join(' ').toLowerCase().includes(kw),
    )
  }, [sites, siteSearch, clientMap])

  const sharedLogisticSites = useMemo(
    () => filteredSites,
    [filteredSites],
  )

  const selectedDepot = useMemo(
    () => sites.find(site => site.id === selectedDepotId) ?? null,
    [sites, selectedDepotId],
  )

  const filteredLocations = useMemo(
    () => locations.filter(location => !selectedDepotId || location.depot_site_id === selectedDepotId),
    [locations, selectedDepotId],
  )

  const relaisDepot     = relaisList.filter(r => r.type_relais === 'depot_marchandise')

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 min-h-0">
      {/* Notice */}
      {notice && (
        <div className="mx-4 mt-3 px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm flex items-center justify-between">
          {notice}
          <button onClick={() => setNotice(null)} className="ml-4 text-amber-400 hover:text-amber-200">✕</button>
        </div>
      )}

      {/* Tabs header */}
      <div className="flex items-center gap-1 px-4 pt-4 pb-0 border-b border-slate-800 flex-shrink-0">
        {([
          { key: 'depots' as EntrepotTab, label: 'Entrepots tenant', count: sharedLogisticSites.length },
          { key: 'emplacements' as EntrepotTab, label: 'Emplacements', count: filteredLocations.length },
          { key: 'en_depot' as EntrepotTab, label: 'Marchandises en centre', count: relaisDepot.filter(r => r.statut !== 'termine').length },
        ] as { key: EntrepotTab; label: string; count: number }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            type="button"
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors flex items-center gap-2 ${
              tab === t.key
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-muted hover:text-slate-200'
            }`}
          >
            {t.label}
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-indigo-500/30 text-indigo-200' : 'bg-slate-800 text-discreet'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="px-4 pt-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
          Les entrepots affiches ici sont uniquement les centres logistiques internes du tenant, utilises pour stocker, decharger et charger les marchandises.
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 min-h-0">

        {/* ── Onglet Centres ──────────────────────────────────────────── */}
        {tab === 'depots' && (() => {
          const list = sharedLogisticSites
          const emptyMsg = 'Aucun site logistique enregistré pour ce tenant.'
          const newBtnLabel = 'Nouveau site logistique'
          const accentClass = 'bg-amber-600 hover:bg-amber-500'
          return (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                Ces centres logistiques du tenant servent a stocker les marchandises, organiser les zones de dechargement et preparer le chargement.
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  value={siteSearch}
                  onChange={e => setSiteSearch(e.target.value)}
                  placeholder="Rechercher un site logistique..."
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-64"
                />
                {canEdit && (
                  <button
                    onClick={openCreateSite}
                    type="button"
                    className={`ml-auto px-4 py-2 rounded-lg ${accentClass} text-white text-sm font-semibold transition-colors flex items-center gap-2`}
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>
                    {newBtnLabel}
                  </button>
                )}
              </div>

              {sitesLoading ? (
                <div className="text-discreet text-sm py-8 text-center">Chargement...</div>
              ) : list.length === 0 ? (
                <div className="text-discreet text-sm py-12 text-center">
                  {emptyMsg}{canEdit && <> <button onClick={openCreateSite} className="text-indigo-400 hover:underline ml-1">Créer</button>.</>}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {list.map(site => (
                    <div key={site.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-100">{site.nom}</div>
                          <div className="text-xs text-muted mt-0.5">{site.adresse}{site.ville ? ` — ${site.ville}` : ''}</div>
                          {site.is_primary && (
                            <span className="mt-1 inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                              Site principal
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                            {TYPE_SITE_LABELS[site.type_site ?? ''] ?? site.type_site ?? 'Site'}
                          </span>
                          {site.est_depot_relais && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-muted">Relais planning actif</span>
                          )}
                        </div>
                      </div>
                      {(site.contact_nom || site.contact_tel) && (
                        <div className="text-xs text-muted">
                          {site.contact_nom && <span>{site.contact_nom}</span>}
                          {site.contact_tel && <span className="ml-2 text-discreet">{site.contact_tel}</span>}
                        </div>
                      )}
                      {site.capacite_m3 != null && (
                        <div className="text-xs text-discreet">Capacité : {site.capacite_m3} m³</div>
                      )}
                      {site.entreprise_id && (
                        <div className="text-xs text-discreet">Client : {clientMap[site.entreprise_id] ?? site.entreprise_id.slice(0, 8)}</div>
                      )}
                      {canEdit && (
                        <div className="flex gap-2 mt-1 pt-2 border-t border-slate-800">
                          {!site.is_primary && (
                            <button onClick={() => void makePrimarySite(site)} type="button" className="text-xs text-muted hover:text-emerald-300 transition-colors">Définir principal</button>
                          )}
                          <button onClick={() => openEditSite(site)} type="button" className="text-xs text-muted hover:text-indigo-300 transition-colors">Modifier</button>
                          {canDelete && (
                            <button onClick={() => deleteSite(site.id)} type="button" className="text-xs text-muted hover:text-rose-400 transition-colors ml-auto">Supprimer</button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Onglet Emplacements ───────────────────────────────────── */}
        {tab === 'emplacements' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
              Cree des emplacements physiques par centre (zone, allee, rayon, niveau) pour structurer le stockage et les operations quai.
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedDepotId}
                onChange={e => {
                  const depotId = e.target.value
                  setSelectedDepotId(depotId)
                  setLocationForm(prev => ({ ...prev, depot_site_id: depotId }))
                  void loadLocations(depotId)
                }}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {sites.map(site => (
                  <option key={site.id} value={site.id}>{site.nom}</option>
                ))}
              </select>
              {selectedDepot && (
                <span className="text-xs text-discreet">Centre actif : {selectedDepot.nom}</span>
              )}
            </div>

            {canEdit && (
              <form onSubmit={submitLocation} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    value={locationForm.code}
                    onChange={e => setLocationForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Code * (A-01-03)"
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    value={locationForm.libelle}
                    onChange={e => setLocationForm(prev => ({ ...prev, libelle: e.target.value }))}
                    placeholder="Libelle"
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    value={locationForm.type_emplacement}
                    onChange={e => setLocationForm(prev => ({ ...prev, type_emplacement: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="stockage">Stockage</option>
                    <option value="quai_chargement">Quai chargement</option>
                    <option value="quai_dechargement">Quai dechargement</option>
                    <option value="cross_dock">Cross-dock</option>
                    <option value="tampon">Zone tampon</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <input
                    value={locationForm.zone}
                    onChange={e => setLocationForm(prev => ({ ...prev, zone: e.target.value }))}
                    placeholder="Zone"
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    value={locationForm.allee}
                    onChange={e => setLocationForm(prev => ({ ...prev, allee: e.target.value }))}
                    placeholder="Allee"
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    value={locationForm.rayon}
                    onChange={e => setLocationForm(prev => ({ ...prev, rayon: e.target.value }))}
                    placeholder="Rayon"
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    value={locationForm.niveau}
                    onChange={e => setLocationForm(prev => ({ ...prev, niveau: e.target.value }))}
                    placeholder="Niveau"
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    value={locationForm.position}
                    onChange={e => setLocationForm(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="Position"
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    value={locationForm.capacite_m3}
                    onChange={e => setLocationForm(prev => ({ ...prev, capacite_m3: e.target.value }))}
                    placeholder="Capacite m3"
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    value={locationForm.notes}
                    onChange={e => setLocationForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notes"
                    className="md:col-span-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={locationForm.actif}
                      onChange={e => setLocationForm(prev => ({ ...prev, actif: e.target.checked }))}
                    />
                    Emplacement actif
                  </label>
                  <button
                    type="submit"
                    disabled={locationSaving}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {locationSaving ? 'Creation...' : 'Ajouter emplacement'}
                  </button>
                </div>
              </form>
            )}

            {locationsLoading ? (
              <div className="text-discreet text-sm py-8 text-center">Chargement des emplacements...</div>
            ) : filteredLocations.length === 0 ? (
              <div className="text-discreet text-sm py-10 text-center">Aucun emplacement pour ce centre.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-discreet text-xs border-b border-slate-800 bg-slate-900/70">
                      <th className="px-3 py-2 font-medium">Code</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Adresse interne</th>
                      <th className="px-3 py-2 font-medium">Capacite</th>
                      <th className="px-3 py-2 font-medium">Statut</th>
                      {canEdit && <th className="px-3 py-2 font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredLocations.map(location => (
                      <tr key={location.id} className="hover:bg-slate-900/40">
                        <td className="px-3 py-2 text-slate-200 font-mono">{location.code}</td>
                        <td className="px-3 py-2 text-slate-300">{location.type_emplacement}</td>
                        <td className="px-3 py-2 text-muted">
                          {[location.zone, location.allee, location.rayon, location.niveau, location.position].filter(Boolean).join(' / ') || '—'}
                        </td>
                        <td className="px-3 py-2 text-muted">{location.capacite_m3 != null ? `${location.capacite_m3} m3` : '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${location.actif ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                            {location.actif ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => void toggleLocationActive(location)}
                                className="text-xs text-indigo-300 hover:text-indigo-200"
                              >
                                {location.actif ? 'Desactiver' : 'Activer'}
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteLocation(location.id)}
                                className="text-xs text-rose-300 hover:text-rose-200"
                              >
                                Supprimer
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Onglet En centre ───────────────────────────────────────── */}
        {tab === 'en_depot' && (
          <div className="space-y-3">
            {relaisLoading ? (
              <div className="text-discreet text-sm py-8 text-center">Chargement...</div>
            ) : relaisDepot.length === 0 ? (
              <div className="text-discreet text-sm py-12 text-center">Aucune marchandise en centre actuellement.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-discreet text-xs border-b border-slate-800">
                      <th className="pb-2 pr-4 font-medium">OT</th>
                      <th className="pb-2 pr-4 font-medium">Site / Lieu</th>
                      <th className="pb-2 pr-4 font-medium">Conducteur centre</th>
                      <th className="pb-2 pr-4 font-medium">Date centre</th>
                      <th className="pb-2 pr-4 font-medium">Reprise prévue</th>
                      <th className="pb-2 pr-4 font-medium">Conducteur reprise</th>
                      <th className="pb-2 pr-4 font-medium">Statut</th>
                      {canEdit && <th className="pb-2 font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {relaisDepot.map(r => (
                      <tr key={r.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 pr-4 text-slate-300 font-mono text-xs">{r.ot_id?.slice(0, 8) ?? '—'}</td>
                        <td className="py-2.5 pr-4 text-slate-300">{siteName(r.site_id) ?? r.lieu_libre_nom ?? r.lieu_libre_adresse ?? '—'}</td>
                        <td className="py-2.5 pr-4 text-muted">{conducteurName(r.conducteur_depose_id)}</td>
                        <td className="py-2.5 pr-4 text-muted">{fmt(r.date_depot)}</td>
                        <td className="py-2.5 pr-4 text-muted">{fmt(r.date_reprise_prevue)}</td>
                        <td className="py-2.5 pr-4 text-muted">{conducteurName(r.conducteur_reprise_id)}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUT_COLORS[r.statut]}`}>
                            {STATUT_LABELS[r.statut]}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="py-2.5">
                            <div className="flex gap-2">
                              {r.statut === 'en_attente' && (
                                <button onClick={() => openAssign(r)} type="button" className="text-xs px-2 py-1 rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 border border-blue-500/30 transition-colors">
                                  Assigner
                                </button>
                              )}
                              {(r.statut === 'assigne' || r.statut === 'en_cours_reprise') && (
                                <button onClick={() => updateStatut(r.id, 'termine')} type="button" className="text-xs px-2 py-1 rounded bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/40 border border-emerald-500/30 transition-colors">
                                  Terminer
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal site ──────────────────────────────────────────────────────── */}
      {siteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={submitSite} className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
              <h2 className="font-semibold text-slate-100">{siteModal.mode === 'create' ? 'Nouveau site logistique' : 'Modifier le site'}</h2>
              <button type="button" onClick={() => setSiteModal(null)} className="text-discreet hover:text-slate-300 text-xl">✕</button>
            </div>
            <div className="overflow-y-auto px-6 py-4 space-y-3 flex-1">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Entreprise rattachee (optionnel)</label>
                <select
                  value={siteForm.entreprise_id}
                  onChange={e => setSiteForm(prev => ({ ...prev, entreprise_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Centre interne du tenant (sans client)</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.nom}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-discreet">Renseigne une entreprise uniquement pour un site client de chargement/livraison.</p>
              </div>
              {([
                { label: 'Nom du site *', key: 'nom', placeholder: 'Ex: Centre Nord Lyon' },
                { label: 'Adresse *', key: 'adresse', placeholder: 'Rue, numéro...' },
                { label: 'Code postal', key: 'code_postal', placeholder: '69000' },
                { label: 'Ville', key: 'ville', placeholder: 'Marseille' },
                { label: 'Pays', key: 'pays', placeholder: 'France' },
                { label: 'Contact (nom)', key: 'contact_nom', placeholder: 'Jean Dupont' },
                { label: 'Contact (tél)', key: 'contact_tel', placeholder: '06 00 00 00 00' },
                { label: 'Capacité (m³)', key: 'capacite_m3', placeholder: '500' },
                { label: 'Horaires', key: 'horaires_ouverture', placeholder: 'Lun-Ven 8h-18h' },
              ] as { label: string; key: keyof typeof siteForm; placeholder: string }[]).map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-muted mb-1">{f.label}</label>
                  <input
                    value={String(siteForm[f.key])}
                    onChange={e => setSiteForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Type principal d'usage</label>
                <select
                  value={siteForm.type_site}
                  onChange={e => setSiteForm(prev => ({ ...prev, type_site: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {Object.entries(TYPE_SITE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <p className="mt-1 text-xs text-discreet">Le site restera disponible dans les vues centres.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Notes</label>
                <textarea
                  value={siteForm.notes}
                  onChange={e => setSiteForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder="Informations complémentaires..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              {/* ── Coordonnées GPS ── */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">Localisation GPS</span>
                  <button
                    type="button"
                    onClick={() => setShowMap(v => !v)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-indigo-300 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 21s6-5.8 6-11a6 6 0 1 0-12 0c0 5.2 6 11 6 11Z" /><circle cx="12" cy="10" r="2.2" /></svg>
                    {showMap ? 'Masquer la carte' : 'Sélectionner sur la carte'}
                  </button>
                </div>
                {showMap && (
                  <div className="rounded-xl overflow-hidden border border-slate-700">
                    <SiteMapPicker
                      onPick={({ latitude, longitude, adresse }) => {
                        setSiteForm(prev => ({
                          ...prev,
                          latitude: String(latitude),
                          longitude: String(longitude),
                          adresse: prev.adresse.trim() ? prev.adresse : adresse,
                        }))
                      }}
                    />
                  </div>
                )}
                {(siteForm.latitude || siteForm.longitude) && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-discreet mb-1">Latitude</label>
                      <input
                        value={siteForm.latitude}
                        onChange={e => setSiteForm(prev => ({ ...prev, latitude: e.target.value }))}
                        placeholder="48.8566"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-discreet mb-1">Longitude</label>
                      <input
                        value={siteForm.longitude}
                        onChange={e => setSiteForm(prev => ({ ...prev, longitude: e.target.value }))}
                        placeholder="2.3522"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={siteForm.est_depot_relais}
                  onChange={e => setSiteForm(prev => ({ ...prev, est_depot_relais: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-300">Activer les depots/relais depuis le planning</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800 flex-shrink-0">
              <button type="button" onClick={() => setSiteModal(null)} className="px-4 py-2 rounded-lg text-sm text-muted hover:text-slate-200 transition-colors">Annuler</button>
              <button type="submit" disabled={siteSaving} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {siteSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal assigner reprise ───────────────────────────────────────────── */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={submitAssign} className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="font-semibold text-slate-100">Assigner la reprise</h2>
              <button type="button" onClick={() => setAssignModal(null)} className="text-discreet hover:text-slate-300 text-xl">✕</button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Conducteur reprise</label>
                <select
                  value={assignForm.conducteur_reprise_id}
                  onChange={e => setAssignForm(prev => ({ ...prev, conducteur_reprise_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">— Sélectionner —</option>
                  {conducteurs.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Véhicule reprise</label>
                <select
                  value={assignForm.vehicule_reprise_id}
                  onChange={e => setAssignForm(prev => ({ ...prev, vehicule_reprise_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">— Sélectionner —</option>
                  {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Remorque (optionnel)</label>
                <select
                  value={assignForm.remorque_reprise_id}
                  onChange={e => setAssignForm(prev => ({ ...prev, remorque_reprise_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">— Aucune —</option>
                  {remorques.map(r => <option key={r.id} value={r.id}>{r.immatriculation}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Date reprise prévue</label>
                <input
                  type="datetime-local"
                  value={assignForm.date_reprise_prevue}
                  onChange={e => setAssignForm(prev => ({ ...prev, date_reprise_prevue: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800">
              <button type="button" onClick={() => setAssignModal(null)} className="px-4 py-2 rounded-lg text-sm text-muted hover:text-slate-200 transition-colors">Annuler</button>
              <button type="submit" disabled={assignSaving} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {assignSaving ? 'Enregistrement...' : 'Assigner'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
