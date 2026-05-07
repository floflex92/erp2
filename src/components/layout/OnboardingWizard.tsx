/**
 * OnboardingWizard — overlay 5 étapes pour les nouveaux comptes admin/dirigeant.
 * État persisté via localStorage (clé `nexora_onboarding_v1`).
 * Affiché dans AppLayout tant que l'état n'est pas 'done' ou 'skipped'.
 */
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

const LS_KEY = 'nexora_onboarding_v1'

export function isOnboardingDone(): boolean {
  return localStorage.getItem(LS_KEY) === 'done'
}

function markDone() {
  localStorage.setItem(LS_KEY, 'done')
}

// ── UI helpers ────────────────────────────────────────────────────────────────
const inp =
  'w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-[#1F4E8C]/30'
const inpStyle = { borderColor: '#DBE2EC', background: '#FFFFFF', color: '#1B1B1B' }
const btnPrimary =
  'rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50'
const btnSecondary =
  'rounded-xl border px-5 py-2.5 text-sm font-semibold'
const btnSecondaryStyle = { borderColor: '#E5E7EB', color: '#475569' }

// ── Steps definition ──────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Société' },
  { label: 'Véhicule' },
  { label: 'Conducteur' },
  { label: 'Ordre de transport' },
  { label: 'Utilisateurs' },
]

// ── Step components ───────────────────────────────────────────────────────────

function StepSociete({ companyId, onNext }: { companyId: string | null; onNext: () => void }) {
  const [nom, setNom] = useState('')
  const [siret, setSiret] = useState('')
  const [adresse, setAdresse] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleNext() {
    if (!nom.trim()) { setErr('Le nom est requis.'); return }
    if (!companyId) { onNext(); return } // demo / pas encore de company_id
    setSaving(true)
    setErr(null)
    const { error } = await supabase
      .from('companies')
      .update({ name: nom.trim(), siret: siret.trim() || null, adresse: adresse.trim() || null })
      .eq('id', companyId)
    setSaving(false)
    if (error) { setErr('Erreur lors de la sauvegarde.'); return }
    onNext()
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm" style={{ color: '#475569' }}>
        Commençons par les informations de votre entreprise. Elles apparaîtront sur vos documents PDF.
      </p>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Nom de l'entreprise *</span>
        <input className={inp} style={inpStyle} value={nom} onChange={e => setNom(e.target.value)} placeholder="Transports Dupont SAS" />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>SIRET</span>
        <input className={inp} style={inpStyle} value={siret} onChange={e => setSiret(e.target.value)} placeholder="12345678900012" maxLength={14} />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Adresse du siège</span>
        <input className={inp} style={inpStyle} value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="12 rue de la Paix, 75001 Paris" />
      </label>
      {err && <p className="rounded-lg px-4 py-2 text-sm" style={{ background: '#FEF2F2', color: '#991B1B' }}>{err}</p>}
      <div className="flex justify-end">
        <button className={btnPrimary} style={{ background: 'linear-gradient(135deg,#0B1F3A,#1F4E8C)' }} onClick={handleNext} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Suivant →'}
        </button>
      </div>
    </div>
  )
}

function StepVehicule({ companyId, onNext, onBack }: { companyId: string | null; onNext: () => void; onBack: () => void }) {
  const [immat, setImmat] = useState('')
  const [type, setType] = useState('tracteur')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [skipped, setSkipped] = useState(false)

  async function handleNext() {
    if (!immat.trim()) { onNext(); return } // champ optionnel
    if (!companyId) { onNext(); return }
    setSaving(true)
    setErr(null)
    const { error } = await supabase
      .from('vehicules')
      .insert({ immatriculation: immat.trim().toUpperCase(), type, statut: 'actif', company_id: companyId })
    setSaving(false)
    if (error && !error.message.includes('duplicate')) { setErr('Erreur lors de l\'ajout.'); return }
    onNext()
  }

  if (skipped) { onNext(); return null }

  return (
    <div className="grid gap-4">
      <p className="text-sm" style={{ color: '#475569' }}>
        Ajoutez votre premier véhicule. Vous pourrez en ajouter d'autres depuis la page Camions.
      </p>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Immatriculation</span>
        <input className={inp} style={inpStyle} value={immat} onChange={e => setImmat(e.target.value)} placeholder="AB-123-CD" />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Type</span>
        <select className={inp} style={inpStyle} value={type} onChange={e => setType(e.target.value)}>
          <option value="tracteur">Tracteur</option>
          <option value="porteur">Porteur</option>
          <option value="fourgon">Fourgon</option>
          <option value="remorque">Remorque</option>
          <option value="autre">Autre</option>
        </select>
      </label>
      {err && <p className="rounded-lg px-4 py-2 text-sm" style={{ background: '#FEF2F2', color: '#991B1B' }}>{err}</p>}
      <div className="flex justify-between">
        <button className={btnSecondary} style={btnSecondaryStyle} onClick={onBack}>← Retour</button>
        <div className="flex gap-2">
          <button className={btnSecondary} style={btnSecondaryStyle} onClick={() => setSkipped(true)}>Passer</button>
          <button className={btnPrimary} style={{ background: 'linear-gradient(135deg,#0B1F3A,#1F4E8C)' }} onClick={handleNext} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StepConducteur({ companyId, onNext, onBack }: { companyId: string | null; onNext: () => void; onBack: () => void }) {
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [permis, setPermis] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleNext() {
    if (!prenom.trim() && !nom.trim()) { onNext(); return }
    if (!companyId) { onNext(); return }
    setSaving(true)
    setErr(null)
    const { error } = await supabase
      .from('conducteurs')
      .insert({ prenom: prenom.trim(), nom: nom.trim(), numero_permis: permis.trim() || null, statut: 'actif', company_id: companyId })
    setSaving(false)
    if (error) { setErr('Erreur lors de l\'ajout.'); return }
    onNext()
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm" style={{ color: '#475569' }}>
        Enregistrez votre premier conducteur. Champs optionnels — vous pouvez passer cette étape.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Prénom</span>
          <input className={inp} style={inpStyle} value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Jean" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Nom</span>
          <input className={inp} style={inpStyle} value={nom} onChange={e => setNom(e.target.value)} placeholder="Dupont" />
        </label>
      </div>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>N° permis</span>
        <input className={inp} style={inpStyle} value={permis} onChange={e => setPermis(e.target.value)} placeholder="12FR12345" />
      </label>
      {err && <p className="rounded-lg px-4 py-2 text-sm" style={{ background: '#FEF2F2', color: '#991B1B' }}>{err}</p>}
      <div className="flex justify-between">
        <button className={btnSecondary} style={btnSecondaryStyle} onClick={onBack}>← Retour</button>
        <div className="flex gap-2">
          <button className={btnSecondary} style={btnSecondaryStyle} onClick={onNext}>Passer</button>
          <button className={btnPrimary} style={{ background: 'linear-gradient(135deg,#0B1F3A,#1F4E8C)' }} onClick={handleNext} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StepOT({ companyId, onNext, onBack }: { companyId: string | null; onNext: () => void; onBack: () => void }) {
  const [client, setClient] = useState('')
  const [depart, setDepart] = useState('')
  const [arrivee, setArrivee] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleNext() {
    if (!client.trim()) { onNext(); return }
    if (!companyId) { onNext(); return }
    setSaving(true)
    setErr(null)
    const { error } = await supabase
      .from('transport_missions')
      .insert({
        client_nom: client.trim(),
        lieu_depart: depart.trim() || null,
        lieu_arrivee: arrivee.trim() || null,
        date_chargement: date || null,
        statut: 'planifie',
        company_id: companyId,
      })
    setSaving(false)
    if (error) { setErr('Erreur lors de la création.'); return }
    onNext()
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm" style={{ color: '#475569' }}>
        Créez votre premier ordre de transport pour découvrir le workflow complet.
      </p>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Client</span>
        <input className={inp} style={inpStyle} value={client} onChange={e => setClient(e.target.value)} placeholder="Nom du client" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Départ</span>
          <input className={inp} style={inpStyle} value={depart} onChange={e => setDepart(e.target.value)} placeholder="Paris" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Arrivée</span>
          <input className={inp} style={inpStyle} value={arrivee} onChange={e => setArrivee(e.target.value)} placeholder="Lyon" />
        </label>
      </div>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Date de chargement</span>
        <input type="date" className={inp} style={inpStyle} value={date} onChange={e => setDate(e.target.value)} />
      </label>
      {err && <p className="rounded-lg px-4 py-2 text-sm" style={{ background: '#FEF2F2', color: '#991B1B' }}>{err}</p>}
      <div className="flex justify-between">
        <button className={btnSecondary} style={btnSecondaryStyle} onClick={onBack}>← Retour</button>
        <div className="flex gap-2">
          <button className={btnSecondary} style={btnSecondaryStyle} onClick={onNext}>Passer</button>
          <button className={btnPrimary} style={{ background: 'linear-gradient(135deg,#0B1F3A,#1F4E8C)' }} onClick={handleNext} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StepUtilisateurs({ onFinish, onBack }: { onFinish: () => void; onBack: () => void }) {
  const [emails, setEmails] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleInvite() {
    const list = emails.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean)
    if (list.length === 0) { onFinish(); return }
    setSending(true)
    setErr(null)
    try {
      await Promise.all(
        list.map(email =>
          supabase.auth.admin
            ? supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
            : Promise.resolve()
        )
      )
      setSent(true)
      setTimeout(onFinish, 1500)
    } catch {
      setErr('Erreur lors de l\'envoi des invitations.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm" style={{ color: '#475569' }}>
        Invitez vos collaborateurs par email. Ils recevront un lien de connexion. Vous pouvez passer cette étape et les inviter plus tard depuis <strong>Réglages › Utilisateurs</strong>.
      </p>
      {sent ? (
        <p className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: '#F0FDF4', color: '#166534' }}>
          Invitations envoyées !
        </p>
      ) : (
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Adresses email (séparées par une virgule ou un retour à la ligne)</span>
          <textarea
            className={inp}
            style={{ ...inpStyle, minHeight: 90, resize: 'vertical' }}
            value={emails}
            onChange={e => setEmails(e.target.value)}
            placeholder={'dupont@exemple.fr\nmartin@exemple.fr'}
          />
        </label>
      )}
      {err && <p className="rounded-lg px-4 py-2 text-sm" style={{ background: '#FEF2F2', color: '#991B1B' }}>{err}</p>}
      <div className="flex justify-between">
        <button className={btnSecondary} style={btnSecondaryStyle} onClick={onBack}>← Retour</button>
        <div className="flex gap-2">
          {!sent && (
            <button className={btnSecondary} style={btnSecondaryStyle} onClick={onFinish}>Passer</button>
          )}
          <button
            className={btnPrimary}
            style={{ background: 'linear-gradient(135deg,#0B1F3A,#1F4E8C)' }}
            onClick={sent ? onFinish : handleInvite}
            disabled={sending}
          >
            {sending ? 'Envoi…' : sent ? 'Terminer' : 'Inviter & Terminer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function OnboardingWizard({ onClose }: { onClose: () => void }) {
  const { profil } = useAuth()
  const companyId = profil?.company_id ?? null
  const [step, setStep] = useState(0)

  function finish() {
    markDone()
    onClose()
  }

  function skip() {
    markDone()
    onClose()
  }

  const stepContent = [
    <StepSociete key="societe" companyId={companyId} onNext={() => setStep(1)} />,
    <StepVehicule key="vehicule" companyId={companyId} onNext={() => setStep(2)} onBack={() => setStep(0)} />,
    <StepConducteur key="conducteur" companyId={companyId} onNext={() => setStep(3)} onBack={() => setStep(1)} />,
    <StepOT key="ot" companyId={companyId} onNext={() => setStep(4)} onBack={() => setStep(2)} />,
    <StepUtilisateurs key="utilisateurs" onFinish={finish} onBack={() => setStep(3)} />,
  ]

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(11,31,58,0.7)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-8 shadow-2xl"
        style={{ background: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#0B1F3A' }}>
              Bienvenue sur Nexora Truck
            </h2>
            <p className="mt-1 text-sm" style={{ color: '#475569' }}>
              Configurons votre espace en quelques minutes.
            </p>
          </div>
          <button
            onClick={skip}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100"
            aria-label="Passer la configuration"
            title="Passer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs" style={{ color: '#64748B' }}>
            <span>{STEPS[step].label}</span>
            <span>Étape {step + 1} / {STEPS.length}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#E2E8F0' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((step + 1) / STEPS.length) * 100}%`,
                background: 'linear-gradient(90deg,#0B1F3A,#1F4E8C)',
              }}
            />
          </div>
          <div className="mt-2 flex gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s.label}
                className="flex-1 rounded-full py-0.5 text-center text-[10px] font-medium transition-colors"
                style={{
                  background: i <= step ? '#1F4E8C' : '#E2E8F0',
                  color: i <= step ? '#FFFFFF' : '#94A3B8',
                }}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Step content */}
        {stepContent[step]}

        {/* Skip all */}
        <div className="mt-4 border-t pt-4 text-center" style={{ borderColor: '#F1F5F9' }}>
          <button onClick={skip} className="text-xs transition hover:underline" style={{ color: '#94A3B8' }}>
            Passer toute la configuration
          </button>
        </div>
      </div>
    </div>
  )
}
