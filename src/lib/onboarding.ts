import type { Profil, Role } from './auth'
import { ROLE_LABELS } from './auth'
import { readCompanySettings } from './companySettings'
import { deliverDemoMailToInbox } from './demoMail'
import { ensureEmployeeRecord, generateProfessionalEmail, generateProvisionalCode, updateEmployeeRecord, type EmployeeRecord } from './employeeRecords'
import { extractPdfText } from './pdfText'
import { ensureEmployeeJobSheets, ensurePolicyDocuments, saveGeneratedHrPdfDocument } from './hrDocuments'
import { buildStaffDirectory, staffDisplayName, type StaffMember } from './staffDirectory'
import { serializeTchatPayload } from './tchatMessage'

export interface OnboardingAccountPayload {
  profileId: string
  role: Role
  firstName: string
  lastName: string
  loginEmail: string
  professionalEmail?: string | null
  provisionalCode?: string | null
}

function integrationBookletLines(employee: EmployeeRecord) {
  const settings = readCompanySettings()
  return [
    `Bienvenue chez ${settings.companyName}.`,
    '',
    `Collaborateur: ${employee.firstName} ${employee.lastName}`,
    `Fonction: ${ROLE_LABELS[employee.role] ?? employee.role}`,
    `Adresse mail professionnelle: ${employee.professionalEmail}`,
    `Code provisoire: ${employee.provisionalCode ?? 'A definir'}`,
    '',
    'Contenu du dossier d integration:',
    '- Livret d accueil et organisation entreprise',
    '- Dossier mutuelle Horizon Transport',
    '- Fiche d information embauche a completer et renvoyer',
    '- Fiche de poste metier',
    '- Convention collective applicable',
    '- Charte RGPD et reglement entreprise',
    '',
    'Merci de lire, signer et retourner les documents demandes au service RH.',
  ]
}

function intakeFormLines(employee: EmployeeRecord) {
  return [
    `FICHE INFORMATION EMBAUCHE - ${employee.firstName} ${employee.lastName}`,
    'Merci de completer ce document puis de le renvoyer au service RH.',
    '',
    'Nom: ',
    'Prenom: ',
    'Adresse: ',
    'Code postal: ',
    'Ville: ',
    'Telephone: ',
    'Email personnel: ',
    'Date de naissance: ',
    'Contact urgence nom: ',
    'Contact urgence telephone: ',
    'Numero securite sociale: ',
    'Situation familiale: ',
    'Nombre d enfants: ',
    'IBAN: ',
    'Mutuelle choisie: ',
  ]
}

export function provisionEmployeeOnboarding(account: OnboardingAccountPayload, actor: Profil) {
  const professionalEmail = account.professionalEmail || generateProfessionalEmail(account.firstName, account.lastName)
  const provisionalCode = account.provisionalCode || generateProvisionalCode()
  const employee = ensureEmployeeRecord({
    employeeId: account.profileId,
    role: account.role,
    firstName: account.firstName,
    lastName: account.lastName,
    professionalEmail,
    loginEmail: account.loginEmail,
    provisionalCode,
    contractType: account.role === 'conducteur' ? 'CDI' : null,
    jobTitle: ROLE_LABELS[account.role] ?? account.role,
  })

  const staffMember: StaffMember = {
    id: employee.employeeId,
    matricule: employee.matricule,
    role: employee.role,
    prenom: employee.firstName,
    nom: employee.lastName,
    email: employee.professionalEmail,
    domain: ROLE_LABELS[employee.role] ?? employee.role,
  }

  ensurePolicyDocuments(buildStaffDirectory([actor, {
    id: staffMember.id,
    role: staffMember.role,
    prenom: staffMember.prenom,
    nom: staffMember.nom,
    email: staffMember.email,
    domain: staffMember.domain,
    isDemo: true,
  }]), actor)

  const booklet = saveGeneratedHrPdfDocument(
    staffMember,
    actor,
    'livret_integration',
    `Livret d integration - ${staffDisplayName(staffMember)}`,
    `livret-integration-${staffMember.id}.pdf`,
    integrationBookletLines(employee),
    { requiresSignature: false, tags: ['onboarding', 'integration'] },
  )

  saveGeneratedHrPdfDocument(
    staffMember,
    actor,
    'mutuelle',
    'Dossier mutuelle Horizon Transport',
    `mutuelle-${staffMember.id}.pdf`,
    [
      'Mutuelle fictive Horizon Transport - formule Equilibre.',
      `Collaborateur: ${staffDisplayName(staffMember)}`,
      'Pieces a fournir: attestation Vitale, RIB, formulaire affiliation, ayants droit si besoin.',
      'Date d effet souhaitee: premiere prise de poste.',
    ],
    { requiresSignature: false, tags: ['onboarding', 'mutuelle'] },
  )

  saveGeneratedHrPdfDocument(
    staffMember,
    actor,
    'fiche_information_embauche',
    'Fiche information embauche a completer',
    `fiche-embauche-${staffMember.id}.pdf`,
    intakeFormLines(employee),
    { requiresSignature: false, tags: ['onboarding', 'formulaire'] },
  )

  ensureEmployeeJobSheets([staffMember], actor)

  deliverDemoMailToInbox(
    {
      id: staffMember.id,
      role: staffMember.role,
      nom: staffMember.nom,
      prenom: staffMember.prenom,
      email: staffMember.email,
      domain: staffMember.domain,
    },
    [actor.prenom, actor.nom].filter(Boolean).join(' ') || 'Service RH',
    actor.email ?? `${actor.role}@nexora.local`,
    `Bienvenue chez ${readCompanySettings().companyName}`,
    serializeTchatPayload(
      [
        `Bienvenue ${staffDisplayName(staffMember)}.`,
        `Votre adresse professionnelle est ${professionalEmail}.`,
        `Votre code provisoire est ${provisionalCode}.`,
        'Le livret d integration est joint. Les autres documents sont deja disponibles dans votre coffre numerique.',
      ].join('\n'),
      [{
        id: `attachment-${booklet.id}`,
        kind: 'document',
        name: booklet.fileName,
        mimeType: booklet.mimeType,
        size: booklet.size,
        url: booklet.url,
      }],
    ),
    ['onboarding', 'rh'],
  )

  return employee
}

export async function importEmployeeIntakeForm(file: File, employeeId: string) {
  const rawText = await extractPdfText(file)
  const findValue = (label: string) => {
    const match = rawText.match(new RegExp(`${label}\\s*[:\\-]\\s*([^\\n\\r]{2,120})`, 'i'))
    return match ? match[1].trim() : null
  }
  const childrenRaw = findValue('Nombre d enfants')
  const childrenCount = childrenRaw ? Number.parseInt(childrenRaw, 10) : null

  return updateEmployeeRecord(employeeId, {
    lastName: findValue('Nom') || undefined,
    firstName: findValue('Prenom') || undefined,
    address: findValue('Adresse'),
    postalCode: findValue('Code postal'),
    city: findValue('Ville'),
    phone: findValue('Telephone'),
    personalEmail: findValue('Email personnel'),
    birthDate: findValue('Date de naissance'),
    emergencyContactName: findValue('Contact urgence nom'),
    emergencyContactPhone: findValue('Contact urgence telephone'),
    socialSecurityNumber: findValue('Numero securite sociale'),
    maritalStatus: findValue('Situation familiale'),
    childrenCount: Number.isFinite(childrenCount) ? childrenCount : null,
    iban: findValue('IBAN'),
    mutuellePlan: findValue('Mutuelle choisie'),
  })
}
