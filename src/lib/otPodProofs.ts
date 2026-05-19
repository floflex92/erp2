export type OtPodProof = {
  otId: string
  receiverName: string
  receiverSignature: string
  comment: string
  fileName: string
  fileDataUrl: string
  savedAt: string
}

const STORAGE_KEY = 'nexora_ot_pod_v1'

export function loadOtPodProofs(): Record<string, OtPodProof> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, OtPodProof>
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed
  } catch {
    return {}
  }
}

export function saveOtPodProofs(map: Record<string, OtPodProof>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function getOtPodProof(otId: string): OtPodProof | null {
  const store = loadOtPodProofs()
  return store[otId] ?? null
}

export function upsertOtPodProof(proof: OtPodProof) {
  const store = loadOtPodProofs()
  store[proof.otId] = proof
  saveOtPodProofs(store)
  return store
}
