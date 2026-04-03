-- Table pour enregistrer les demandes d'accès démo
create table if not exists public.demo_access_requests (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  
  -- Infos du demandeur
  prenom text not null,
  nom text not null,
  email text not null,
  telephone text,
  
  -- Contexte de la visite
  objectif text not null, -- "Evaluer", "Tester", "Présentation", etc.
  description text,
  
  -- Entreprise
  nom_entreprise text,
  secteur_activite text, -- "Transport routier", "Logistique", etc.
  nombre_salaries text,
  
  -- Métadonnées
  statut text default 'nouveau', -- 'nouveau', 'lu', 'contacté', 'converti'
  ip_address inet,
  user_agent text,
  
  unique (email)
);

-- Index pour les recherches
create index if not exists demo_access_requests_email_idx on public.demo_access_requests(email);
create index if not exists demo_access_requests_created_at_idx on public.demo_access_requests(created_at desc);
create index if not exists demo_access_requests_statut_idx on public.demo_access_requests(statut);

-- RLS
alter table public.demo_access_requests enable row level security;

create policy "Tout le monde peut créer une demande"
  on public.demo_access_requests
  for insert
  with check (true);

create policy "Seul l'admin peut lire"
  on public.demo_access_requests
  for select
  using (
    exists(
      select 1 from public.profils 
      where profils.user_id = auth.uid() 
      and profils.role = 'admin'
    )
  );
