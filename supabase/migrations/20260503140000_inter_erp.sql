-- ──────────────────────────────────────────────────────────────────────────────
-- Migration : tables inter-ERP (canaux partenaires + messages)
-- Version   : 20260503140000
-- ──────────────────────────────────────────────────────────────────────────────

-- ── Tables ───────────────────────────────────────────────────────────────────

create table if not exists inter_erp_channels (
  id                     uuid        primary key default gen_random_uuid(),
  company_id             integer     not null references companies(id) on delete cascade,
  partner_name           text        not null check (char_length(partner_name) between 1 and 200),
  erp_code               text        not null check (char_length(erp_code) between 1 and 80),
  status                 text        not null default 'connecte'
                                     check (status in ('connecte', 'degrade', 'hors_ligne')),
  last_sync_at           timestamptz not null default now(),
  signed_webhook_enabled boolean     not null default true,
  -- Secret HMAC-SHA256 pour vérifier les webhooks entrants du partenaire
  -- Jamais renvoyé au frontend : sélectionné uniquement dans la Netlify function webhook
  webhook_secret         text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table if not exists inter_erp_messages (
  id             uuid        primary key default gen_random_uuid(),
  company_id     integer     not null references companies(id) on delete cascade,
  channel_id     uuid        not null references inter_erp_channels(id) on delete cascade,
  direction      text        not null check (direction in ('entrant', 'sortant')),
  transport_ref  text        not null check (char_length(transport_ref) between 1 and 100),
  body           text        not null check (char_length(body) between 1 and 5000),
  author         text        not null check (char_length(author) between 1 and 200),
  created_at     timestamptz not null default now()
);

-- ── Index ─────────────────────────────────────────────────────────────────────

create index if not exists inter_erp_channels_company_idx
  on inter_erp_channels (company_id);

create index if not exists inter_erp_messages_channel_idx
  on inter_erp_messages (channel_id, created_at desc);

create index if not exists inter_erp_messages_transport_ref_idx
  on inter_erp_messages (company_id, transport_ref);

-- ── Trigger : updated_at sur les canaux ──────────────────────────────────────

create or replace function fn_inter_erp_channels_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_inter_erp_channels_updated_at on inter_erp_channels;
create trigger trg_inter_erp_channels_updated_at
  before update on inter_erp_channels
  for each row execute function fn_inter_erp_channels_updated_at();

-- ── Trigger : touch last_sync_at sur le canal à chaque message inséré ────────

create or replace function fn_inter_erp_touch_channel()
returns trigger language plpgsql as $$
begin
  update inter_erp_channels
  set last_sync_at = now(),
      updated_at   = now()
  where id = new.channel_id;
  return new;
end;
$$;

drop trigger if exists trg_inter_erp_touch_channel on inter_erp_messages;
create trigger trg_inter_erp_touch_channel
  after insert on inter_erp_messages
  for each row execute function fn_inter_erp_touch_channel();

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table inter_erp_channels enable row level security;
alter table inter_erp_messages  enable row level security;

-- Channels
drop policy if exists inter_erp_channels_select on inter_erp_channels;
create policy inter_erp_channels_select on inter_erp_channels
  for select to authenticated
  using (company_id = (select company_id from profils where user_id = auth.uid() limit 1));

drop policy if exists inter_erp_channels_insert on inter_erp_channels;
create policy inter_erp_channels_insert on inter_erp_channels
  for insert to authenticated
  with check (company_id = (select company_id from profils where user_id = auth.uid() limit 1));

drop policy if exists inter_erp_channels_update on inter_erp_channels;
create policy inter_erp_channels_update on inter_erp_channels
  for update to authenticated
  using (company_id = (select company_id from profils where user_id = auth.uid() limit 1));

drop policy if exists inter_erp_channels_delete on inter_erp_channels;
create policy inter_erp_channels_delete on inter_erp_channels
  for delete to authenticated
  using (company_id = (select company_id from profils where user_id = auth.uid() limit 1));

-- Messages (lecture/écriture par company_id ; écriture publique via service_role pour webhooks entrants)
drop policy if exists inter_erp_messages_select on inter_erp_messages;
create policy inter_erp_messages_select on inter_erp_messages
  for select to authenticated
  using (company_id = (select company_id from profils where user_id = auth.uid() limit 1));

drop policy if exists inter_erp_messages_insert on inter_erp_messages;
create policy inter_erp_messages_insert on inter_erp_messages
  for insert to authenticated
  with check (company_id = (select company_id from profils where user_id = auth.uid() limit 1));
