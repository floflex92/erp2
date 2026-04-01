-- Rend user_id nullable dans profils pour permettre les mecaniciens sans auth user
-- (utilises uniquement pour l'affichage en lecture dans les dropdowns)

ALTER TABLE public.profils
  DROP CONSTRAINT IF EXISTS profils_user_id_fkey;

ALTER TABLE public.profils
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.profils
  ADD CONSTRAINT profils_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
