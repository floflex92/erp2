import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { looseSupabase } from '@/lib/supabaseLoose'
import { getDemoSeedState, markDemoSeedState, resetDemoSeedState, seedTransportDemoData } from '@/lib/demoSeed'
import type { Tables, TablesInsert } from '@/lib/database.types'
import { STATUT_OPS } from '@/lib/statut-ops'

type Client = Tables<'clients'>
type Contact = Tables<'contacts'>
type AdresseClient = Tables<'adresses'>
type Facture = Tables<'factures'>
type OT = Tables<'ordres_transport'>

const TYPE_LABELS: Record<string, string> = {
  chargeur: 'Chargeur',
  transitaire: 'Transitaire',
  commissionnaire: 'Commissionnaire',
  autre: 'Autre',
}

const TYPE_COLORS: Record<string, string> = {
  chargeur: 'bg-blue-100 text-blue-700',
  transitaire: 'bg-purple-100 text-purple-700',
  commissionnaire: 'bg-orange-100 text-orange-700',
  autre: 'bg-slate-100 text-slate-600',
}

const MODE_PAIEMENT_LABELS: Record<string, string> = {
  virement: 'Virement',
  prelevement: 'Prelevement',
  cheque: 'Cheque',
  especes: 'Especes',
  traite: 'Traite',
  autre: 'Autre',
}

const TYPE_ECHEANCE_LABELS: Record<string, string> = {
  date_facture_plus_delai: 'Date facture + delai',
  fin_de_mois: 'Fin de mois',
  fin_de_mois_le_10: 'Fin de mois + 10',
  jour_fixe: 'Jour fixe',
  comptant: 'Comptant',
}

const LIEU_TYPE_LABELS: Record<string, string> = {
  enlevement: 'Enlevement',
  livraison: 'Livraison',
  autre: 'Autre',
}

const FACTURE_STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyee',
  payee: 'Payee',
  en_retard: 'En retard',
  annulee: 'Annulee',
}

const FACTURE_STATUT_COLORS: Record<string, string> = {
  brouillon: 'bg-slate-100 text-slate-600',
  envoyee: 'bg-blue-100 text-blue-700',
  payee: 'bg-green-100 text-green-700',
  en_retard: 'bg-red-100 text-red-700',
  annulee: 'bg-slate-100 text-slate-500',
}

const OT_STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  confirme: 'Confirme',
  planifie: 'Planifie',
  en_cours: 'En cours',
  livre: 'Livre',
  facture: 'Facture',
  annule: 'Annule',
}

const OT_STATUT_COLORS: Record<string, string> = {
  brouillon: 'bg-slate-100 text-slate-600',
  confirme: 'bg-blue-100 text-blue-700',
  planifie: 'bg-indigo-100 text-indigo-700',
  en_cours: 'bg-amber-100 text-amber-700',
  livre: 'bg-green-100 text-green-700',
  facture: 'bg-purple-100 text-purple-700',
  annule: 'bg-red-100 text-red-700',
}

const EMPTY_CLIENT: TablesInsert<'clients'> = {
  nom: '',
  code_client: null,
  type_client: 'chargeur',
  telephone: null,
  email: null,
  site_web: null,
  adresse: null,
  code_postal: null,
  ville: null,
  pays: 'France',
  adresse_facturation: null,
  code_postal_facturation: null,
  ville_facturation: null,
  pays_facturation: 'France',
  contact_facturation_nom: null,
  contact_facturation_email: null,
  contact_facturation_telephone: null,
  siret: null,
  tva_intra: null,
  conditions_paiement: 30,
  mode_paiement_defaut: 'virement',
  type_echeance: 'date_facture_plus_delai',
  jour_echeance: null,
  encours_max: null,
  taux_tva_defaut: 20,
  iban: null,
  bic: null,
  banque: null,
  titulaire_compte: null,
  notes: null,
  actif: true,
}

const EMPTY_CONTACT: Omit<TablesInsert<'contacts'>, 'client_id'> = {
  nom: '',
  prenom: null,
  poste: null,
  telephone: null,
  email: null,
  principal: false,
}

const EMPTY_ADDRESS: Omit<TablesInsert<'adresses'>, 'client_id'> = {
  nom_lieu: '',
  type_lieu: 'enlevement',
  adresse: null,
  code_postal: null,
  ville: '',
  pays: 'France',
  contact_nom: null,
  contact_tel: null,
  horaires: null,
  instructions: null,
  latitude: null,
  longitude: null,
  actif: true,
}

const inp = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300'

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Non renseigne'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : 'Non renseigne'
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Non renseigne'
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function operationalStatusLabel(value: string | null | undefined) {
  if (!value) return 'Sans suivi live'
  const token = value as keyof typeof STATUT_OPS
  return token in STATUT_OPS ? STATUT_OPS[token].label : value
}

function formatPaymentSummary(client: Pick<Client, 'mode_paiement_defaut' | 'conditions_paiement' | 'type_echeance' | 'jour_echeance'>) {
  const mode = client.mode_paiement_defaut ? MODE_PAIEMENT_LABELS[client.mode_paiement_defaut] ?? client.mode_paiement_defaut : 'Non renseigne'
  const delai = client.conditions_paiement !== null ? `${client.conditions_paiement} j` : 'Delai libre'
  const echeance = client.type_echeance ? TYPE_ECHEANCE_LABELS[client.type_echeance] ?? client.type_echeance : 'Standard'
  const fixedDay = client.type_echeance === 'jour_fixe' && client.jour_echeance ? ` le ${client.jour_echeance}` : ''
  return `${mode} - ${delai} - ${echeance}${fixedDay}`
}

function sanitizeClientPayload(form: TablesInsert<'clients'>): TablesInsert<'clients'> {
  return {
    ...form,
    nom: form.nom.trim(),
    code_client: form.code_client?.trim().toUpperCase() || null,
    telephone: form.telephone?.trim() || null,
    email: form.email?.trim().toLowerCase() || null,
    site_web: form.site_web?.trim() || null,
    adresse: form.adresse?.trim() || null,
    code_postal: form.code_postal?.trim() || null,
    ville: form.ville?.trim() || null,
    pays: form.pays?.trim() || null,
    adresse_facturation: form.adresse_facturation?.trim() || null,
    code_postal_facturation: form.code_postal_facturation?.trim() || null,
    ville_facturation: form.ville_facturation?.trim() || null,
    pays_facturation: form.pays_facturation?.trim() || null,
    contact_facturation_nom: form.contact_facturation_nom?.trim() || null,
    contact_facturation_email: form.contact_facturation_email?.trim().toLowerCase() || null,
    contact_facturation_telephone: form.contact_facturation_telephone?.trim() || null,
    siret: form.siret?.trim() || null,
    tva_intra: form.tva_intra?.trim().toUpperCase() || null,
    mode_paiement_defaut: form.mode_paiement_defaut?.trim() || null,
    type_echeance: form.type_echeance?.trim() || null,
    iban: form.iban?.replace(/\s+/g, '').toUpperCase() || null,
    bic: form.bic?.replace(/\s+/g, '').toUpperCase() || null,
    banque: form.banque?.trim() || null,
    titulaire_compte: form.titulaire_compte?.trim() || null,
    notes: form.notes?.trim() || null,
  }
}

function clientFeatureError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback
  if (
    message.includes('adresse_facturation') ||
    message.includes('code_client') ||
    message.includes('mode_paiement_defaut') ||
    message.includes('type_echeance') ||
    message.includes('jour_echeance') ||
    message.includes('titulaire_compte') ||
    message.includes('iban') ||
    message.includes('bic') ||
    message.includes('banque') ||
    message.includes('contact_facturation')
  ) {
    return 'La fiche client complete necessite la migration Supabase clients commerciaux avant utilisation.'
  }
  return message || fallback
}

export default function Clients() {
  const [list, setList] = useState<Client[]>([])
  const [adresses, setAdresses] = useState<AdresseClient[]>([])
  const [factures, setFactures] = useState<Facture[]>([])
  const [courses, setCourses] = useState<OT[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TablesInsert<'clients'>>(EMPTY_CLIENT)
  const [saving, setSaving] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [loadingDossier, setLoadingDossier] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [dossierError, setDossierError] = useState<string | null>(null)
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT)
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS)
  const [seedStatus, setSeedStatus] = useState<'running' | 'done' | 'failed' | 'skipped' | null>(() => getDemoSeedState())
  const [seeding, setSeeding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [clientsRes, adressesRes, facturesRes, coursesRes] = await Promise.all([
        supabase.from('clients').select('*').order('nom'),
        supabase.from('adresses').select('*').order('nom_lieu'),
        supabase.from('factures').select('*').order('date_emission', { ascending: false }),
        supabase.from('ordres_transport').select('*').order('created_at', { ascending: false }),
      ])

      if (clientsRes.error) throw clientsRes.error
      if (adressesRes.error) throw adressesRes.error
      if (facturesRes.error) throw facturesRes.error
      if (coursesRes.error) throw coursesRes.error

      setList(clientsRes.data ?? [])
      setAdresses(adressesRes.data ?? [])
      setFactures(facturesRes.data ?? [])
      setCourses(coursesRes.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [])

  async function loadContacts(clientId: string) {
    setLoadingDossier(true)
    setDossierError(null)

    try {
      const { data, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('client_id', clientId)
        .order('principal', { ascending: false })
        .order('nom')

      if (contactsError) throw contactsError
      setContacts(data ?? [])
    } catch (err) {
      setContacts([])
      setDossierError(err instanceof Error ? err.message : 'Chargement du dossier client impossible.')
    } finally {
      setLoadingDossier(false)
    }
  }

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const db = looseSupabase
    let timerId: number | null = null
    const scheduleReload = () => {
      if (timerId !== null) window.clearTimeout(timerId)
      timerId = window.setTimeout(() => {
        void load()
      }, 280)
    }

    const channel = db
      .channel('clients-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordres_transport' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historique_statuts' }, scheduleReload)
      .subscribe()

    return () => {
      if (timerId !== null) window.clearTimeout(timerId)
      void supabase.removeChannel(channel)
    }
  }, [load])

  const factureStatsMap = useMemo(() => {
    const map = new Map<string, { total: number; overdue: number; outstanding: number }>()

    factures.forEach(facture => {
      const current = map.get(facture.client_id) ?? { total: 0, overdue: 0, outstanding: 0 }
      current.total += 1

      const dueAmount = facture.montant_ttc ?? facture.montant_ht
      const isOutstanding = facture.statut === 'envoyee' || facture.statut === 'en_retard'
      const isLate = facture.statut === 'en_retard' || (
        facture.statut === 'envoyee' &&
        facture.date_echeance !== null &&
        new Date(facture.date_echeance).getTime() < Date.now()
      )

      if (isOutstanding) current.outstanding += dueAmount
      if (isLate) current.overdue += 1
      map.set(facture.client_id, current)
    })

    return map
  }, [factures])

  const courseStatsMap = useMemo(() => {
    const map = new Map<string, { total: number; active: number; ca: number }>()

    courses.forEach(course => {
      const current = map.get(course.client_id) ?? { total: 0, active: 0, ca: 0 }
      current.total += 1
      if (['brouillon', 'confirme', 'en_cours'].includes(course.statut)) current.active += 1
      current.ca += course.prix_ht ?? 0
      map.set(course.client_id, current)
    })

    return map
  }, [courses])

  const addressStatsMap = useMemo(() => {
    const map = new Map<string, { total: number; enlevement: number; livraison: number }>()

    adresses.forEach(address => {
      if (!address.client_id) return
      const current = map.get(address.client_id) ?? { total: 0, enlevement: 0, livraison: 0 }
      current.total += 1
      if (address.type_lieu === 'enlevement') current.enlevement += 1
      if (address.type_lieu === 'livraison') current.livraison += 1
      map.set(address.client_id, current)
    })

    return map
  }, [adresses])

  const otReferenceMap = useMemo(
    () => Object.fromEntries(courses.map(course => [course.id, course.reference])),
    [courses],
  )

  const selectedClient = useMemo(
    () => list.find(client => client.id === editingId) ?? null,
    [editingId, list],
  )

  const clientAddresses = useMemo(
    () => adresses.filter(address => address.client_id === editingId),
    [adresses, editingId],
  )

  const clientFactures = useMemo(
    () => factures.filter(facture => facture.client_id === editingId),
    [editingId, factures],
  )

  const clientCourses = useMemo(
    () => courses.filter(course => course.client_id === editingId),
    [courses, editingId],
  )

  const pickupAddresses = clientAddresses.filter(address => address.type_lieu === 'enlevement')
  const deliveryAddresses = clientAddresses.filter(address => address.type_lieu === 'livraison')
  const otherAddresses = clientAddresses.filter(address => !['enlevement', 'livraison'].includes(address.type_lieu ?? ''))

  const filtered = list.filter(client => {
    const haystack = [
      client.nom,
      client.code_client,
      client.ville,
      client.siret,
      client.tva_intra,
      client.email,
      client.telephone,
      client.banque,
      client.iban,
      client.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(search.toLowerCase().trim())
  })

  const stats = {
    actifs: list.filter(client => client.actif).length,
    rib: list.filter(client => Boolean(client.iban || client.bic)).length,
    facturesEnRetard: factures.filter(facture => {
      if (facture.statut === 'en_retard') return true
      if (facture.statut !== 'envoyee' || !facture.date_echeance) return false
      return new Date(facture.date_echeance).getTime() < Date.now()
    }).length,
    coursesActives: courses.filter(course => ['brouillon', 'confirme', 'en_cours'].includes(course.statut)).length,
  }

  function resetFeedback() {
    setError(null)
    setNotice(null)
  }

  async function injectDemoData() {
    resetFeedback()
    setSeeding(true)
    setSeedStatus('running')
    markDemoSeedState('running')

    try {
      const result = await seedTransportDemoData()
      markDemoSeedState('done')
      setSeedStatus('done')
      setNotice(
        `Donnees de demo rechargees: ${result.clients} clients, ${result.conducteurs} conducteurs, ${result.vehicules} camions, ${result.remorques} remorques${result.users ? `, ${result.users} utilisateurs demo` : ''}.`,
      )
      await load()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Injection des donnees de demo impossible.'
      const isRlsError = message.toLowerCase().includes('row-level security') || message.toLowerCase().includes('permission')

      markDemoSeedState('failed')
      setSeedStatus('failed')
      setError(
        isRlsError
          ? "La session actuelle n'a pas les droits d'ecriture necessaires pour injecter les donnees de demo."
          : message,
      )
    } finally {
      setSeeding(false)
    }
  }

  function unlockDemoSeed() {
    resetDemoSeedState()
    setSeedStatus(null)
    setNotice("L'etat local du seed a ete reinitialise. Tu peux relancer l'injection.")
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_CLIENT)
    setContacts([])
    setContactForm(EMPTY_CONTACT)
    setAddressForm(EMPTY_ADDRESS)
    setDossierError(null)
  }

  function openCreate() {
    resetFeedback()
    closeForm()
    setShowForm(true)
  }

  function openEdit(client: Client) {
    resetFeedback()
    setEditingId(client.id)
    setForm({
      nom: client.nom,
      code_client: client.code_client ?? null,
      type_client: client.type_client,
      telephone: client.telephone,
      email: client.email,
      site_web: client.site_web,
      adresse: client.adresse,
      code_postal: client.code_postal,
      ville: client.ville,
      pays: client.pays,
      adresse_facturation: client.adresse_facturation ?? null,
      code_postal_facturation: client.code_postal_facturation ?? null,
      ville_facturation: client.ville_facturation ?? null,
      pays_facturation: client.pays_facturation ?? null,
      contact_facturation_nom: client.contact_facturation_nom ?? null,
      contact_facturation_email: client.contact_facturation_email ?? null,
      contact_facturation_telephone: client.contact_facturation_telephone ?? null,
      siret: client.siret,
      tva_intra: client.tva_intra,
      conditions_paiement: client.conditions_paiement,
      mode_paiement_defaut: client.mode_paiement_defaut ?? null,
      type_echeance: client.type_echeance ?? null,
      jour_echeance: client.jour_echeance ?? null,
      encours_max: client.encours_max,
      taux_tva_defaut: client.taux_tva_defaut,
      iban: client.iban ?? null,
      bic: client.bic ?? null,
      banque: client.banque ?? null,
      titulaire_compte: client.titulaire_compte ?? null,
      notes: client.notes,
      actif: client.actif,
    })
    setContacts([])
    setContactForm(EMPTY_CONTACT)
    setAddressForm(EMPTY_ADDRESS)
    setDossierError(null)
    setShowForm(true)
    void loadContacts(client.id)
  }

  function setF<K extends keyof TablesInsert<'clients'>>(key: K, value: TablesInsert<'clients'>[K]) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    resetFeedback()

    const payload = sanitizeClientPayload(form)
    if (!payload.nom) {
      setError('Le nom du client est obligatoire.')
      return
    }

    setSaving(true)

    try {
      const query = editingId
        ? supabase.from('clients').update(payload).eq('id', editingId)
        : supabase.from('clients').insert(payload)

      const { error: saveError } = await query
      if (saveError) throw saveError

      setNotice(editingId ? 'Client mis a jour.' : 'Client ajoute.')
      closeForm()
      await load()
    } catch (err) {
      setError(clientFeatureError(err, 'Enregistrement impossible.'))
    } finally {
      setSaving(false)
    }
  }

  async function del(clientId: string) {
    resetFeedback()
    if (!confirm('Supprimer ce client ?')) return

    try {
      const { error: deleteError } = await supabase.from('clients').delete().eq('id', clientId)
      if (deleteError) throw deleteError
      setNotice('Client supprime.')
      if (editingId === clientId) closeForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.')
    }
  }

  async function toggleActif(client: Client) {
    resetFeedback()

    try {
      const { error: updateError } = await supabase.from('clients').update({ actif: !client.actif }).eq('id', client.id)
      if (updateError) throw updateError
      if (selectedClient?.id === client.id) {
        setForm(current => ({ ...current, actif: !client.actif }))
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise a jour impossible.')
    }
  }

  async function submitContact(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return

    setSavingContact(true)
    setDossierError(null)

    try {
      if (contactForm.principal) {
        const { error: resetError } = await supabase.from('contacts').update({ principal: false }).eq('client_id', editingId)
        if (resetError) throw resetError
      }

      const payload: TablesInsert<'contacts'> = {
        client_id: editingId,
        nom: contactForm.nom.trim(),
        prenom: contactForm.prenom?.trim() || null,
        poste: contactForm.poste?.trim() || null,
        telephone: contactForm.telephone?.trim() || null,
        email: contactForm.email?.trim().toLowerCase() || null,
        principal: contactForm.principal ?? false,
      }

      const { error: insertError } = await supabase.from('contacts').insert(payload)
      if (insertError) throw insertError

      setNotice('Contact ajoute.')
      setContactForm(EMPTY_CONTACT)
      await loadContacts(editingId)
    } catch (err) {
      setDossierError(err instanceof Error ? err.message : 'Enregistrement du contact impossible.')
    } finally {
      setSavingContact(false)
    }
  }

  async function makePrimary(contactId: string) {
    if (!editingId) return

    try {
      const { error: resetError } = await supabase.from('contacts').update({ principal: false }).eq('client_id', editingId)
      if (resetError) throw resetError

      const { error: updateError } = await supabase.from('contacts').update({ principal: true }).eq('id', contactId)
      if (updateError) throw updateError

      await loadContacts(editingId)
    } catch (err) {
      setDossierError(err instanceof Error ? err.message : 'Mise a jour du contact impossible.')
    }
  }

  async function delContact(contactId: string) {
    if (!editingId || !confirm('Supprimer ce contact ?')) return

    try {
      const { error: deleteError } = await supabase.from('contacts').delete().eq('id', contactId)
      if (deleteError) throw deleteError
      setNotice('Contact supprime.')
      await loadContacts(editingId)
    } catch (err) {
      setDossierError(err instanceof Error ? err.message : 'Suppression du contact impossible.')
    }
  }

  async function submitAddress(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return

    setSavingAddress(true)
    setDossierError(null)

    try {
      const payload: TablesInsert<'adresses'> = {
        client_id: editingId,
        nom_lieu: addressForm.nom_lieu.trim(),
        type_lieu: addressForm.type_lieu?.trim() || 'autre',
        adresse: addressForm.adresse?.trim() || null,
        code_postal: addressForm.code_postal?.trim() || null,
        ville: addressForm.ville.trim(),
        pays: addressForm.pays?.trim() || null,
        contact_nom: addressForm.contact_nom?.trim() || null,
        contact_tel: addressForm.contact_tel?.trim() || null,
        horaires: addressForm.horaires?.trim() || null,
        instructions: addressForm.instructions?.trim() || null,
        actif: addressForm.actif ?? true,
      }

      const { error: insertError } = await supabase.from('adresses').insert(payload)
      if (insertError) throw insertError

      setNotice('Lieu client ajoute.')
      setAddressForm(EMPTY_ADDRESS)
      await load()
    } catch (err) {
      setDossierError(err instanceof Error ? err.message : 'Enregistrement du lieu impossible.')
    } finally {
      setSavingAddress(false)
    }
  }

  async function toggleAddressActif(address: AdresseClient) {
    try {
      const { error: updateError } = await supabase.from('adresses').update({ actif: !address.actif }).eq('id', address.id)
      if (updateError) throw updateError
      await load()
    } catch (err) {
      setDossierError(err instanceof Error ? err.message : 'Mise a jour du lieu impossible.')
    }
  }

  async function delAddress(addressId: string) {
    if (!confirm('Supprimer ce lieu client ?')) return

    try {
      const { error: deleteError } = await supabase.from('adresses').delete().eq('id', addressId)
      if (deleteError) throw deleteError
      setNotice('Lieu client supprime.')
      await load()
    } catch (err) {
      setDossierError(err instanceof Error ? err.message : 'Suppression du lieu impossible.')
    }
  }

  function copyMainAddressToBilling() {
    setForm(current => ({
      ...current,
      adresse_facturation: current.adresse ?? null,
      code_postal_facturation: current.code_postal ?? null,
      ville_facturation: current.ville ?? null,
      pays_facturation: current.pays ?? null,
    }))
  }

  const currentInvoiceTotal = clientFactures.reduce((sum, facture) => sum + (facture.montant_ttc ?? facture.montant_ht), 0)
  const currentOutstanding = clientFactures
    .filter(facture => ['envoyee', 'en_retard'].includes(facture.statut))
    .reduce((sum, facture) => sum + (facture.montant_ttc ?? facture.montant_ht), 0)
  const currentCourseCa = clientCourses.reduce((sum, course) => sum + (course.prix_ht ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clients</h2>
          <p className="text-sm text-slate-500">{list.length} client{list.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          + Ajouter
        </button>
      </div>

      {typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname) && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-950">Donnees de demonstration transport</p>
              <p className="mt-1 text-xs text-indigo-900/80">
                Le nouveau mock data ne s'etait pas injecte en silence. Cette action force le rechargement des clients, lieux, factures, OT, conducteurs, camions et remorques.
              </p>
              <p className="mt-2 text-xs text-indigo-900/70">
                Etat local: {seedStatus ?? 'aucun'}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void injectDemoData()}
                disabled={seeding}
                className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {seeding ? 'Injection...' : 'Injecter les donnees demo'}
              </button>
              <button
                type="button"
                onClick={unlockDemoSeed}
                className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-800 transition-colors hover:bg-indigo-100"
              >
                Reinitialiser l'etat local
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clients actifs" value={stats.actifs} tone="emerald" />
        <StatCard label="Clients avec RIB" value={stats.rib} tone="slate" />
        <StatCard label="Factures en retard" value={stats.facturesEnRetard} tone="amber" />
        <StatCard label="Courses actives" value={stats.coursesActives} tone="blue" />
      </div>

      <input
        type="text"
        placeholder="Nom, code client, ville, SIRET, TVA, banque..."
        value={search}
        onChange={event => setSearch(event.target.value)}
        className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            {search ? 'Aucun resultat.' : 'Aucun client enregistre.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {['Client', 'Paiement', 'Lieux', 'Facturation', 'Courses', 'Statut', ''].map(header => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, index) => {
                const factureStats = factureStatsMap.get(client.id) ?? { total: 0, overdue: 0, outstanding: 0 }
                const courseStats = courseStatsMap.get(client.id) ?? { total: 0, active: 0, ca: 0 }
                const addressStats = addressStatsMap.get(client.id) ?? { total: 0, enlevement: 0, livraison: 0 }

                return (
                  <tr
                    key={client.id}
                    onClick={() => openEdit(client)}
                    className={`cursor-pointer border-t border-slate-100 transition-colors hover:bg-blue-50 ${
                      index % 2 !== 0 ? 'bg-slate-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{client.nom}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[client.type_client] ?? 'bg-slate-100 text-slate-600'}`}>
                          {TYPE_LABELS[client.type_client] ?? client.type_client}
                        </span>
                        {client.code_client && <span className="text-xs font-mono text-slate-400">{client.code_client}</span>}
                      </div>
                      {(client.ville || client.telephone) && (
                        <div className="mt-1 text-xs text-slate-400">
                          {[client.ville, client.telephone].filter(Boolean).join(' - ')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div>{client.mode_paiement_defaut ? MODE_PAIEMENT_LABELS[client.mode_paiement_defaut] ?? client.mode_paiement_defaut : 'Non renseigne'}</div>
                      <div className="mt-1 text-slate-400">{client.conditions_paiement !== null ? `${client.conditions_paiement} j` : 'Delai libre'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div>{addressStats.total} lieu{addressStats.total > 1 ? 'x' : ''}</div>
                      <div className="mt-1 text-slate-400">
                        {addressStats.enlevement} enl. / {addressStats.livraison} liv.
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div>{factureStats.total} facture{factureStats.total > 1 ? 's' : ''}</div>
                      <div className={`mt-1 ${factureStats.overdue > 0 ? 'font-medium text-red-600' : 'text-slate-400'}`}>
                        {factureStats.overdue} en retard
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div>{courseStats.total} course{courseStats.total > 1 ? 's' : ''}</div>
                      <div className="mt-1 text-slate-400">{courseStats.active} active{courseStats.active > 1 ? 's' : ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${client.actif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {client.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation()
                          void del(client.id)
                        }}
                        className="text-xs text-slate-400 transition-colors hover:text-red-500"
                      >
                        Suppr.
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b p-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {editingId ? 'Fiche client' : 'Ajouter un client'}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Adresse principale, facturation, conditions de paiement, RIB, lieux de chargement et de livraison.
                </p>
              </div>
              <button type="button" onClick={closeForm} className="text-slate-400 transition-colors hover:text-slate-600">
                X
              </button>
            </div>

            <form onSubmit={submit} className="p-6">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <SectionTitle title="Identite client" subtitle="Raison sociale, typologie et coordonnees generales." />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Raison sociale *">
                    <input className={inp} value={form.nom} onChange={event => setF('nom', event.target.value)} required />
                  </Field>
                  <Field label="Code client">
                    <input className={inp} value={form.code_client ?? ''} onChange={event => setF('code_client', event.target.value || null)} />
                  </Field>
                  <Field label="Type client">
                    <select className={inp} value={form.type_client ?? 'chargeur'} onChange={event => setF('type_client', event.target.value)}>
                      {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  <Field label="Statut">
                    <select className={inp} value={form.actif ? 'actif' : 'inactif'} onChange={event => setF('actif', event.target.value === 'actif')}>
                      <option value="actif">Actif</option>
                      <option value="inactif">Inactif</option>
                    </select>
                  </Field>
                  <Field label="Telephone">
                    <input className={inp} value={form.telephone ?? ''} onChange={event => setF('telephone', event.target.value || null)} />
                  </Field>
                  <Field label="Email">
                    <input className={inp} type="email" value={form.email ?? ''} onChange={event => setF('email', event.target.value || null)} />
                  </Field>
                  <Field label="Site web">
                    <input className={inp} value={form.site_web ?? ''} onChange={event => setF('site_web', event.target.value || null)} />
                  </Field>
                  <Field label="SIRET">
                    <input className={inp} value={form.siret ?? ''} onChange={event => setF('siret', event.target.value || null)} />
                  </Field>
                  <Field label="TVA intracommunautaire">
                    <input className={inp} value={form.tva_intra ?? ''} onChange={event => setF('tva_intra', event.target.value || null)} />
                  </Field>
                </div>

                <SectionTitle title="Adresse principale" subtitle="Adresse administrative ou siege du client." />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Field label="Adresse">
                      <input className={inp} value={form.adresse ?? ''} onChange={event => setF('adresse', event.target.value || null)} />
                    </Field>
                  </div>
                  <Field label="Code postal">
                    <input className={inp} value={form.code_postal ?? ''} onChange={event => setF('code_postal', event.target.value || null)} />
                  </Field>
                  <Field label="Ville">
                    <input className={inp} value={form.ville ?? ''} onChange={event => setF('ville', event.target.value || null)} />
                  </Field>
                  <Field label="Pays">
                    <input className={inp} value={form.pays ?? 'France'} onChange={event => setF('pays', event.target.value || null)} />
                  </Field>
                </div>

                <SectionTitle title="Facturation et reglement" subtitle="Adresse de facturation, contact comptable, echeances et encours." />
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={copyMainAddressToBilling}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      Copier adresse principale
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Field label="Adresse de facturation">
                        <input className={inp} value={form.adresse_facturation ?? ''} onChange={event => setF('adresse_facturation', event.target.value || null)} />
                      </Field>
                    </div>
                    <Field label="Code postal facturation">
                      <input className={inp} value={form.code_postal_facturation ?? ''} onChange={event => setF('code_postal_facturation', event.target.value || null)} />
                    </Field>
                    <Field label="Ville facturation">
                      <input className={inp} value={form.ville_facturation ?? ''} onChange={event => setF('ville_facturation', event.target.value || null)} />
                    </Field>
                    <Field label="Pays facturation">
                      <input className={inp} value={form.pays_facturation ?? 'France'} onChange={event => setF('pays_facturation', event.target.value || null)} />
                    </Field>
                    <Field label="Contact facturation">
                      <input className={inp} value={form.contact_facturation_nom ?? ''} onChange={event => setF('contact_facturation_nom', event.target.value || null)} />
                    </Field>
                    <Field label="Email facturation">
                      <input className={inp} type="email" value={form.contact_facturation_email ?? ''} onChange={event => setF('contact_facturation_email', event.target.value || null)} />
                    </Field>
                    <Field label="Telephone facturation">
                      <input className={inp} value={form.contact_facturation_telephone ?? ''} onChange={event => setF('contact_facturation_telephone', event.target.value || null)} />
                    </Field>
                    <Field label="Mode de paiement">
                      <select className={inp} value={form.mode_paiement_defaut ?? ''} onChange={event => setF('mode_paiement_defaut', event.target.value || null)}>
                        <option value="">Non renseigne</option>
                        {Object.entries(MODE_PAIEMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </Field>
                    <Field label="Delai paiement (jours)">
                      <input className={inp} type="number" value={form.conditions_paiement ?? ''} onChange={event => setF('conditions_paiement', event.target.value ? Number.parseInt(event.target.value, 10) : null)} />
                    </Field>
                    <Field label="Type d'echeance">
                      <select className={inp} value={form.type_echeance ?? ''} onChange={event => setF('type_echeance', event.target.value || null)}>
                        <option value="">Non renseigne</option>
                        {Object.entries(TYPE_ECHEANCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </Field>
                    <Field label="Jour fixe echeance">
                      <input className={inp} type="number" min={1} max={31} value={form.jour_echeance ?? ''} onChange={event => setF('jour_echeance', event.target.value ? Number.parseInt(event.target.value, 10) : null)} />
                    </Field>
                    <Field label="Encours maximum">
                      <input className={inp} type="number" step="0.01" value={form.encours_max ?? ''} onChange={event => setF('encours_max', event.target.value ? Number.parseFloat(event.target.value) : null)} />
                    </Field>
                    <Field label="TVA par defaut (%)">
                      <input className={inp} type="number" step="0.01" value={form.taux_tva_defaut ?? ''} onChange={event => setF('taux_tva_defaut', event.target.value ? Number.parseFloat(event.target.value) : null)} />
                    </Field>
                  </div>
                </div>

                <SectionTitle title="Coordonnees bancaires" subtitle="RIB client pour les prelevements, remboursements ou controle comptable." />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Titulaire du compte">
                    <input className={inp} value={form.titulaire_compte ?? ''} onChange={event => setF('titulaire_compte', event.target.value || null)} />
                  </Field>
                  <Field label="Banque">
                    <input className={inp} value={form.banque ?? ''} onChange={event => setF('banque', event.target.value || null)} />
                  </Field>
                  <Field label="IBAN">
                    <input className={inp} value={form.iban ?? ''} onChange={event => setF('iban', event.target.value || null)} />
                  </Field>
                  <Field label="BIC">
                    <input className={inp} value={form.bic ?? ''} onChange={event => setF('bic', event.target.value || null)} />
                  </Field>
                </div>

                <div className="xl:col-span-2">
                  <SectionTitle title="Notes" subtitle="Consignes commerciales, particularites client ou remarques internes." />
                  <Field label="Notes">
                    <textarea className={`${inp} min-h-24 resize-none`} value={form.notes ?? ''} onChange={event => setF('notes', event.target.value || null)} />
                  </Field>
                </div>
              </div>

              {editingId && selectedClient && (
                <div className="mt-8 space-y-6 border-t pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Dossier client</p>
                      <p className="text-xs text-slate-400">Contacts, lieux d'enlevement et de livraison, factures et courses.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActif(selectedClient)}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${selectedClient.actif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {selectedClient.actif ? 'Actif' : 'Inactif'}
                      </button>
                      {loadingDossier && <span className="text-xs text-slate-400">Chargement...</span>}
                    </div>
                  </div>

                  {dossierError && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{dossierError}</div>}

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Contacts" value={contacts.length} tone="slate" />
                    <StatCard label="Lieux clients" value={clientAddresses.length} tone="blue" />
                    <StatCard label="Factures ouvertes" value={formatCurrency(currentOutstanding)} tone="amber" />
                    <StatCard label="CA courses" value={formatCurrency(currentCourseCa)} tone="emerald" />
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <div className="space-y-6">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h4 className="text-sm font-semibold text-slate-800">Contacts client</h4>
                        <form onSubmit={submitContact} className="mt-4 space-y-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Field label="Nom *">
                              <input className={inp} value={contactForm.nom} onChange={event => setContactForm(current => ({ ...current, nom: event.target.value }))} required />
                            </Field>
                            <Field label="Prenom">
                              <input className={inp} value={contactForm.prenom ?? ''} onChange={event => setContactForm(current => ({ ...current, prenom: event.target.value || null }))} />
                            </Field>
                            <Field label="Poste">
                              <input className={inp} value={contactForm.poste ?? ''} onChange={event => setContactForm(current => ({ ...current, poste: event.target.value || null }))} />
                            </Field>
                            <Field label="Telephone">
                              <input className={inp} value={contactForm.telephone ?? ''} onChange={event => setContactForm(current => ({ ...current, telephone: event.target.value || null }))} />
                            </Field>
                            <div className="md:col-span-2">
                              <Field label="Email">
                                <input className={inp} type="email" value={contactForm.email ?? ''} onChange={event => setContactForm(current => ({ ...current, email: event.target.value || null }))} />
                              </Field>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-slate-600">
                            <input type="checkbox" checked={contactForm.principal ?? false} onChange={event => setContactForm(current => ({ ...current, principal: event.target.checked }))} />
                            Contact principal
                          </label>
                          <div className="flex justify-end">
                            <button type="submit" disabled={savingContact} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-700 disabled:opacity-50">
                              {savingContact ? 'Enregistrement...' : 'Ajouter contact'}
                            </button>
                          </div>
                        </form>

                        <div className="mt-4 space-y-2">
                          {contacts.length === 0 ? (
                            <p className="text-xs text-slate-400">Aucun contact enregistre.</p>
                          ) : contacts.map(contact => (
                            <div key={contact.id} className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-800">
                                      {[contact.prenom, contact.nom].filter(Boolean).join(' ')}
                                    </span>
                                    {contact.principal && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">Principal</span>}
                                  </div>
                                  {contact.poste && <div className="mt-1 text-xs text-slate-500">{contact.poste}</div>}
                                  <div className="mt-1 text-xs text-slate-500">{[contact.telephone, contact.email].filter(Boolean).join(' - ') || 'Aucune coordonnee'}</div>
                                </div>
                                <div className="flex gap-2">
                                  {!contact.principal && (
                                    <button type="button" onClick={() => void makePrimary(contact.id)} className="text-xs text-slate-400 hover:text-slate-700">
                                      Principal
                                    </button>
                                  )}
                                  <button type="button" onClick={() => void delContact(contact.id)} className="text-xs text-slate-400 hover:text-red-500">
                                    Suppr.
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h4 className="text-sm font-semibold text-slate-800">Lieux d'enlevement et de livraison</h4>
                        <form onSubmit={submitAddress} className="mt-4 space-y-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Field label="Type de lieu">
                              <select className={inp} value={addressForm.type_lieu ?? 'enlevement'} onChange={event => setAddressForm(current => ({ ...current, type_lieu: event.target.value }))}>
                                {Object.entries(LIEU_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                              </select>
                            </Field>
                            <Field label="Nom du lieu *">
                              <input className={inp} value={addressForm.nom_lieu} onChange={event => setAddressForm(current => ({ ...current, nom_lieu: event.target.value }))} required />
                            </Field>
                            <div className="md:col-span-2">
                              <Field label="Adresse">
                                <input className={inp} value={addressForm.adresse ?? ''} onChange={event => setAddressForm(current => ({ ...current, adresse: event.target.value || null }))} />
                              </Field>
                            </div>
                            <Field label="Code postal">
                              <input className={inp} value={addressForm.code_postal ?? ''} onChange={event => setAddressForm(current => ({ ...current, code_postal: event.target.value || null }))} />
                            </Field>
                            <Field label="Ville *">
                              <input className={inp} value={addressForm.ville} onChange={event => setAddressForm(current => ({ ...current, ville: event.target.value }))} required />
                            </Field>
                            <Field label="Pays">
                              <input className={inp} value={addressForm.pays ?? 'France'} onChange={event => setAddressForm(current => ({ ...current, pays: event.target.value || null }))} />
                            </Field>
                            <Field label="Contact sur site">
                              <input className={inp} value={addressForm.contact_nom ?? ''} onChange={event => setAddressForm(current => ({ ...current, contact_nom: event.target.value || null }))} />
                            </Field>
                            <Field label="Telephone sur site">
                              <input className={inp} value={addressForm.contact_tel ?? ''} onChange={event => setAddressForm(current => ({ ...current, contact_tel: event.target.value || null }))} />
                            </Field>
                            <Field label="Horaires">
                              <input className={inp} value={addressForm.horaires ?? ''} onChange={event => setAddressForm(current => ({ ...current, horaires: event.target.value || null }))} />
                            </Field>
                            <div className="md:col-span-2">
                              <Field label="Instructions">
                                <textarea className={`${inp} min-h-20 resize-none`} value={addressForm.instructions ?? ''} onChange={event => setAddressForm(current => ({ ...current, instructions: event.target.value || null }))} />
                              </Field>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-slate-600">
                            <input type="checkbox" checked={addressForm.actif ?? true} onChange={event => setAddressForm(current => ({ ...current, actif: event.target.checked }))} />
                            Lieu actif
                          </label>
                          <div className="flex justify-end">
                            <button type="submit" disabled={savingAddress} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-700 disabled:opacity-50">
                              {savingAddress ? 'Enregistrement...' : 'Ajouter lieu'}
                            </button>
                          </div>
                        </form>

                        <div className="mt-4 space-y-4">
                          <AddressGroup title="Enlevement" items={pickupAddresses} onToggle={toggleAddressActif} onDelete={delAddress} />
                          <AddressGroup title="Livraison" items={deliveryAddresses} onToggle={toggleAddressActif} onDelete={delAddress} />
                          <AddressGroup title="Autres lieux" items={otherAddresses} onToggle={toggleAddressActif} onDelete={delAddress} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h4 className="text-sm font-semibold text-slate-800">Visualisation des factures</h4>
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                          <MiniInfo label="Factures" value={clientFactures.length.toString()} />
                          <MiniInfo label="Total facture" value={formatCurrency(currentInvoiceTotal)} />
                          <MiniInfo label="A encaisser" value={formatCurrency(currentOutstanding)} />
                        </div>

                        <div className="mt-4 space-y-2">
                          {clientFactures.length === 0 ? (
                            <p className="text-xs text-slate-400">Aucune facture liee a ce client.</p>
                          ) : clientFactures.slice(0, 10).map(facture => (
                            <div key={facture.id} className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-800">{facture.numero}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${FACTURE_STATUT_COLORS[facture.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                                      {FACTURE_STATUT_LABELS[facture.statut] ?? facture.statut}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    Emise le {formatDate(facture.date_emission)} - Echeance {formatDate(facture.date_echeance)}
                                  </div>
                                  {facture.ot_id && <div className="mt-1 text-xs text-slate-400">OT {otReferenceMap[facture.ot_id] ?? facture.ot_id}</div>}
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-slate-800">{formatCurrency(facture.montant_ttc ?? facture.montant_ht)}</div>
                                  <div className="mt-1 text-xs text-slate-400">{facture.mode_paiement ? MODE_PAIEMENT_LABELS[facture.mode_paiement] ?? facture.mode_paiement : 'Sans mode'}</div>
                                </div>
                              </div>
                              {facture.notes && <p className="mt-2 text-xs text-slate-500">{facture.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h4 className="text-sm font-semibold text-slate-800">Visualisation des courses</h4>
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                          <MiniInfo label="Courses" value={clientCourses.length.toString()} />
                          <MiniInfo label="Actives" value={clientCourses.filter(course => ['brouillon', 'confirme', 'en_cours'].includes(course.statut)).length.toString()} />
                          <MiniInfo label="CA HT" value={formatCurrency(currentCourseCa)} />
                        </div>

                        <div className="mt-4 space-y-2">
                          {clientCourses.length === 0 ? (
                            <p className="text-xs text-slate-400">Aucune course liee a ce client.</p>
                          ) : clientCourses.slice(0, 10).map(course => (
                            <div key={course.id} className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-800">{course.reference}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${OT_STATUT_COLORS[course.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                                      {OT_STATUT_LABELS[course.statut] ?? course.statut}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    Chargement {formatDate(course.date_chargement_prevue)} - Livraison {formatDate(course.date_livraison_prevue)}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-400">
                                    Suivi live: {operationalStatusLabel(course.statut_operationnel)}
                                  </div>
                                  {course.date_livraison_reelle && (
                                    <div className="mt-1 text-xs font-medium text-emerald-600">
                                      Livraison reelle: {formatDateTime(course.date_livraison_reelle)}
                                    </div>
                                  )}
                                  {(course.nature_marchandise || course.distance_km) && (
                                    <div className="mt-1 text-xs text-slate-400">
                                      {[course.nature_marchandise, course.distance_km ? `${course.distance_km} km` : null].filter(Boolean).join(' - ')}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-slate-800">{formatCurrency(course.prix_ht)}</div>
                                  <div className="mt-1 text-xs text-slate-400">{course.type_transport}</div>
                                </div>
                              </div>
                              {course.instructions && <p className="mt-2 text-xs text-slate-500">{course.instructions}</p>}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h4 className="text-sm font-semibold text-slate-800">Recapitulatif commercial</h4>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <InfoLine label="Paiement par defaut" value={formatPaymentSummary(selectedClient)} />
                          <InfoLine label="Encours max" value={formatCurrency(selectedClient.encours_max)} />
                          <InfoLine label="Adresse de facturation" value={[selectedClient.adresse_facturation, selectedClient.code_postal_facturation, selectedClient.ville_facturation, selectedClient.pays_facturation].filter(Boolean).join(', ') || 'Non renseigne'} />
                          <InfoLine label="Contact comptable" value={[selectedClient.contact_facturation_nom, selectedClient.contact_facturation_email, selectedClient.contact_facturation_telephone].filter(Boolean).join(' - ') || 'Non renseigne'} />
                          <InfoLine label="Banque" value={[selectedClient.banque, selectedClient.titulaire_compte].filter(Boolean).join(' - ') || 'Non renseigne'} />
                          <InfoLine label="RIB" value={[selectedClient.iban, selectedClient.bic].filter(Boolean).join(' - ') || 'Non renseigne'} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                <button type="button" onClick={closeForm} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-700 disabled:opacity-50">
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

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: 'emerald' | 'slate' | 'amber' | 'blue' }) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
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
    <div className="border-t pt-4 first:border-t-0 first:pt-0 xl:col-span-2">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-700">{value}</div>
    </div>
  )
}

function AddressGroup({
  title,
  items,
  onToggle,
  onDelete,
}: {
  title: string
  items: AdresseClient[]
  onToggle: (address: AdresseClient) => Promise<void> | void
  onDelete: (addressId: string) => Promise<void> | void
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">Aucun lieu.</p>
      ) : (
        <div className="space-y-2">
          {items.map(address => (
            <div key={address.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{address.nom_lieu}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${address.actif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {address.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {[address.adresse, address.code_postal, address.ville, address.pays].filter(Boolean).join(', ') || 'Adresse non renseignee'}
                  </div>
                  {(address.contact_nom || address.contact_tel) && (
                    <div className="mt-1 text-xs text-slate-400">
                      {[address.contact_nom, address.contact_tel].filter(Boolean).join(' - ')}
                    </div>
                  )}
                  {(address.horaires || address.instructions) && (
                    <div className="mt-1 text-xs text-slate-400">
                      {[address.horaires, address.instructions].filter(Boolean).join(' - ')}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void onToggle(address)} className="text-xs text-slate-400 hover:text-slate-700">
                    {address.actif ? 'Desactiver' : 'Activer'}
                  </button>
                  <button type="button" onClick={() => void onDelete(address.id)} className="text-xs text-slate-400 hover:text-red-500">
                    Suppr.
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
