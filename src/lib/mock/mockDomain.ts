import type { Role } from '../auth'

export type MockEmployee = {
  id: string
  role: Role
  firstName: string
  lastName: string
  domain: string
  email: string | null
  loginEmail: string | null
  isSessionProfile: boolean
  transportDriverId: string | null
}

export type MockClientRef = {
  id: string
  code: string
  name: string
  city: string
  email: string
  phone: string
  clientType: 'chargeur' | 'commissionnaire' | 'transitaire'
}

export type MockTransportDriverRef = {
  id: string
  employeeId: string | null
  lastName: string
  firstName: string
  city: string
  email: string
  licenseCategories: string[]
  preferences: string
}

export type MockVehicleRef = {
  id: string
  plate: string
  brand: string
  model: string
  vehicleType: 'tracteur' | 'porteur'
  notes: string
}

export type MockTrailerRef = {
  id: string
  plate: string
  trailerType: string
  brand: string
  notes: string
}

export const MOCK_EMPLOYEES: MockEmployee[] = [
  { id: 'demo-admin', role: 'admin', firstName: 'NEXORA', lastName: 'Admin', domain: 'Administration', email: 'admin@erp-demo.fr', loginEmail: 'admin@erp-demo.fr', isSessionProfile: true, transportDriverId: null },
  { id: 'demo-direction', role: 'dirigeant', firstName: 'Sophie', lastName: 'Morel', domain: 'Direction', email: 'direction@erp-demo.fr', loginEmail: 'direction@erp-demo.fr', isSessionProfile: true, transportDriverId: null },
  { id: 'demo-exploitation', role: 'exploitant', firstName: 'Julien', lastName: 'Lefevre', domain: 'Exploitation', email: 'exploitation@erp-demo.fr', loginEmail: 'exploitation@erp-demo.fr', isSessionProfile: true, transportDriverId: null },
  { id: 'demo-affretement', role: 'exploitant', firstName: 'Camille', lastName: 'Renaud', domain: 'Affretement', email: 'affretement@erp-demo.fr', loginEmail: 'affretement@erp-demo.fr', isSessionProfile: true, transportDriverId: null },
  { id: 'demo-atelier', role: 'mecanicien', firstName: 'Thomas', lastName: 'Bernier', domain: 'Atelier', email: 'atelier@erp-demo.fr', loginEmail: 'atelier@erp-demo.fr', isSessionProfile: true, transportDriverId: null },
  { id: 'demo-commercial', role: 'commercial', firstName: 'Nora', lastName: 'Garcia', domain: 'Commerce', email: 'commercial@erp-demo.fr', loginEmail: 'commercial@erp-demo.fr', isSessionProfile: true, transportDriverId: null },
  { id: 'demo-compta', role: 'comptable', firstName: 'Claire', lastName: 'Petitjean', domain: 'Comptabilite', email: 'compta@erp-demo.fr', loginEmail: 'compta@erp-demo.fr', isSessionProfile: true, transportDriverId: null },
  { id: 'demo-rh', role: 'rh', firstName: 'Emma', lastName: 'Marchal', domain: 'Ressources humaines', email: 'rh@erp-demo.fr', loginEmail: 'rh@erp-demo.fr', isSessionProfile: true, transportDriverId: null },
  { id: 'demo-conducteur', role: 'conducteur', firstName: 'Cedric', lastName: 'Martin', domain: 'Terrain', email: 'conducteur@erp-demo.fr', loginEmail: 'conducteur@erp-demo.fr', isSessionProfile: true, transportDriverId: '30000000-0000-0000-0000-000000000001' },
  { id: 'employee-driver-002', role: 'conducteur', firstName: 'Yann', lastName: 'Bernard', domain: 'Terrain', email: 'yann.bernard@erp-demo.fr', loginEmail: null, isSessionProfile: false, transportDriverId: '30000000-0000-0000-0000-000000000002' },
  { id: 'employee-driver-003', role: 'conducteur', firstName: 'Antoine', lastName: 'Dubois', domain: 'Terrain', email: 'antoine.dubois@erp-demo.fr', loginEmail: null, isSessionProfile: false, transportDriverId: '30000000-0000-0000-0000-000000000003' },
  { id: 'employee-driver-004', role: 'conducteur', firstName: 'Mathieu', lastName: 'Petit', domain: 'Terrain', email: 'mathieu.petit@erp-demo.fr', loginEmail: null, isSessionProfile: false, transportDriverId: '30000000-0000-0000-0000-000000000004' },
  { id: 'employee-driver-005', role: 'conducteur', firstName: 'Nicolas', lastName: 'Robert', domain: 'Terrain', email: 'nicolas.robert@erp-demo.fr', loginEmail: null, isSessionProfile: false, transportDriverId: '30000000-0000-0000-0000-000000000005' },
  { id: 'employee-driver-006', role: 'conducteur', firstName: 'Loic', lastName: 'Richard', domain: 'Terrain', email: 'loic.richard@erp-demo.fr', loginEmail: null, isSessionProfile: false, transportDriverId: '30000000-0000-0000-0000-000000000006' },
  { id: 'employee-driver-007', role: 'conducteur', firstName: 'Kevin', lastName: 'Simon', domain: 'Terrain', email: 'kevin.simon@erp-demo.fr', loginEmail: null, isSessionProfile: false, transportDriverId: '30000000-0000-0000-0000-000000000007' },
  { id: 'employee-driver-008', role: 'conducteur', firstName: 'David', lastName: 'Moreau', domain: 'Terrain', email: 'david.moreau@erp-demo.fr', loginEmail: null, isSessionProfile: false, transportDriverId: '30000000-0000-0000-0000-000000000008' },
  { id: 'employee-driver-009', role: 'conducteur', firstName: 'Hugo', lastName: 'Fontaine', domain: 'Terrain', email: 'hugo.fontaine@erp-demo.fr', loginEmail: null, isSessionProfile: false, transportDriverId: '30000000-0000-0000-0000-000000000009' },
  { id: 'employee-driver-010', role: 'conducteur', firstName: 'Sofiane', lastName: 'Garcia', domain: 'Terrain', email: 'sofiane.garcia@erp-demo.fr', loginEmail: null, isSessionProfile: false, transportDriverId: '30000000-0000-0000-0000-000000000010' },
  { id: 'employee-driver-011', role: 'conducteur', firstName: 'Lucas', lastName: 'Weber', domain: 'Terrain', email: 'lucas.weber@erp-demo.fr', loginEmail: null, isSessionProfile: false, transportDriverId: '30000000-0000-0000-0000-000000000011' },
  { id: 'employee-driver-012', role: 'conducteur', firstName: 'Thomas', lastName: 'Girard', domain: 'Terrain', email: 'thomas.girard@erp-demo.fr', loginEmail: null, isSessionProfile: false, transportDriverId: '30000000-0000-0000-0000-000000000012' },
]

export const MOCK_CLIENT_REFS: MockClientRef[] = [
  { id: '20000000-0000-0000-0000-000000000001', code: 'CLI-001', name: 'Transfrais Nord', city: 'Lille', email: 'logistique@transfrais-nord.fr', phone: '03 20 10 10 10', clientType: 'chargeur' },
  { id: '20000000-0000-0000-0000-000000000002', code: 'CLI-002', name: 'Batilog Est', city: 'Nancy', email: 'exploitation@batilog-est.fr', phone: '03 83 40 20 20', clientType: 'chargeur' },
  { id: '20000000-0000-0000-0000-000000000003', code: 'CLI-003', name: 'Ocean Forwarding', city: 'Le Havre', email: 'ops@ocean-forwarding.eu', phone: '02 35 11 22 33', clientType: 'transitaire' },
  { id: '20000000-0000-0000-0000-000000000004', code: 'CLI-004', name: 'Agro Centre', city: 'Tours', email: 'transport@agro-centre.fr', phone: '02 47 55 77 88', clientType: 'chargeur' },
  { id: '20000000-0000-0000-0000-000000000005', code: 'CLI-005', name: 'Express Rhone', city: 'Lyon', email: 'planning@express-rhone.fr', phone: '04 72 12 34 56', clientType: 'commissionnaire' },
  { id: '20000000-0000-0000-0000-000000000006', code: 'CLI-006', name: 'Metal Ouest', city: 'Rennes', email: 'shipping@metal-ouest.fr', phone: '02 99 66 44 22', clientType: 'chargeur' },
  { id: '20000000-0000-0000-0000-000000000007', code: 'CLI-007', name: 'Retail Atlantique', city: 'Bordeaux', email: 'supply@retail-atlantique.fr', phone: '05 56 33 10 10', clientType: 'chargeur' },
  { id: '20000000-0000-0000-0000-000000000008', code: 'CLI-008', name: 'Pharma Alpes', city: 'Grenoble', email: 'expeditions@pharma-alpes.fr', phone: '04 76 22 31 41', clientType: 'chargeur' },
  { id: '20000000-0000-0000-0000-000000000009', code: 'CLI-009', name: 'BTP Mediterranee', city: 'Marseille', email: 'dispatch@btp-med.fr', phone: '04 91 48 50 60', clientType: 'commissionnaire' },
  { id: '20000000-0000-0000-0000-000000000010', code: 'CLI-010', name: 'Textile Grand Est', city: 'Mulhouse', email: 'ops@textile-grandest.fr', phone: '03 89 66 12 44', clientType: 'transitaire' },
]

export const MOCK_TRANSPORT_DRIVERS: MockTransportDriverRef[] = [
  { id: '30000000-0000-0000-0000-000000000001', employeeId: 'demo-conducteur', lastName: 'Martin', firstName: 'Cedric', city: 'Lille', email: 'cedric.martin@erp-demo.fr', licenseCategories: ['C', 'CE'], preferences: 'National frigo' },
  { id: '30000000-0000-0000-0000-000000000002', employeeId: 'employee-driver-002', lastName: 'Bernard', firstName: 'Yann', city: 'Arras', email: 'yann.bernard@erp-demo.fr', licenseCategories: ['C', 'CE'], preferences: 'Regional palettes' },
  { id: '30000000-0000-0000-0000-000000000003', employeeId: 'employee-driver-003', lastName: 'Dubois', firstName: 'Antoine', city: 'Lens', email: 'antoine.dubois@erp-demo.fr', licenseCategories: ['B', 'C', 'CE'], preferences: 'Plateau acier' },
  { id: '30000000-0000-0000-0000-000000000004', employeeId: 'employee-driver-004', lastName: 'Petit', firstName: 'Mathieu', city: 'Valenciennes', email: 'mathieu.petit@erp-demo.fr', licenseCategories: ['C', 'CE'], preferences: 'Frigorifique' },
  { id: '30000000-0000-0000-0000-000000000005', employeeId: 'employee-driver-005', lastName: 'Robert', firstName: 'Nicolas', city: 'Reims', email: 'nicolas.robert@erp-demo.fr', licenseCategories: ['C'], preferences: 'Porteur hayon' },
  { id: '30000000-0000-0000-0000-000000000006', employeeId: 'employee-driver-006', lastName: 'Richard', firstName: 'Loic', city: 'Lyon', email: 'loic.richard@erp-demo.fr', licenseCategories: ['C', 'CE'], preferences: 'Conteneur' },
  { id: '30000000-0000-0000-0000-000000000007', employeeId: 'employee-driver-007', lastName: 'Simon', firstName: 'Kevin', city: 'Tours', email: 'kevin.simon@erp-demo.fr', licenseCategories: ['C'], preferences: 'Distribution' },
  { id: '30000000-0000-0000-0000-000000000008', employeeId: 'employee-driver-008', lastName: 'Moreau', firstName: 'David', city: 'Rennes', email: 'david.moreau@erp-demo.fr', licenseCategories: ['C', 'CE'], preferences: 'Industrie' },
  { id: '30000000-0000-0000-0000-000000000009', employeeId: 'employee-driver-009', lastName: 'Fontaine', firstName: 'Hugo', city: 'Nantes', email: 'hugo.fontaine@erp-demo.fr', licenseCategories: ['C', 'CE'], preferences: 'Retail' },
  { id: '30000000-0000-0000-0000-000000000010', employeeId: 'employee-driver-010', lastName: 'Garcia', firstName: 'Sofiane', city: 'Marseille', email: 'sofiane.garcia@erp-demo.fr', licenseCategories: ['C', 'CE'], preferences: 'Chantier' },
  { id: '30000000-0000-0000-0000-000000000011', employeeId: 'employee-driver-011', lastName: 'Weber', firstName: 'Lucas', city: 'Mulhouse', email: 'lucas.weber@erp-demo.fr', licenseCategories: ['C', 'CE'], preferences: 'Textile' },
  { id: '30000000-0000-0000-0000-000000000012', employeeId: 'employee-driver-012', lastName: 'Girard', firstName: 'Thomas', city: 'Grenoble', email: 'thomas.girard@erp-demo.fr', licenseCategories: ['C', 'CE'], preferences: 'Pharma' },
]

export const MOCK_VEHICLE_REFS: MockVehicleRef[] = [
  { id: '40000000-0000-0000-0000-000000000001', plate: 'FR-201-AA', brand: 'Volvo', model: 'FH 500', vehicleType: 'tracteur', notes: 'Kit ADR, sangles, transpalette' },
  { id: '40000000-0000-0000-0000-000000000002', plate: 'FR-202-AA', brand: 'DAF', model: 'XF 480', vehicleType: 'tracteur', notes: 'Bache et arrimage complet' },
  { id: '40000000-0000-0000-0000-000000000003', plate: 'FR-203-AA', brand: 'Mercedes', model: 'Actros 1845', vehicleType: 'tracteur', notes: 'Configuration plateau acier' },
  { id: '40000000-0000-0000-0000-000000000004', plate: 'FR-204-AA', brand: 'Renault', model: 'T 480', vehicleType: 'tracteur', notes: 'Frigo affecte agro' },
  { id: '40000000-0000-0000-0000-000000000005', plate: 'FR-205-AA', brand: 'Iveco', model: 'S-Way', vehicleType: 'tracteur', notes: 'Parc maintenance' },
  { id: '40000000-0000-0000-0000-000000000006', plate: 'FR-206-AA', brand: 'MAN', model: 'TGX 18.470', vehicleType: 'tracteur', notes: 'Porte-conteneur' },
  { id: '40000000-0000-0000-0000-000000000007', plate: 'FR-207-AA', brand: 'Mercedes', model: 'Atego', vehicleType: 'porteur', notes: 'Hayon 2T et transpalette' },
  { id: '40000000-0000-0000-0000-000000000008', plate: 'FR-208-AA', brand: 'Renault', model: 'D Wide', vehicleType: 'porteur', notes: 'Porteur sec' },
  { id: '40000000-0000-0000-0000-000000000009', plate: 'FR-209-AA', brand: 'Scania', model: 'R 460', vehicleType: 'tracteur', notes: 'Retail Atlantique' },
  { id: '40000000-0000-0000-0000-000000000010', plate: 'FR-210-AA', brand: 'Volvo', model: 'FMX 460', vehicleType: 'tracteur', notes: 'BTP Mediterranee' },
  { id: '40000000-0000-0000-0000-000000000011', plate: 'FR-211-AA', brand: 'MAN', model: 'TGX 18.510', vehicleType: 'tracteur', notes: 'Pharma sonde temperature' },
  { id: '40000000-0000-0000-0000-000000000012', plate: 'FR-212-AA', brand: 'DAF', model: 'XG 480', vehicleType: 'tracteur', notes: 'Textile Grand Est' },
]

export const MOCK_TRAILER_REFS: MockTrailerRef[] = [
  { id: '50000000-0000-0000-0000-000000000001', plate: 'RM-301-BB', trailerType: 'frigo', brand: 'Lamberet', notes: 'Groupe froid' },
  { id: '50000000-0000-0000-0000-000000000002', plate: 'RM-302-BB', trailerType: 'tautliner', brand: 'Schmitz', notes: 'Baches renforcees' },
  { id: '50000000-0000-0000-0000-000000000003', plate: 'RM-303-BB', trailerType: 'plateau', brand: 'Krone', notes: 'Kit coils' },
  { id: '50000000-0000-0000-0000-000000000004', plate: 'RM-304-BB', trailerType: 'frigo', brand: 'Chereau', notes: 'Sonde temperature' },
  { id: '50000000-0000-0000-0000-000000000005', plate: 'RM-305-BB', trailerType: 'fourgon', brand: 'Trouillet', notes: 'Remorque maintenance' },
  { id: '50000000-0000-0000-0000-000000000006', plate: 'RM-306-BB', trailerType: 'porte_conteneur', brand: 'Schwarzmuller', notes: 'Verrouillage conteneur' },
  { id: '50000000-0000-0000-0000-000000000007', plate: 'RM-307-BB', trailerType: 'tautliner', brand: 'Krone', notes: 'Double plancher retail' },
  { id: '50000000-0000-0000-0000-000000000008', plate: 'RM-308-BB', trailerType: 'frigo', brand: 'LeciTrailer', notes: 'Pharma' },
  { id: '50000000-0000-0000-0000-000000000009', plate: 'RM-309-BB', trailerType: 'plateau', brand: 'Benalu', notes: 'Ridelles chantier' },
  { id: '50000000-0000-0000-0000-000000000010', plate: 'RM-310-BB', trailerType: 'fourgon', brand: 'Schmitz', notes: 'Textile securise' },
]

export function listSessionMockEmployees() {
  return MOCK_EMPLOYEES.filter(employee => employee.isSessionProfile)
}

export function listMockEmployees() {
  return [...MOCK_EMPLOYEES]
}

export function findMockEmployeeById(id: string | null | undefined) {
  if (!id) return null
  return MOCK_EMPLOYEES.find(employee => employee.id === id) ?? null
}

export function findMockEmployeeByEmail(email: string | null | undefined) {
  if (!email) return null
  const normalized = email.toLowerCase()
  return MOCK_EMPLOYEES.find(employee => employee.email?.toLowerCase() === normalized) ?? null
}

export function findMockTransportDriverById(id: string | null | undefined) {
  if (!id) return null
  return MOCK_TRANSPORT_DRIVERS.find(driver => driver.id === id) ?? null
}

export function findMockEmployeeForTransportDriver(driverId: string | null | undefined) {
  if (!driverId) return null
  return MOCK_EMPLOYEES.find(employee => employee.transportDriverId === driverId) ?? null
}
