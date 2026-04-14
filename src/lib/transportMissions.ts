import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

export type TransportMission = Tables<'transport_missions'>
export type TransportMissionInsert = TablesInsert<'transport_missions'>
export type TransportMissionUpdate = TablesUpdate<'transport_missions'>
export type MissionScopedCourse = Pick<
  Tables<'ordres_transport'>,
  'id' | 'mission_id' | 'conducteur_id' | 'vehicule_id' | 'remorque_id' | 'type_transport' | 'groupage_fige'
>

export interface TransportMissionRepository {
  fetchCoursesByIds(courseIds: string[]): Promise<MissionScopedCourse[]>
  fetchCourseById(courseId: string): Promise<MissionScopedCourse | null>
  listMissionCourses(missionId: string): Promise<MissionScopedCourse[]>
  createMission(payload: TransportMissionInsert): Promise<TransportMission>
  updateMission(missionId: string, payload: TransportMissionUpdate): Promise<TransportMission>
  updateCoursesByIds(courseIds: string[], payload: TablesUpdate<'ordres_transport'>): Promise<void>
  updateCourseById(courseId: string, payload: TablesUpdate<'ordres_transport'>): Promise<void>
  clearMissionCourses(missionId: string, payload: TablesUpdate<'ordres_transport'>): Promise<void>
  deleteMission(missionId: string): Promise<void>
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function getCommonResource<T extends keyof MissionScopedCourse>(courses: MissionScopedCourse[], key: T) {
  const values = uniqueIds(courses.map(course => {
    const value = course[key]
    return typeof value === 'string' ? value : null
  }))
  return values.length === 1 ? values[0] : null
}

export function deriveMissionWriteModel(courses: MissionScopedCourse[]): TransportMissionInsert {
  if (courses.length === 0) {
    throw new Error('Impossible de derivar une mission sans course.')
  }

  const firstCourse = courses[0]
  const type = courses.length > 1
    ? 'groupage'
    : firstCourse.type_transport === 'partiel'
      ? 'partiel'
      : 'complet'

  return {
    type,
    conducteur_id: getCommonResource(courses, 'conducteur_id'),
    vehicule_id: getCommonResource(courses, 'vehicule_id'),
    remorque_id: getCommonResource(courses, 'remorque_id'),
  }
}

export function createSupabaseTransportMissionRepository(): TransportMissionRepository {
  return {
    async fetchCoursesByIds(courseIds) {
      const ids = uniqueIds(courseIds)
      if (ids.length === 0) return []
      const query = await supabase
        .from('ordres_transport')
        .select('id, mission_id, conducteur_id, vehicule_id, remorque_id, type_transport, groupage_fige')
        .in('id', ids)

      if (query.error) throw query.error
      return (query.data ?? []) as MissionScopedCourse[]
    },
    async fetchCourseById(courseId) {
      const query = await supabase
        .from('ordres_transport')
        .select('id, mission_id, conducteur_id, vehicule_id, remorque_id, type_transport, groupage_fige')
        .eq('id', courseId)
        .maybeSingle()

      if (query.error) throw query.error
      return (query.data ?? null) as MissionScopedCourse | null
    },
    async listMissionCourses(missionId) {
      const query = await supabase
        .from('ordres_transport')
        .select('id, mission_id, conducteur_id, vehicule_id, remorque_id, type_transport, groupage_fige')
        .eq('mission_id', missionId)

      if (query.error) throw query.error
      return (query.data ?? []) as MissionScopedCourse[]
    },
    async createMission(payload) {
      const query = await supabase
        .from('transport_missions')
        .insert(payload)
        .select('*')
        .single()

      if (query.error) throw query.error
      return query.data as TransportMission
    },
    async updateMission(missionId, payload) {
      const query = await supabase
        .from('transport_missions')
        .update(payload)
        .eq('id', missionId)
        .select('*')
        .single()

      if (query.error) throw query.error
      return query.data as TransportMission
    },
    async updateCoursesByIds(courseIds, payload) {
      const ids = uniqueIds(courseIds)
      if (ids.length === 0) return
      const query = await supabase
        .from('ordres_transport')
        .update(payload)
        .in('id', ids)

      if (query.error) throw query.error
    },
    async updateCourseById(courseId, payload) {
      const query = await supabase
        .from('ordres_transport')
        .update(payload)
        .eq('id', courseId)

      if (query.error) throw query.error
    },
    async clearMissionCourses(missionId, payload) {
      const query = await supabase
        .from('ordres_transport')
        .update(payload)
        .eq('mission_id', missionId)

      if (query.error) throw query.error
    },
    async deleteMission(missionId) {
      const query = await supabase
        .from('transport_missions')
        .delete()
        .eq('id', missionId)

      if (query.error) throw query.error
    },
  }
}

async function syncMission(repository: TransportMissionRepository, missionId: string) {
  const courses = await repository.listMissionCourses(missionId)
  if (courses.length === 0) {
    await repository.deleteMission(missionId)
    return null
  }

  return repository.updateMission(missionId, deriveMissionWriteModel(courses))
}

export function createTransportMissionService(repository: TransportMissionRepository = createSupabaseTransportMissionRepository()) {
  return {
    async createMissionFromCourses(courseIds: string[]) {
      const ids = uniqueIds(courseIds)
      if (ids.length === 0) {
        throw new Error('Aucune course selectionnee pour creer une mission.')
      }

      const courses = await repository.fetchCoursesByIds(ids)
      if (courses.length !== ids.length) {
        throw new Error('Impossible de retrouver toutes les courses selectionnees.')
      }

      const previousMissionIds = uniqueIds(courses.map(course => course.mission_id ?? ''))
      const mission = await repository.createMission(deriveMissionWriteModel(courses))

      await repository.updateCoursesByIds(ids, {
        mission_id: mission.id,
        type_transport: ids.length > 1 ? 'groupage' : undefined,
      })

      for (const previousMissionId of previousMissionIds) {
        if (previousMissionId !== mission.id) {
          await syncMission(repository, previousMissionId)
        }
      }

      return syncMission(repository, mission.id) as Promise<TransportMission>
    },

    async addCourseToMission(courseId: string, missionId: string) {
      const course = await repository.fetchCourseById(courseId)
      if (!course) {
        throw new Error('Course introuvable pour ajout a la mission.')
      }

      const previousMissionId = course.mission_id
      await repository.updateCourseById(courseId, { mission_id: missionId, type_transport: 'groupage' })
      const mission = await syncMission(repository, missionId)

      if (previousMissionId && previousMissionId !== missionId) {
        await syncMission(repository, previousMissionId)
      }

      if (!mission) {
        throw new Error('La mission cible n existe plus apres synchronisation.')
      }

      return mission
    },

    async removeCourseFromMission(courseId: string) {
      const course = await repository.fetchCourseById(courseId)
      if (!course?.mission_id) {
        return null
      }

      const missionId = course.mission_id
      await repository.updateCourseById(courseId, { mission_id: null, groupage_fige: false })
      await syncMission(repository, missionId)
      return missionId
    },

    async dissolveMission(missionId: string) {
      await repository.clearMissionCourses(missionId, { mission_id: null, groupage_fige: false })
      await repository.deleteMission(missionId)
    },
  }
}

const transportMissionService = createTransportMissionService()

export const createMissionFromCourses = (courseIds: string[]) => transportMissionService.createMissionFromCourses(courseIds)
export const addCourseToMission = (courseId: string, missionId: string) => transportMissionService.addCourseToMission(courseId, missionId)
export const removeCourseFromMission = (courseId: string) => transportMissionService.removeCourseFromMission(courseId)
export const dissolveMission = (missionId: string) => transportMissionService.dissolveMission(missionId)