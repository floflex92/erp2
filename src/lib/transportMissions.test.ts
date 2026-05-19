import { describe, expect, it } from 'vitest'
import { createTransportMissionService, deriveMissionWriteModel, type MissionScopedCourse, type TransportMissionRepository } from './transportMissions'

type MutableCourse = MissionScopedCourse

function createInMemoryRepository(initialCourses: MutableCourse[]): TransportMissionRepository & { courses: MutableCourse[]; missions: any[] } {
  const courses = [...initialCourses]
  const missions: any[] = []

  return {
    courses,
    missions,
    async fetchCoursesByIds(courseIds) {
      return courses.filter(course => courseIds.includes(course.id))
    },
    async fetchCourseById(courseId) {
      return courses.find(course => course.id === courseId) ?? null
    },
    async listMissionCourses(missionId) {
      return courses.filter(course => course.mission_id === missionId)
    },
    async createMission(payload) {
      const mission = {
        id: `mission-${missions.length + 1}`,
        type: payload.type ?? 'groupage',
        conducteur_id: payload.conducteur_id ?? null,
        vehicule_id: payload.vehicule_id ?? null,
        remorque_id: payload.remorque_id ?? null,
        created_at: '2026-04-14T00:00:00.000Z',
        updated_at: '2026-04-14T00:00:00.000Z',
      }
      missions.push(mission)
      return mission
    },
    async updateMission(missionId, payload) {
      const mission = missions.find(item => item.id === missionId)
      if (!mission) throw new Error('Mission introuvable')
      Object.assign(mission, payload)
      return mission
    },
    async updateCoursesByIds(courseIds, payload) {
      for (const course of courses) {
        if (courseIds.includes(course.id)) {
          Object.assign(course, payload)
        }
      }
    },
    async updateCourseById(courseId, payload) {
      const course = courses.find(item => item.id === courseId)
      if (!course) throw new Error('Course introuvable')
      Object.assign(course, payload)
    },
    async setMissionFreezeState(missionId, nextFrozen) {
      for (const course of courses) {
        if (course.mission_id === missionId) {
          course.groupage_fige = nextFrozen
        }
      }
    },
    async clearMissionCourses(missionId, payload) {
      for (const course of courses) {
        if (course.mission_id === missionId) {
          Object.assign(course, payload)
        }
      }
    },
    async deleteMission(missionId) {
      const index = missions.findIndex(item => item.id === missionId)
      if (index >= 0) {
        missions.splice(index, 1)
      }
    },
  }
}

describe('transportMissions', () => {
  it('derive un payload mission groupage a partir des courses', () => {
    const payload = deriveMissionWriteModel([
      { id: 'c1', mission_id: null, conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: 'r1', type_transport: 'complet', groupage_fige: false },
      { id: 'c2', mission_id: null, conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: 'r1', type_transport: 'complet', groupage_fige: false },
    ])

    expect(payload).toEqual({
      type: 'groupage',
      conducteur_id: 'd1',
      vehicule_id: 'v1',
      remorque_id: 'r1',
    })
  })

  it('cree une mission et affecte le meme mission_id aux courses selectionnees', async () => {
    const repository = createInMemoryRepository([
      { id: 'c1', mission_id: null, conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, type_transport: 'complet', groupage_fige: false },
      { id: 'c2', mission_id: null, conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, type_transport: 'express', groupage_fige: false },
    ])
    const service = createTransportMissionService(repository)

    const mission = await service.createMissionFromCourses(['c1', 'c2'])

    expect(repository.missions).toHaveLength(1)
    expect(mission.type).toBe('groupage')
    expect(repository.courses[0].mission_id).toBe(mission.id)
    expect(repository.courses[1].mission_id).toBe(mission.id)
    expect(repository.courses[0].type_transport).toBe('complet')
    expect(repository.courses[1].type_transport).toBe('express')
  })

  it('ajoute une course a une mission sans ecraser son type transport', async () => {
    const repository = createInMemoryRepository([
      { id: 'c1', mission_id: 'mission-1', conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, type_transport: 'complet', groupage_fige: false },
      { id: 'c2', mission_id: null, conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, type_transport: 'partiel', groupage_fige: false },
    ])
    repository.missions.push({ id: 'mission-1', type: 'groupage', conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, created_at: '2026-04-14T00:00:00.000Z', updated_at: '2026-04-14T00:00:00.000Z' })
    const service = createTransportMissionService(repository)

    await service.addCourseToMission('c2', 'mission-1')

    expect(repository.courses[1].mission_id).toBe('mission-1')
    expect(repository.courses[1].type_transport).toBe('partiel')
  })

  it('retire une course d une mission puis dissout la mission restante', async () => {
    const repository = createInMemoryRepository([
      { id: 'c1', mission_id: 'mission-1', conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, type_transport: 'groupage', groupage_fige: false },
      { id: 'c2', mission_id: 'mission-1', conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, type_transport: 'groupage', groupage_fige: false },
    ])
    repository.missions.push({ id: 'mission-1', type: 'groupage', conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, created_at: '2026-04-14T00:00:00.000Z', updated_at: '2026-04-14T00:00:00.000Z' })
    const service = createTransportMissionService(repository)

    await service.removeCourseFromMission('c1')

    expect(repository.courses[0].mission_id).toBeNull()
    expect(repository.courses[0].groupage_fige).toBe(false)
    expect(repository.missions[0].type).toBe('complet')

    await service.dissolveMission('mission-1')

    expect(repository.courses[1].mission_id).toBeNull()
    expect(repository.courses[1].groupage_fige).toBe(false)
    expect(repository.missions).toHaveLength(0)
  })

  it('refuse de delier une course quand le groupage est fige', async () => {
    const repository = createInMemoryRepository([
      { id: 'c1', mission_id: 'mission-1', conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, type_transport: 'groupage', groupage_fige: true },
      { id: 'c2', mission_id: 'mission-1', conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, type_transport: 'groupage', groupage_fige: true },
    ])
    repository.missions.push({ id: 'mission-1', type: 'groupage', conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, created_at: '2026-04-14T00:00:00.000Z', updated_at: '2026-04-14T00:00:00.000Z' })
    const service = createTransportMissionService(repository)

    await expect(service.removeCourseFromMission('c1')).rejects.toThrow(/Deliaison de groupage impossible/i)
    expect(repository.courses[0].mission_id).toBe('mission-1')
  })

  it('fige puis defige une mission complete', async () => {
    const repository = createInMemoryRepository([
      { id: 'c1', mission_id: 'mission-1', conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, type_transport: 'groupage', groupage_fige: false },
      { id: 'c2', mission_id: 'mission-1', conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, type_transport: 'groupage', groupage_fige: false },
    ])
    repository.missions.push({ id: 'mission-1', type: 'groupage', conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, created_at: '2026-04-14T00:00:00.000Z', updated_at: '2026-04-14T00:00:00.000Z' })
    const service = createTransportMissionService(repository)

    await service.setMissionFreezeState('mission-1', true)
    expect(repository.courses[0].groupage_fige).toBe(true)
    expect(repository.courses[1].groupage_fige).toBe(true)

    await service.setMissionFreezeState('mission-1', false)
    expect(repository.courses[0].groupage_fige).toBe(false)
    expect(repository.courses[1].groupage_fige).toBe(false)
  })

  it('refuse d assembler des courses independantes si une course est deja en mission', async () => {
    const repository = createInMemoryRepository([
      { id: 'c1', mission_id: null, conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, type_transport: 'complet', groupage_fige: false },
      { id: 'c2', mission_id: 'mission-1', conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, type_transport: 'groupage', groupage_fige: false },
    ])
    repository.missions.push({ id: 'mission-1', type: 'groupage', conducteur_id: 'd1', vehicule_id: 'v1', remorque_id: null, created_at: '2026-04-14T00:00:00.000Z', updated_at: '2026-04-14T00:00:00.000Z' })
    const service = createTransportMissionService(repository)

    await expect(service.assembleIndependentCourses(['c1', 'c2'])).rejects.toThrow(/deja en mission/i)
  })
})