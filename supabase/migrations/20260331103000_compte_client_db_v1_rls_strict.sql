-- compte_client_db V1 - RLS strict par compte_erp_id

create or replace function core.current_compte_erp_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_compte_erp_id', true), '')::uuid;
$$;

create or replace function core.is_same_compte(row_compte_erp_id uuid)
returns boolean
language sql
stable
as $$
  select auth.uid() is not null
     and core.current_compte_erp_id() is not null
     and row_compte_erp_id = core.current_compte_erp_id();
$$;

alter table core.comptes_erp enable row level security;
alter table core.partenaires enable row level security;
alter table core.roles_compte enable row level security;
alter table core.utilisateurs_compte enable row level security;
alter table core.ordres_transport enable row level security;
alter table core.vehicules enable row level security;
alter table core.conducteurs enable row level security;
alter table core.messages enable row level security;
alter table docs.documents enable row level security;
alter table docs.documents_versions enable row level security;
alter table rt.evenements_transport enable row level security;
alter table rt.notifications enable row level security;
alter table audit.journal_actions enable row level security;
alter table backup.snapshots enable row level security;

do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where (schemaname, tablename) in (
      ('core','comptes_erp'),
      ('core','partenaires'),
      ('core','roles_compte'),
      ('core','utilisateurs_compte'),
      ('core','ordres_transport'),
      ('core','vehicules'),
      ('core','conducteurs'),
      ('core','messages'),
      ('docs','documents'),
      ('docs','documents_versions'),
      ('rt','evenements_transport'),
      ('rt','notifications'),
      ('audit','journal_actions'),
      ('backup','snapshots')
    )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy comptes_erp_same_compte_all on core.comptes_erp
for all to authenticated
using (core.is_same_compte(id))
with check (core.is_same_compte(id));

create policy partenaires_same_compte_all on core.partenaires
for all to authenticated
using (core.is_same_compte(compte_erp_id))
with check (core.is_same_compte(compte_erp_id));

create policy roles_compte_same_compte_all on core.roles_compte
for all to authenticated
using (core.is_same_compte(compte_erp_id))
with check (core.is_same_compte(compte_erp_id));

create policy utilisateurs_compte_same_compte_all on core.utilisateurs_compte
for all to authenticated
using (core.is_same_compte(compte_erp_id))
with check (core.is_same_compte(compte_erp_id));

create policy ordres_transport_same_compte_all on core.ordres_transport
for all to authenticated
using (core.is_same_compte(compte_erp_id))
with check (core.is_same_compte(compte_erp_id));

create policy vehicules_same_compte_all on core.vehicules
for all to authenticated
using (core.is_same_compte(compte_erp_id))
with check (core.is_same_compte(compte_erp_id));

create policy conducteurs_same_compte_all on core.conducteurs
for all to authenticated
using (core.is_same_compte(compte_erp_id))
with check (core.is_same_compte(compte_erp_id));

create policy messages_same_compte_all on core.messages
for all to authenticated
using (core.is_same_compte(compte_erp_id))
with check (core.is_same_compte(compte_erp_id));

create policy documents_same_compte_all on docs.documents
for all to authenticated
using (core.is_same_compte(compte_erp_id))
with check (core.is_same_compte(compte_erp_id));

create policy documents_versions_same_compte_all on docs.documents_versions
for all to authenticated
using (core.is_same_compte(compte_erp_id))
with check (core.is_same_compte(compte_erp_id));

create policy evenements_transport_same_compte_all on rt.evenements_transport
for all to authenticated
using (core.is_same_compte(compte_erp_id))
with check (core.is_same_compte(compte_erp_id));

create policy notifications_same_compte_all on rt.notifications
for all to authenticated
using (core.is_same_compte(compte_erp_id))
with check (core.is_same_compte(compte_erp_id));

create policy journal_actions_same_compte_select on audit.journal_actions
for select to authenticated
using (core.is_same_compte(compte_erp_id));

create policy journal_actions_same_compte_insert on audit.journal_actions
for insert to authenticated
with check (core.is_same_compte(compte_erp_id));

create policy snapshots_same_compte_all on backup.snapshots
for all to authenticated
using (compte_erp_id is null or core.is_same_compte(compte_erp_id))
with check (compte_erp_id is null or core.is_same_compte(compte_erp_id));
