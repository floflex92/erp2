export interface CompanySettings {
  companyName: string
  logoDataUrl: string | null
  logoFileName: string | null
  rgpdCharter: string
  internalRules: string
  updatedAt: string
}

const STORAGE_KEY = 'nexora-company-settings-v1'
const EVENT_NAME = 'nexora-company-settings-updated'
export const DEFAULT_COMPANY_NAME = 'CHANNELFRET INTERNATIONAL'

export const DEFAULT_RGPD_CHARTER = [
  '1. L entreprise traite les donnees personnelles uniquement pour des finalites determinees, explicites et legitimes: RH, paie, exploitation, flotte, conformite et communication professionnelle.',
  '2. Seules les donnees adequates, pertinentes et strictement necessaires aux finalites declarees doivent etre collecte es et utilisees.',
  '3. Les acces aux donnees sont limites aux seules personnes habilitees dans la stricte limite de leurs missions.',
  '4. Les donnees sensibles ou a risque, notamment identite, sante, paie, securite sociale et coordonnees bancaires, doivent faire l objet de precautions renforcees.',
  '5. Toute extraction, impression, transfert externe ou consultation hors mission doit etre justifie, securise et, si besoin, autorise.',
  '6. Chaque collaborateur dispose d un droit d information, d acces, de rectification et, selon les cas, d opposition, d effacement ou de limitation.',
  '7. Les donnees ne sont conservees que pendant la duree necessaire, puis archivees ou supprimees selon les obligations legales et internes.',
  '8. Tout incident, acces non autorise, perte ou diffusion de donnees doit etre signale sans delai.',
].join('\n')

export const DEFAULT_INTERNAL_RULES = [
  '1. Chaque collaborateur prend connaissance du reglement interieur avant prise de poste.',
  '2. Les equipements, documents et acces ERP sont reserves a un usage professionnel.',
  '3. Toute anomalie securite, accident ou infraction doit etre remontee sans delai.',
  '4. Les absences, retards et indisponibilites doivent etre signales via la chaine hierarchique.',
  '5. Les documents RH et de conduite doivent etre maintenus a jour en permanence.',
  '6. La signature numerique engage le collaborateur au meme titre qu une signature manuscrite dans le cadre interne.',
].join('\n')

function defaultSettings(): CompanySettings {
  return {
    companyName: DEFAULT_COMPANY_NAME,
    logoDataUrl: null,
    logoFileName: null,
    rgpdCharter: DEFAULT_RGPD_CHARTER,
    internalRules: DEFAULT_INTERNAL_RULES,
    updatedAt: new Date().toISOString(),
  }
}

function saveState(settings: CompanySettings) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

export function readCompanySettings() {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const fallback = defaultSettings()
    saveState(fallback)
    return fallback
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CompanySettings>
    return {
      companyName: typeof parsed.companyName === 'string' && parsed.companyName.trim() ? parsed.companyName.trim() : DEFAULT_COMPANY_NAME,
      logoDataUrl: typeof parsed.logoDataUrl === 'string' ? parsed.logoDataUrl : null,
      logoFileName: typeof parsed.logoFileName === 'string' ? parsed.logoFileName : null,
      rgpdCharter: typeof parsed.rgpdCharter === 'string' && parsed.rgpdCharter.trim() ? parsed.rgpdCharter : DEFAULT_RGPD_CHARTER,
      internalRules: typeof parsed.internalRules === 'string' && parsed.internalRules.trim() ? parsed.internalRules : DEFAULT_INTERNAL_RULES,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    } satisfies CompanySettings
  } catch {
    const fallback = defaultSettings()
    saveState(fallback)
    return fallback
  }
}

export function updateCompanySettings(patch: Partial<CompanySettings>) {
  const next = {
    ...readCompanySettings(),
    ...patch,
    updatedAt: new Date().toISOString(),
  } satisfies CompanySettings
  saveState(next)
  return next
}

export function subscribeCompanySettings(listener: () => void) {
  const handleUpdate = () => listener()
  window.addEventListener(EVENT_NAME, handleUpdate)
  window.addEventListener('storage', handleUpdate)
  return () => {
    window.removeEventListener(EVENT_NAME, handleUpdate)
    window.removeEventListener('storage', handleUpdate)
  }
}
