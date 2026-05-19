import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ profil: null }) }))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import TasksPage from './Tasks'

describe('TasksPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('permet d ajouter, cocher, et supprimer une tâche', async () => {
    render(<TasksPage />)

    expect(await screen.findByText('Aucune tâche pour le moment. Ajoutez-en une !')).not.toBeNull()

    const titreInput = screen.getByLabelText('Nouvelle tâche')
    const dueInput = screen.getByLabelText("Date d'échéance")
    const prioritySelect = screen.getByLabelText('Priorité')
    const addBtn = screen.getByRole('button', { name: 'Ajouter' })

    await userEvent.type(titreInput, 'Test task')
    await userEvent.type(dueInput, '2099-12-31')
    await userEvent.selectOptions(prioritySelect, 'high')
    await userEvent.click(addBtn)

    expect(await screen.findByText('Test task')).not.toBeNull()
    expect(screen.getByTestId('task-due-date').textContent).toContain('2099-12-31')

    const taskItem = screen.getByRole('listitem')
    expect(within(taskItem).getByText('Haute')).not.toBeNull()

    const checkbox = within(taskItem).getByRole('checkbox')
    await userEvent.click(checkbox)
    expect((checkbox as HTMLInputElement).checked).toBe(true)

    const deleteBtn = screen.getByRole('button', { name: 'Supprimer' })
    await userEvent.click(deleteBtn)

    expect(await screen.findByText('Aucune tâche pour le moment. Ajoutez-en une !')).not.toBeNull()
  })
})
