import { useEffect, useMemo, useState } from 'react'

type PartnerStatus = 'connecte' | 'degrade' | 'hors_ligne'

type PartnerChannel = {
  id: string
  partnerName: string
  erpCode: string
  status: PartnerStatus
  lastSyncAt: string
  signedWebhookEnabled: boolean
}

type InterErpMessage = {
  id: string
  channelId: string
  direction: 'entrant' | 'sortant'
  transportRef: string
  body: string
  createdAt: string
  author: string
}

type InterErpState = {
  channels: PartnerChannel[]
  messages: InterErpMessage[]
}

const STORAGE_KEY = 'nexora_inter_erp_v1'

const DEFAULT_STATE: InterErpState = {
  channels: [
    {
      id: 'partner-nord',
      partnerName: 'Nord Logistics',
      erpCode: 'NORD-ERP',
      status: 'connecte',
      lastSyncAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      signedWebhookEnabled: true,
    },
    {
      id: 'partner-axe',
      partnerName: 'Axe Fret',
      erpCode: 'AXE-TMS',
      status: 'degrade',
      lastSyncAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      signedWebhookEnabled: false,
    },
  ],
  messages: [
    {
      id: 'msg-1',
      channelId: 'partner-nord',
      direction: 'entrant',
      transportRef: 'OT-240402-118',
      body: 'Demande de mise a jour ETA: livraison prevue a 17h20, acces quai B confirme.',
      createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      author: 'Nord Logistics',
    },
    {
      id: 'msg-2',
      channelId: 'partner-nord',
      direction: 'sortant',
      transportRef: 'OT-240402-118',
      body: 'ETA recalculee a 17h10, chauffeur informe. Confirmation dechargement demandee.',
      createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      author: 'NEXORA Truck',
    },
  ],
}

function loadInterErpState(): InterErpState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as InterErpState
    if (!Array.isArray(parsed.channels) || !Array.isArray(parsed.messages)) return DEFAULT_STATE
    return parsed
  } catch {
    return DEFAULT_STATE
  }
}

function saveInterErpState(next: InterErpState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('nexora:inter-erp:update'))
}

function statusClass(status: PartnerStatus) {
  if (status === 'connecte') return 'bg-emerald-100 text-emerald-700'
  if (status === 'degrade') return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
}

function statusLabel(status: PartnerStatus) {
  if (status === 'connecte') return 'Connecte'
  if (status === 'degrade') return 'Degrade'
  return 'Hors ligne'
}

function fmtDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
}

export default function InterErp() {
  const [state, setState] = useState<InterErpState>(() => loadInterErpState())
  const [activeChannelId, setActiveChannelId] = useState<string>(() => loadInterErpState().channels[0]?.id ?? '')
  const [transportRef, setTransportRef] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [erpCode, setErpCode] = useState('')

  useEffect(() => {
    function syncFromStorage() {
      const next = loadInterErpState()
      setState(next)
      if (next.channels.length === 0) {
        setActiveChannelId('')
        return
      }
      if (!next.channels.some(channel => channel.id === activeChannelId)) {
        setActiveChannelId(next.channels[0].id)
      }
    }

    window.addEventListener('storage', syncFromStorage)
    window.addEventListener('nexora:inter-erp:update', syncFromStorage)
    return () => {
      window.removeEventListener('storage', syncFromStorage)
      window.removeEventListener('nexora:inter-erp:update', syncFromStorage)
    }
  }, [activeChannelId])

  const activeChannel = useMemo(
    () => state.channels.find(channel => channel.id === activeChannelId) ?? null,
    [activeChannelId, state.channels],
  )

  const channelMessages = useMemo(
    () => state.messages
      .filter(message => message.channelId === activeChannelId)
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()),
    [activeChannelId, state.messages],
  )

  const syncedTransports = useMemo(
    () => new Set(state.messages.map(message => message.transportRef.trim()).filter(Boolean)).size,
    [state.messages],
  )

  function persist(next: InterErpState) {
    setState(next)
    saveInterErpState(next)
  }

  function toggleChannelStatus(channelId: string) {
    const nextChannels = state.channels.map(channel => {
      if (channel.id !== channelId) return channel
      const nextStatus: PartnerStatus = channel.status === 'connecte'
        ? 'degrade'
        : channel.status === 'degrade'
        ? 'hors_ligne'
        : 'connecte'
      return {
        ...channel,
        status: nextStatus,
        lastSyncAt: new Date().toISOString(),
      }
    })
    persist({ ...state, channels: nextChannels })
  }

  function toggleSignedWebhook(channelId: string) {
    const nextChannels = state.channels.map(channel =>
      channel.id === channelId
        ? { ...channel, signedWebhookEnabled: !channel.signedWebhookEnabled, lastSyncAt: new Date().toISOString() }
        : channel,
    )
    persist({ ...state, channels: nextChannels })
  }

  function sendMessage() {
    if (!activeChannel) return
    const ref = transportRef.trim()
    const body = messageBody.trim()
    if (!ref || !body) return

    const outMessage: InterErpMessage = {
      id: uid('out'),
      channelId: activeChannel.id,
      direction: 'sortant',
      transportRef: ref,
      body,
      createdAt: new Date().toISOString(),
      author: 'NEXORA Truck',
    }

    const ackMessage: InterErpMessage = {
      id: uid('ack'),
      channelId: activeChannel.id,
      direction: 'entrant',
      transportRef: ref,
      body: `Accuse recu (${activeChannel.erpCode}). Message traite cote partenaire.`,
      createdAt: new Date(Date.now() + 30 * 1000).toISOString(),
      author: activeChannel.partnerName,
    }

    const nextChannels = state.channels.map(channel =>
      channel.id === activeChannel.id ? { ...channel, lastSyncAt: new Date().toISOString() } : channel,
    )

    persist({
      channels: nextChannels,
      messages: [...state.messages, outMessage, ackMessage],
    })

    setMessageBody('')
  }

  function createPartnerChannel() {
    if (!partnerName.trim() || !erpCode.trim()) return
    const created: PartnerChannel = {
      id: uid('partner'),
      partnerName: partnerName.trim(),
      erpCode: erpCode.trim().toUpperCase(),
      status: 'connecte',
      lastSyncAt: new Date().toISOString(),
      signedWebhookEnabled: true,
    }
    const nextState = { ...state, channels: [created, ...state.channels] }
    persist(nextState)
    setActiveChannelId(created.id)
    setPartnerName('')
    setErpCode('')
  }

  return (
    <div className="space-y-4">
      <div className="nx-panel p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-discreet">Connectivite inter-ERP</p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">Discussion et coordination partenaires</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-discreet">Partenaires actifs</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{state.channels.length}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-discreet">References synchro</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{syncedTransports}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-discreet">Webhook signes</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {state.channels.filter(channel => channel.signedWebhookEnabled).length}/{state.channels.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr_300px]">
        <aside className="nx-panel p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-discreet">Canaux ERP</p>
          <div className="mt-3 space-y-2">
            {state.channels.map(channel => (
              <button
                key={channel.id}
                type="button"
                onClick={() => setActiveChannelId(channel.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${activeChannelId === channel.id ? 'border-blue-300 bg-blue-50' : 'border-line bg-surface hover:bg-surface-soft'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{channel.partnerName}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass(channel.status)}`}>
                    {statusLabel(channel.status)}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-discreet">{channel.erpCode}</p>
                <p className="mt-1 text-[11px] text-muted">Sync: {fmtDate(channel.lastSyncAt)}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="nx-panel p-3">
          {activeChannel ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{activeChannel.partnerName}</h3>
                  <p className="text-xs text-discreet">Connexion {activeChannel.erpCode}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleChannelStatus(activeChannel.id)}
                    className="rounded-lg border border-line px-2.5 py-1 text-xs text-foreground hover:bg-surface-soft"
                  >
                    Basculer statut
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSignedWebhook(activeChannel.id)}
                    className="rounded-lg border border-line px-2.5 py-1 text-xs text-foreground hover:bg-surface-soft"
                  >
                    {activeChannel.signedWebhookEnabled ? 'Webhook signe actif' : 'Webhook signe inactif'}
                  </button>
                </div>
              </div>

              <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {channelMessages.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-sm text-discreet">
                    Aucune discussion pour ce partenaire.
                  </p>
                ) : (
                  channelMessages.map(message => (
                    <div key={message.id} className={`rounded-xl border px-3 py-2 ${message.direction === 'sortant' ? 'border-blue-200 bg-blue-50/70' : 'border-line bg-surface'}`}>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-discreet">
                        <span className="font-semibold text-foreground">{message.author}</span>
                        <span>Ref: {message.transportRef}</span>
                        <span>{fmtDate(message.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-foreground">{message.body}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 grid gap-2 rounded-xl border border-line bg-surface-soft p-3 sm:grid-cols-[200px_1fr_auto]">
                <input
                  value={transportRef}
                  onChange={event => setTransportRef(event.target.value.toUpperCase())}
                  placeholder="Reference transport"
                  className="rounded-lg border border-line-strong px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
                <input
                  value={messageBody}
                  onChange={event => setMessageBody(event.target.value)}
                  placeholder="Message inter-ERP"
                  className="rounded-lg border border-line-strong px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Envoyer
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-discreet">Aucun canal partenaire disponible.</p>
          )}
        </section>

        <aside className="nx-panel p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-discreet">Nouveau partenaire</p>
          <div className="mt-3 space-y-2">
            <input
              value={partnerName}
              onChange={event => setPartnerName(event.target.value)}
              placeholder="Nom partenaire"
              className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
            <input
              value={erpCode}
              onChange={event => setErpCode(event.target.value)}
              placeholder="Code ERP"
              className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={createPartnerChannel}
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Ajouter le canal
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-line bg-surface-soft p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-discreet">Templates rapides</p>
            <div className="mt-2 space-y-1.5">
              {[
                'Confirmation de prise en charge',
                'Mise a jour ETA',
                'Incident transport et plan de reprise',
                'Preuve de livraison transmise',
              ].map(template => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setMessageBody(template)}
                  className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-left text-xs text-foreground hover:bg-surface-2"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}