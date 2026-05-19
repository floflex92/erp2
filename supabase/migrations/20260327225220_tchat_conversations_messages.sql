
-- ============================================================
-- TCHAT : conversations directes + messages
-- ============================================================

-- Table des conversations (1-to-1)
CREATE TABLE IF NOT EXISTS public.tchat_conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Participants d'une conversation (toujours 2 par conversation directe)
CREATE TABLE IF NOT EXISTS public.tchat_participants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.tchat_conversations(id) ON DELETE CASCADE,
  profil_id       uuid NOT NULL REFERENCES public.profils(id) ON DELETE CASCADE,
  UNIQUE (conversation_id, profil_id)
);

-- Index pour retrouver les conversations d'un profil
CREATE INDEX IF NOT EXISTS idx_tchat_participants_profil ON public.tchat_participants(profil_id);

-- Messages
CREATE TABLE IF NOT EXISTS public.tchat_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.tchat_conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES public.profils(id) ON DELETE CASCADE,
  content         text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 4000),
  created_at      timestamptz NOT NULL DEFAULT now(),
  read_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tchat_messages_conversation ON public.tchat_messages(conversation_id, created_at);

-- Mise à jour automatique de updated_at sur la conversation à chaque nouveau message
CREATE OR REPLACE FUNCTION public.tchat_update_conversation_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.tchat_conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tchat_update_conversation ON public.tchat_messages;
CREATE TRIGGER trg_tchat_update_conversation
  AFTER INSERT ON public.tchat_messages
  FOR EACH ROW EXECUTE FUNCTION public.tchat_update_conversation_ts();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.tchat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tchat_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tchat_messages      ENABLE ROW LEVEL SECURITY;

-- Helper : renvoie le profil_id de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.current_profil_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.profils WHERE user_id = auth.uid() LIMIT 1;
$$;

-- tchat_participants : visible/modifiable uniquement par ses propres lignes
CREATE POLICY "tchat_participants_self_select" ON public.tchat_participants
  FOR SELECT USING (profil_id = public.current_profil_id());

CREATE POLICY "tchat_participants_self_insert" ON public.tchat_participants
  FOR INSERT WITH CHECK (profil_id = public.current_profil_id());

-- tchat_conversations : visible si participant
CREATE POLICY "tchat_conversations_participant_select" ON public.tchat_conversations
  FOR SELECT USING (
    id IN (
      SELECT conversation_id FROM public.tchat_participants
      WHERE profil_id = public.current_profil_id()
    )
  );

CREATE POLICY "tchat_conversations_insert" ON public.tchat_conversations
  FOR INSERT WITH CHECK (true);

-- tchat_messages : visible si participant à la conversation
CREATE POLICY "tchat_messages_participant_select" ON public.tchat_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM public.tchat_participants
      WHERE profil_id = public.current_profil_id()
    )
  );

CREATE POLICY "tchat_messages_insert" ON public.tchat_messages
  FOR INSERT WITH CHECK (
    sender_id = public.current_profil_id()
    AND conversation_id IN (
      SELECT conversation_id FROM public.tchat_participants
      WHERE profil_id = public.current_profil_id()
    )
  );

-- Marquer messages comme lus
CREATE POLICY "tchat_messages_update_read" ON public.tchat_messages
  FOR UPDATE USING (
    conversation_id IN (
      SELECT conversation_id FROM public.tchat_participants
      WHERE profil_id = public.current_profil_id()
    )
  );

-- Permettre la lecture des participants d'une conversation dont on fait partie
-- (pour afficher le nom de l'interlocuteur)
DROP POLICY IF EXISTS "tchat_participants_conv_select" ON public.tchat_participants;
CREATE POLICY "tchat_participants_conv_select" ON public.tchat_participants
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM public.tchat_participants
      WHERE profil_id = public.current_profil_id()
    )
  );
;
