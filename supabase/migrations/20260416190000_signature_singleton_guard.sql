-- ============================================================
-- Signature client fiable : une seule signature par mission
-- - Ajout des métadonnées de signature dans documents
-- - Auto-remplissage signed_at pour type_document='signature'
-- - Déduplication historique puis index unique partiel
-- ============================================================

-- 1) Colonnes de métadonnées
alter table public.documents
  add column if not exists signed_at timestamptz null,
  add column if not exists signataire_nom text null;

-- 2) Backfill signed_at pour les signatures déjà présentes
update public.documents
set signed_at = coalesce(signed_at, created_at, now())
where type_document = 'signature'
  and signed_at is null;

-- 3) Trigger d'auto-remplissage signed_at pour les futures signatures
create or replace function public.documents_signature_set_signed_at()
returns trigger
language plpgsql
as $$
begin
  if new.type_document = 'signature' and new.signed_at is null then
    new.signed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_documents_signature_set_signed_at on public.documents;

create trigger trg_documents_signature_set_signed_at
before insert on public.documents
for each row
execute function public.documents_signature_set_signed_at();

-- 4) Nettoyage des doublons signatures OT (garder la plus ancienne)
with ranked as (
  select
    id,
    row_number() over (
      partition by ot_id, type_document
      order by coalesce(signed_at, created_at) asc, created_at asc, id asc
    ) as rn
  from public.documents
  where type_document = 'signature'
    and ot_id is not null
)
delete from public.documents d
using ranked r
where d.id = r.id
  and r.rn > 1;

-- 5) Contrainte anti-duplication : une signature max par mission
create unique index if not exists documents_one_signature_per_ot_uq
  on public.documents(ot_id)
  where type_document = 'signature' and ot_id is not null;
