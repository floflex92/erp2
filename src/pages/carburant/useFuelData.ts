import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { STATUTS_ABSENCE_ACTIFS } from '@/lib/absencesRh'
import { listUnifiedConducteurs } from '@/lib/services/personsService'
import {
  listCuves,
  listPleins,
  listCommandes,
  listAnomalies,
  type Cuve,
  type Plein,
  type CommandeCarburant,
  type AnomalieCarburant,
} from '@/lib/fuelManagement'
import { formatFuelError } from './fuelUtils'

export interface Vehicule { id: string; immatriculation: string; numero_parc?: string }
export interface Conducteur { id: string; prenom: string; nom: string }
export interface DepotOption { id: string; nom: string; source: 'adresses' | 'sites_logistiques' }

interface UseFuelDataParams {
  companyId: number | null
  onError: (message: string) => void
}

interface UseFuelDataResult {
  cuves: Cuve[]
  pleins: Plein[]
  commandes: CommandeCarburant[]
  anomalies: AnomalieCarburant[]
  vehicules: Vehicule[]
  conducteurs: Conducteur[]
  indisponiblesAujourdhui: Set<string>
  depots: DepotOption[]
  loading: boolean
  loadAll: () => Promise<void>
}

export function useFuelData({ companyId, onError }: UseFuelDataParams): UseFuelDataResult {
  const [cuves, setCuves] = useState<Cuve[]>([])
  const [pleins, setPleins] = useState<Plein[]>([])
  const [commandes, setCommandes] = useState<CommandeCarburant[]>([])
  const [anomalies, setAnomalies] = useState<AnomalieCarburant[]>([])
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [conducteurs, setConducteurs] = useState<Conducteur[]>([])
  const [indisponiblesAujourdhui, setIndisponiblesAujourdhui] = useState<Set<string>>(new Set())
  const [depots, setDepots] = useState<DepotOption[]>([])
  const [loading, setLoading] = useState(true)

  const loadRunRef = useRef(0)

  const loadAll = useCallback(async () => {
    if (!companyId) return
    const runId = ++loadRunRef.current
    setLoading(true)

    try {
      const [
        cuvesList,
        pleinsList,
        commandesList,
        anomaliesList,
        vehiculesList,
        conducteursList,
        depotsAdresses,
        depotsSites,
      ] = await Promise.all([
        listCuves(companyId),
        listPleins(companyId),
        listCommandes(companyId),
        listAnomalies(companyId),
        supabase.from('vehicules').select('id, immatriculation, numero_parc').eq('company_id', companyId),
        listUnifiedConducteurs(companyId, { activeOnly: true }),
        supabase.from('adresses').select('id, nom_lieu').eq('company_id', companyId).eq('type_lieu', 'depot'),
        supabase.from('sites_logistiques').select('id, nom, type_site').eq('company_id', companyId).in('type_site', ['depot', 'entrepot']),
      ])

      const conducteursData = conducteursList as Conducteur[]
      const conducteurIds = conducteursData.map(c => c.id)
      const todayIso = new Date().toISOString().slice(0, 10)

      const absencesRes = conducteurIds.length > 0
        ? await supabase
          .from('absences_rh')
          .select('employe_id')
          .in('employe_id', conducteurIds)
          .in('statut', Array.from(STATUTS_ABSENCE_ACTIFS))
          .lte('date_debut', todayIso)
          .gte('date_fin', todayIso)
        : { data: [], error: null }

      if (absencesRes.error) throw absencesRes.error

      const depotMap = new Map<string, DepotOption>()
      for (const d of (depotsAdresses.data || []) as Array<{ id: string; nom_lieu: string }>) {
        depotMap.set(d.id, { id: d.id, nom: d.nom_lieu, source: 'adresses' })
      }
      for (const s of (depotsSites.data || []) as Array<{ id: string; nom: string }>) {
        if (!depotMap.has(s.id)) depotMap.set(s.id, { id: s.id, nom: s.nom, source: 'sites_logistiques' })
      }

      if (runId !== loadRunRef.current) return

      setCuves(cuvesList)
      setPleins(pleinsList)
      setCommandes(commandesList)
      setAnomalies(anomaliesList)
      setVehicules((vehiculesList.data || []) as Vehicule[])
      setConducteurs(conducteursData)
      setIndisponiblesAujourdhui(new Set((absencesRes.data ?? []).map(row => row.employe_id as string)))
      setDepots(Array.from(depotMap.values()).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')))
    } catch (err) {
      onError(formatFuelError(err))
    } finally {
      if (runId === loadRunRef.current) setLoading(false)
    }
  }, [companyId, onError])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  return {
    cuves,
    pleins,
    commandes,
    anomalies,
    vehicules,
    conducteurs,
    indisponiblesAujourdhui,
    depots,
    loading,
    loadAll,
  }
}
