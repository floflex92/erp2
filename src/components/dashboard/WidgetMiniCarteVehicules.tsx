import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Mission {
  id: string
  reference: string
  conducteurName: string
  lat: number
  lng: number
  statut: string
  source: 'gps' | 'adresse'
}

type MissionAddressRow = {
  latitude: number | null
  longitude: number | null
  ville: string | null
}

type MissionStepRow = {
  ordre: number
  ville: string | null
  adresses: MissionAddressRow | MissionAddressRow[] | null
}

type MissionOrderRow = {
  id: string
  reference: string
  statut_operationnel: string | null
  conducteurs: { nom: string | null; prenom: string | null } | { nom: string | null; prenom: string | null }[] | null
  etapes_mission: MissionStepRow[] | null
}

type HistoryRow = {
  ot_id: string
  commentaire: string | null
}

// CoordonnÃ©es hardcodÃ©es par ville pour les missions actives (fallback si pas de coords en DB)
const CITY_COORDS: Record<string, [number, number]> = {
  paris: [48.8566, 2.3522], lyon: [45.7640, 4.8357], marseille: [43.2965, 5.3698],
  toulouse: [43.6047, 1.4442], bordeaux: [44.8378, -0.5792], lille: [50.6292, 3.0573],
  nantes: [47.2184, -1.5536], strasbourg: [48.5734, 7.7521], rennes: [48.1173, -1.6778],
  grenoble: [45.1885, 5.7245], montpellier: [43.6117, 3.8777], nice: [43.7102, 7.2620],
  rouen: [49.4432, 1.0993], metz: [49.1193, 6.1757], nancy: [48.6921, 6.1844],
  dijon: [47.3220, 5.0415], reims: [49.2583, 4.0317], le_havre: [49.4938, 0.1079],
  caen: [49.1829, -0.3707], clermont: [45.7794, 3.0870],
}

function cityToCoords(ville: string | null | undefined): [number, number] | null {
  if (!ville) return null
  const key = ville.toLowerCase().replace(/[^a-z]/g, '_').replace(/_+/g, '_')
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (key.includes(city)) return coords
  }
  return null
}

function parseGpsFromComment(commentaire: string | null): [number, number] | null {
  if (!commentaire) return null
  try {
    const payload = JSON.parse(commentaire) as {
      gps?: {
        lat?: unknown
        lng?: unknown
      }
    }
    const lat = payload?.gps?.lat
    const lng = payload?.gps?.lng
    if (typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng)) {
      return [lat, lng]
    }
  } catch {
    return null
  }
  return null
}

function statusColor(statut: string) {
  const value = statut.toLowerCase()
  if (value.includes('retard') || value.includes('critical')) return '#ef4444'
  return '#3b82f6'
}

export function WidgetMiniCarteVehicules() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null)
  const markerLayerRef = useRef<import('leaflet').LayerGroup | null>(null)
  const leafletRef = useRef<typeof import('leaflet') | null>(null)
  const hasFittedBoundsRef = useRef(false)
  const [missions, setMissions] = useState<Mission[]>([])
  const [unavailableCount, setUnavailableCount] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recenterMap = useCallback(() => {
    const L = leafletRef.current
    const map = mapInstanceRef.current
    if (!L || !map || missions.length === 0) return
    const bounds = L.latLngBounds(missions.map(m => [m.lat, m.lng] as [number, number]))
    map.fitBounds(bounds.pad(0.25))
  }, [missions])

  useEffect(() => {
    async function load(silent = false) {
      if (!silent) setLoading(true)
      else setRefreshing(true)
      setError(null)
      try {
        const { data: ordersData, error: ordersError } = await supabase
          .from('ordres_transport')
          .select('id, reference, statut_operationnel, conducteurs(nom, prenom), etapes_mission(ordre, ville, adresses(latitude, longitude, ville))')
          .in('statut', ['confirme', 'planifie', 'en_cours'])
          .limit(30)

        if (ordersError) throw ordersError
        const rows = (ordersData ?? []) as MissionOrderRow[]
        setActiveCount(rows.length)
        const otIds = rows.map(row => row.id)

        const latestGpsByOt: Record<string, [number, number]> = {}
        if (otIds.length > 0) {
          const { data: historyData, error: historyError } = await supabase
            .from('historique_statuts')
            .select('ot_id, commentaire')
            .in('ot_id', otIds)
            .order('created_at', { ascending: false })

          if (historyError) throw historyError

          for (const row of (historyData ?? []) as HistoryRow[]) {
            if (latestGpsByOt[row.ot_id]) continue
            const gps = parseGpsFromComment(row.commentaire)
            if (gps) latestGpsByOt[row.ot_id] = gps
          }
        }

        const result: Mission[] = []
        let missing = 0

        for (const ot of rows) {
          const conducteur = Array.isArray(ot.conducteurs) ? ot.conducteurs[0] : ot.conducteurs
          const conducteurName = conducteur
            ? [conducteur.prenom, conducteur.nom].filter(Boolean).join(' ')
            : 'Conducteur inconnu'

          let coords: [number, number] | null = latestGpsByOt[ot.id] ?? null
          const source: 'gps' | 'adresse' = coords ? 'gps' : 'adresse'

          if (!coords) {
            const steps = (ot.etapes_mission ?? []).sort((a, b) => a.ordre - b.ordre)
            for (const step of steps) {
              const addr = Array.isArray(step.adresses) ? step.adresses[0] : step.adresses
              if (addr?.latitude && addr?.longitude) {
                coords = [addr.latitude, addr.longitude]
                break
              }
              const cityCoords = cityToCoords(step.ville ?? addr?.ville)
              if (cityCoords) {
                coords = cityCoords
                break
              }
            }
          }

          if (!coords) {
            missing += 1
            continue
          }

          result.push({
            id: ot.id,
            reference: ot.reference,
            conducteurName,
            lat: coords[0],
            lng: coords[1],
            statut: ot.statut_operationnel ?? 'en_cours',
            source,
          })
        }

        setMissions(result)
        setUnavailableCount(missing)
        setLastUpdatedAt(new Date())
      } catch (loadError) {
        setMissions([])
        setUnavailableCount(0)
        setActiveCount(0)
        setError(loadError instanceof Error ? loadError.message : 'Impossible de charger la carte des missions.')
      } finally {
        if (!silent) setLoading(false)
        else setRefreshing(false)
      }
    }

    void load()

    const refreshTimer = window.setInterval(() => {
      void load(true)
    }, 30000)

    return () => window.clearInterval(refreshTimer)
  }, [])

  const syncMarkers = useCallback((nextMissions: Mission[], fitBounds: boolean) => {
    const L = leafletRef.current
    const map = mapInstanceRef.current
    const layer = markerLayerRef.current
    if (!L || !map || !layer) return

    layer.clearLayers()

    nextMissions.forEach(m => {
      const color = statusColor(m.statut)
      const icon = L.divIcon({
        html: `<div style="background:${color};width:10px;height:10px;border-radius:50%;border:2px solid rgba(255,255,255,0.6);box-shadow:0 0 6px ${color}80"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
        className: '',
      })
      L.marker([m.lat, m.lng], { icon })
        .addTo(layer)
        .bindPopup(`<b>${m.reference}</b><br>${m.conducteurName}<br><small>${m.source === 'gps' ? 'Position GPS conducteur' : 'Position estimee par adresse'}</small>`)
    })

    if (fitBounds && nextMissions.length > 0) {
      const bounds = L.latLngBounds(nextMissions.map(m => [m.lat, m.lng] as [number, number]))
      map.fitBounds(bounds.pad(0.25))
      hasFittedBoundsRef.current = true
    }
  }, [])

  useEffect(() => {
    if (loading || error || missions.length === 0 || !mapRef.current || mapInstanceRef.current) return

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      leafletRef.current = L

      if (!mapRef.current) return

      const map = L.map(mapRef.current, {
        center: [46.5, 2.5],
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
      })
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
      }).addTo(map)

      markerLayerRef.current = L.layerGroup().addTo(map)
      syncMarkers(missions, true)
      window.setTimeout(() => map.invalidateSize(), 0)
    }

    void initMap()
  }, [loading, error, missions, syncMarkers])

  useEffect(() => {
    if (!mapInstanceRef.current || !markerLayerRef.current || !leafletRef.current) return
    syncMarkers(missions, false)
  }, [missions, syncMarkers])

  useEffect(() => {
    if (!mapInstanceRef.current) return

    function onResize() {
      mapInstanceRef.current?.invalidateSize()
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerLayerRef.current = null
      }
    }
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center" style={{ height: 280 }}>
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center" style={{ height: 280 }}>
      <p className="text-sm text-rose-500">{error}</p>
    </div>
  )

  if (missions.length === 0) return (
    <div className="flex flex-col items-center justify-center" style={{ height: 280 }}>
      <div className="mb-2 text-4xl opacity-20">MAP</div>
      {activeCount > 0 ? (
        <>
          <p className="text-sm text-slate-500">{activeCount} mission{activeCount > 1 ? 's' : ''} active{activeCount > 1 ? 's' : ''}</p>
          <p className="mt-1 text-xs text-slate-500">Aucune position GPS/adresse exploitable pour la carte.</p>
        </>
      ) : (
        <p className="text-sm text-slate-500">Aucune mission en cours</p>
      )}
    </div>
  )

  return (
    <div className="relative">
      <div ref={mapRef} style={{ height: 280, width: '100%' }} />
      <button
        type="button"
        onClick={recenterMap}
        className="absolute right-2 top-2 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10"
        style={{ background: 'rgba(15,23,42,0.82)', backdropFilter: 'blur(8px)' }}
      >
        Recentrer
      </button>
      <div className="absolute bottom-2 left-2 flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs text-white/70"
        style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)' }}>
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${refreshing ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          {refreshing ? 'Actualisation...' : 'Actif'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          Normal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Retard
        </span>
        <span className="font-medium text-white">{missions.length} mission{missions.length > 1 ? 's' : ''}</span>
        {unavailableCount > 0 && <span>{unavailableCount} sans position</span>}
        {lastUpdatedAt && <span>maj {lastUpdatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
      </div>
    </div>
  )
}



