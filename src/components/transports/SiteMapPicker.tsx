import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type MapPickResult = {
  latitude: number
  longitude: number
  adresse: string
}

type SiteMapPickerProps = {
  onPick: (result: MapPickResult) => void
}

const FRANCE_CENTER: [number, number] = [46.603354, 1.888334]

async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&accept-language=fr`,
  )

  if (!response.ok) {
    throw new Error('Geocodage inverse indisponible.')
  }

  const payload = await response.json() as { display_name?: string }
  return payload.display_name?.trim() || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}

export default function SiteMapPicker({ onPick }: SiteMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onPickRef = useRef(onPick)
  const [message, setMessage] = useState('Cliquez sur la carte pour detecter une adresse.')

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  useEffect(() => {
    const host = mapContainerRef.current
    if (!host || mapRef.current) return

    const map = L.map(host, {
      zoomControl: true,
      attributionControl: true,
    }).setView(FRANCE_CENTER, 6)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    map.on('click', async event => {
      const latitude = event.latlng.lat
      const longitude = event.latlng.lng

      setMessage('Detection de l adresse en cours...')

      try {
        const adresse = await reverseGeocode(latitude, longitude)

        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude])
        } else {
          markerRef.current = L.marker([latitude, longitude]).addTo(map)
        }

        markerRef.current.bindPopup(adresse).openPopup()
        onPickRef.current({ latitude, longitude, adresse })
        setMessage(`Adresse detectee: ${adresse}`)
      } catch {
        setMessage('Impossible de detecter l adresse automatiquement. Reessayez un autre point.')
      }
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  return (
    <div className="space-y-2">
      <div ref={mapContainerRef} className="h-52 w-full rounded-lg border border-line" />
      <p className="text-xs text-discreet">{message}</p>
    </div>
  )
}
