-- Limitation du nombre d'ecrans simultanes par utilisateur

ALTER TABLE public.profils
  ADD COLUMN IF NOT EXISTS max_concurrent_screens integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profils_max_concurrent_screens_check'
  ) THEN
    ALTER TABLE public.profils
      ADD CONSTRAINT profils_max_concurrent_screens_check
      CHECK (max_concurrent_screens BETWEEN 1 AND 12);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_screen_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profil_id uuid NULL REFERENCES public.profils(id) ON DELETE SET NULL,
  screen_id text NOT NULL,
  label text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS user_screen_sessions_user_screen_uidx
  ON public.user_screen_sessions(user_id, screen_id);

CREATE INDEX IF NOT EXISTS user_screen_sessions_user_last_seen_idx
  ON public.user_screen_sessions(user_id, last_seen_at DESC)
  WHERE closed_at IS NULL;

ALTER TABLE public.user_screen_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_screen_sessions_self_select ON public.user_screen_sessions;
CREATE POLICY user_screen_sessions_self_select
  ON public.user_screen_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_screen_sessions_self_insert ON public.user_screen_sessions;
CREATE POLICY user_screen_sessions_self_insert
  ON public.user_screen_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_screen_sessions_self_update ON public.user_screen_sessions;
CREATE POLICY user_screen_sessions_self_update
  ON public.user_screen_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_screen_sessions_self_delete ON public.user_screen_sessions;
CREATE POLICY user_screen_sessions_self_delete
  ON public.user_screen_sessions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
