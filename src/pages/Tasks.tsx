import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '@/lib/auth'
import { looseSupabase } from '@/lib/supabaseLoose'

type Task = {
  id: string
  user_id: string
  title: string
  notes: string | null
  completed: boolean
  due_date: string | null
  priority: Priority
  created_at: string
  updated_at: string
}
type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'notes'> & {
  notes?: string | null
}

const STORAGE_KEY = 'nexora_tasks_manager_tasks_v1'

type Priority = 'low' | 'medium' | 'high'
type DueFilter = 'all' | 'upcoming' | 'overdue'
type SortBy = 'created_at' | 'due_date' | 'priority' | 'title'

type PriorityOption = { value: Priority; label: string; className: string }
const PRIORITIES: PriorityOption[] = [
  { value: 'high', label: 'Haute', className: 'bg-red-100 text-red-700' },
  { value: 'medium', label: 'Moyenne', className: 'bg-amber-100 text-amber-700' },
  { value: 'low', label: 'Basse', className: 'bg-emerald-100 text-emerald-700' },
]

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'created_at', label: 'Date création' },
  { value: 'due_date', label: 'Date échéance' },
  { value: 'priority', label: 'Priorité' },
  { value: 'title', label: 'Titre' },
]

export default function TasksPage() {
  const { profil } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dueFilter, setDueFilter] = useState<DueFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('created_at')
  const [sortAsc, setSortAsc] = useState(true)

  useEffect(() => {
    async function loadTasks() {
      if (!profil) {
        try {
          const saved = window.localStorage.getItem(STORAGE_KEY)
          setTasks(saved ? (JSON.parse(saved) as Task[]) : [])
        } catch {
          setTasks([])
        } finally {
          setLoading(false)
        }
        return
      }

      try {
        const { data, error: supabaseError } = await looseSupabase
          .from('tasks')
          .select('*')
          .eq('user_id', profil.id)
          .order('created_at', { ascending: false })

        if (supabaseError) throw supabaseError

        setTasks((data ?? []) as Task[])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger les tâches.')
      } finally {
        setLoading(false)
      }
    }

    void loadTasks()
  }, [profil])

  useEffect(() => {
    if (!profil) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
    }
  }, [tasks, profil])

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = newTask.trim()
    if (!title) return

    if (!profil) {
      setTasks(current => [{
        id: crypto.randomUUID(),
        title,
        completed: false,
        user_id: '',
        notes: null,
        due_date: newTaskDueDate || null,
        priority: newTaskPriority,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, ...current])
      setNewTask('')
      setNewTaskDueDate('')
      setNewTaskPriority('medium')
      return
    }

    const payload: TaskInsert = {
      user_id: profil.id,
      title,
      completed: false,
      priority: newTaskPriority,
      due_date: newTaskDueDate || null,
    }

    const { data, error: supabaseError } = await looseSupabase.from('tasks').insert(payload).select('*').single()
    if (supabaseError) {
      setError(supabaseError.message)
      return
    }

    if (data) {
      setTasks(current => [data, ...current])
      setNewTask('')
      setNewTaskDueDate('')
      setNewTaskPriority('medium')
    }
  }

  async function toggleComplete(id: string) {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    const updated = { completed: !task.completed, updated_at: new Date().toISOString() }

    if (profil) {
      const { error: supabaseError } = await looseSupabase.from('tasks').update(updated).eq('id', id)
      if (supabaseError) {
        setError(supabaseError.message)
        return
      }
    }

    setTasks(current => current.map(t => (t.id === id ? { ...t, ...updated } : t)))
  }

  async function deleteTask(id: string) {
    if (profil) {
      const { error: supabaseError } = await looseSupabase.from('tasks').delete().eq('id', id)
      if (supabaseError) {
        setError(supabaseError.message)
        return
      }
    }

    setTasks(current => current.filter(task => task.id !== id))
  }

  const completedCount = useMemo(() => tasks.filter(task => task.completed).length, [tasks])

  const filteredTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return tasks.filter(task => {
      if (dueFilter === 'all') return true
      if (!task.due_date) return false
      if (dueFilter === 'overdue') return task.due_date < today
      if (dueFilter === 'upcoming') return task.due_date >= today
      return true
    })
  }, [tasks, dueFilter])

  const sortPriorityValue = (prio: Priority | string | null | undefined): number => {
    if (prio === 'high') return 1
    if (prio === 'medium') return 2
    if (prio === 'low') return 3
    return 4
  }

  const sortedTasks = useMemo(() => {
    const copy = [...filteredTasks]
    copy.sort((a, b) => {
      let compare = 0
      if (sortBy === 'due_date') {
        const da = a.due_date ?? ''
        const db = b.due_date ?? ''
        compare = da.localeCompare(db)
      } else if (sortBy === 'priority') {
        compare = sortPriorityValue(a.priority as Priority) - sortPriorityValue(b.priority as Priority)
      } else if (sortBy === 'title') {
        compare = (a.title ?? '').localeCompare(b.title ?? '')
      } else {
        compare = (a.created_at ?? '').localeCompare(b.created_at ?? '')
      }
      return sortAsc ? compare : -compare
    })
    return copy
  }, [filteredTasks, sortBy, sortAsc])

  if (loading) {
    return <div className="nx-panel p-5">Chargement des tâches...</div>
  }

  return (
    <div className="nx-panel p-4 sm:p-5">
      <h2 className="mb-4 text-xl font-semibold">Gestionnaire de tâches</h2>

      {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form className="mb-4 grid gap-2 md:grid-cols-[1.3fr_140px_150px_115px]" onSubmit={addTask}>
        <input
          type="text"
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          placeholder="Ajouter une nouvelle tâche"
          className="col-span-1 rounded-xl border px-3 py-2 text-sm outline-none"
          aria-label="Nouvelle tâche"
        />

        <input
          type="date"
          value={newTaskDueDate}
          onChange={e => setNewTaskDueDate(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm outline-none"
          aria-label="Date d'échéance"
        />

        <select
          value={newTaskPriority}
          onChange={e => setNewTaskPriority(e.target.value as Priority)}
          className="rounded-xl border px-3 py-2 text-sm outline-none"
          aria-label="Priorité"
        >
          {PRIORITIES.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <button type="submit" className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark md:w-auto">
          Ajouter
        </button>
      </form>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-600">
          {completedCount}/{tasks.length} tâches complétées
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={dueFilter}
            onChange={e => setDueFilter(e.target.value as DueFilter)}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
            aria-label="Filtrer par échéance"
          >
            <option value="all">Toutes</option>
            <option value="upcoming">À venir</option>
            <option value="overdue">En retard</option>
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
            aria-label="Trier par"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSortAsc(prev => !prev)}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
            aria-label="Inverser l'ordre"
          >
            {sortAsc ? 'Asc' : 'Desc'}
          </button>
        </div>
      </div>

      {sortedTasks.length === 0 ? (
        <p className="nx-subtle">Aucune tâche pour le moment. Ajoutez-en une !</p>
      ) : (
        <ul className="space-y-2">
          {sortedTasks.map(task => {
            const priorityMeta = PRIORITIES.find(p => p.value === (task.priority as Priority)) ?? PRIORITIES[1]
            return (
              <li key={task.id} className="flex flex-col gap-2 rounded-xl border px-3 py-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => void toggleComplete(task.id)}
                      className="h-4 w-4"
                      aria-label={`Marquer ${task.title} comme terminé`}
                    />
                    <span className={task.completed ? 'line-through text-slate-400' : ''}>{task.title}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => void deleteTask(task.id)}
                    className="self-start rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 sm:self-auto"
                  >
                    Supprimer
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-1 font-semibold ${priorityMeta.className}`}>{priorityMeta.label}</span>
                  <span data-testid="task-due-date" className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Echéance: {task.due_date ?? '—'}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Créé: {new Date(task.created_at).toLocaleDateString()}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
