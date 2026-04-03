-- Ajouter le champ user_id et mettre à jour les statuts possibles
alter table public.demo_access_requests add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Créer un index sur user_id
create index if not exists demo_access_requests_user_id_idx on public.demo_access_requests(user_id);
