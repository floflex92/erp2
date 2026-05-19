import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ClientPoint {
  clientNom: string
  ville: string
  lat: number
  lng: number
  nbOT: number
}

interface SuggestionIA {
  zone: string
  departement: string
  distance: number
  raison: string
  type_suggere: string
  score: number
}

type AddressRow = {
  client_id: string | null
  latitude: number | null
  longitude: number | null
  ville: string
  clients: { nom: string } | { nom: string }[] | null
}

type OrderTypeRow = {
  type_transport: string | null
}

// Régions françaises non couvertes avec leur centroïde
const FRANCE_REGIONS: Record<string, [number, number]> = {
  'Bretagne':           [48.2020, -2.9326],
  'Normandie':          [49.1829, 0.3707],
  'Hauts-de-France':    [50.4801, 2.7937],
  'Grand Est':          [48.6996, 6.1872],
  'Bourgogne':          [47.2805, 4.8024],
  'Auvergne':           [45.7470, 3.1007],
  'Occitanie':          [43.8927, 2.3490],
  'PACA':               [43.9352, 6.0679],
  'Pays de la Loire':   [47.4823, -0.5631],
  'Centre-Val de Loire':[47.5813, 1.7527],
  'Nouvelle-Aquitaine': [44.8637, -0.5795],
  'ÃŽle-de-France':      [48.6499, 2.5127],
  'Corse':              [42.0396, 9.0129],
}

function generateIASuggestions(covered: Set<string>, otTypes: Record<string, number>): SuggestionIA[] {
  const suggestions: SuggestionIA[] = []

  // Trouver les zones non couvertes
  const uncovered = Object.entries(FRANCE_REGIONS).filter(([name]) => !covered.has(name))

  // Type de transport le moins utilisé
  const typeOrder = ['express', 'complet', 'groupage', 'partiel']
  const leastUsedType = typeOrder.find(t => !otTypes[t] || otTypes[t] < 3) ?? 'groupage'

  for (const [zone, [lat, lng]] of uncovered.slice(0, 4)) {
    // Calculer distance minimale aux zones couvertes
    let minDist = Infinity
    for (const [covZone] of Object.entries(FRANCE_REGIONS).filter(([n]) => covered.has(n))) {
      const [clat, clng] = FRANCE_REGIONS[covZone]
      const d = Math.sqrt(Math.pow(lat - clat, 2) + Math.pow(lng - clng, 2)) * 111
      if (d < minDist) minDist = d
    }

    const score = Math.max(20, Math.min(95, Math.round(85 - minDist * 0.3 + Math.random() * 15)))

    suggestions.push({
      zone,
      departement: zone,
      distance: Math.round(minDist),
      raison: minDist < 150
        ? `Zone adjacente à votre réseau (${Math.round(minDist)} km)`
        : `Marché potentiel non exploité`,
      type_suggere: leastUsedType,
      score,
    })
  }

  // Aussi suggérer un type de transport sous-utilisé
  if (otTypes[leastUsedType] === undefined || otTypes[leastUsedType] < 5) {
    suggestions.unshift({
      zone: 'Votre réseau actuel',
      departement: 'Zones existantes',
      distance: 0,
      raison: `Transport ${leastUsedType} peu utilisé (${otTypes[leastUsedType] ?? 0} OT) — potentiel inexploité`,
      type_suggere: leastUsedType,
      score: 88,
    })
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 4)
}

export function WidgetCarteClients() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<{ remove: () => void } | null>(null)
  const [points, setPoints] = useState<ClientPoint[]>([])
  const [suggestions, setSuggestions] = useState<SuggestionIA[]>([])
  const [loading, setLoading] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [adrsRes, otRes] = await Promise.all([
          supabase
            .from('adresses')
            .select('client_id, latitude, longitude, ville, clients(nom)')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .eq('actif', true)
            .limit(200),
          supabase
            .from('ordres_transport')
            .select('type_transport'),
        ])

        const adresses = (adrsRes.data ?? []) as AddressRow[]
        const otRows = (otRes.data ?? []) as OrderTypeRow[]

        // Agreger par client
        const clientMap = new Map<string, ClientPoint>()
        for (const a of adresses) {
          if (!a.client_id || !a.latitude || !a.longitude) continue
          const nom = (Array.isArray(a.clients) ? a.clients[0] : a.clients)?.nom ?? 'Client'
          const existing = clientMap.get(a.client_id)
          if (!existing) {
            clientMap.set(a.client_id, {
              clientNom: nom,
              ville: a.ville,
              lat: a.latitude,
              lng: a.longitude,
              nbOT: 0,
            })
          }
        }

        // Compter OT par type
        const otTypes: Record<string, number> = {}
        for (const ot of otRows) {
          const transportType = ot.type_transport ?? 'inconnu'
          otTypes[transportType] = (otTypes[transportType] ?? 0) + 1
        }

        // Zones couvertes
        const allPoints = [...clientMap.values()]
        const covered = new Set<string>()
        for (const [region, [rlat, rlng]] of Object.entries(FRANCE_REGIONS)) {
          for (const pt of allPoints) {
            const d = Math.sqrt(Math.pow(pt.lat - rlat, 2) + Math.pow(pt.lng - rlng, 2)) * 111
            if (d < 80) { covered.add(region); break }
          }
        }

        setPoints(allPoints)
        setSuggestions(generateIASuggestions(covered, otTypes))
      } catch {
        setPoints([])
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  useEffect(() => {
    if (loading || !mapRef.current || showSuggestions) return

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }
      if (!mapRef.current) return

      const map = L.map(mapRef.current, {
        center: [46.5, 2.5],
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
      })
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 18 }).addTo(map)

      points.forEach(pt => {
        const markerIcon = L.divIcon({
          html: `<div style="background:#10b981;width:8px;height:8px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.5);box-shadow:0 0 5px #10b98180"></div>`,
          iconSize: [8, 8],
          iconAnchor: [4, 4],
          className: '',
        })
        L.marker([pt.lat, pt.lng], { icon: markerIcon })
          .addTo(map)
          .bindPopup(`<b>${pt.clientNom}</b><br>${pt.ville}`)
      })
    }

    void initMap()
    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }
    }
  }, [loading, points, showSuggestions])

  if (loading) return (
    <div className="flex items-center justify-center" style={{ height: 320 }}>
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
    </div>
  )

  return (
    <div className="flex flex-col">
      {/* Tabs carte / suggestions IA */}
      <div className="flex items-center gap-1 border-b px-4 py-2" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setShowSuggestions(false)}
          className={`px-2.5 py-1 text-xs font-semibold transition-colors ${!showSuggestions ? 'nx-tab nx-tab-active' : 'nx-tab hover:text-foreground'}`}
        >
          Carte clients ({points.length})
        </button>
        <button
          onClick={() => setShowSuggestions(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold transition-colors ${showSuggestions ? 'nx-tab nx-tab-active' : 'nx-tab hover:text-foreground'}`}
        >
          <span className="text-[11px]">✨</span>
          Suggestions IA
        </button>
      </div>

      {!showSuggestions ? (
        <div className="relative">
          {points.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10" style={{ height: 280 }}>
              <div className="text-4xl opacity-20 mb-2">ðŸ—º️</div>
              <p className="text-sm text-discreet">Aucun client avec coordonnées GPS</p>
              <p className="text-xs text-secondary mt-1">Ajoutez des adresses avec coordonnées</p>
            </div>
          ) : (
            <>
              <div ref={mapRef} style={{ height: 280, width: '100%' }} />
              <div className="absolute bottom-2 left-2 rounded-lg px-3 py-1.5 text-xs text-white/70"
                style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)' }}>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {points.length} client{points.length > 1 ? 's' : ''} géolocalisé{points.length > 1 ? 's' : ''}
                </span>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10">
              <p className="text-sm text-discreet">Pas assez de données pour générer des suggestions</p>
            </div>
          ) : (
            suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-soft transition-colors">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                  {s.score}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-950">{s.zone}</p>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 font-medium">
                      {s.type_suggere}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-discreet">{s.raison}</p>
                </div>
                <div className="shrink-0">
                  <div className="flex h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${s.score}%` }} />
                  </div>
                  <p className="mt-1 text-right text-[10px] text-discreet">Score IA</p>
                </div>
              </div>
            ))
          )}
          <div className="px-4 py-2 text-[10px] text-secondary">
            ✨ Suggestions générées par analyse de vos données clients et OT existants
          </div>
        </div>
      )}
    </div>
  )
}

