import type { Profil } from './auth'

export type TchatConversation = {
  id: string
  updated_at: string
  participants: Profil[]
  last_message?: string
  unread: number
}

export type TchatMessage = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
}
