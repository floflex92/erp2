create table if not exists public.erp_v11_tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null unique,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.erp_v11_tenants (tenant_key, display_name)
values ('default', 'Tenant par defaut')
on conflict (tenant_key) do nothing;

create table if not exists public.erp_v11_modules (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'default',
  module_key text not null,
  enabled boolean not null default true,
  mode text not null default 'hybrid',
  refresh_interval_sec integer not null default 60,
  fallback_strategy text not null default 'internal_recompute',
  config jsonb not null default '{}'::jsonb,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_v11_modules_mode_check
    check (mode in ('internal_only', 'hybrid', 'provider_preferred')),
  constraint erp_v11_modules_fallback_strategy_check
    check (fallback_strategy in ('stale_cache', 'internal_recompute', 'last_known')),
  constraint erp_v11_modules_module_key_check
    check (module_key in ('tracking', 'tachy', 'routing', 'eta', 'driver_session', 'client_portal', 'chat', 'ai')),
  constraint erp_v11_modules_unique unique (tenant_key, module_key)
);

create index if not exists erp_v11_modules_tenant_idx on public.erp_v11_modules(tenant_key);
create index if not exists erp_v11_modules_enabled_idx on public.erp_v11_modules(enabled);

create table if not exists public.erp_v11_providers (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'default',
  provider_key text not null,
  provider_type text not null,
  enabled boolean not null default true,
  priority integer not null default 100,
  base_url text null,
  auth_type text not null default 'none',
  api_key_ref text null,
  capabilities text[] not null default '{}'::text[],
  rate_limit_per_minute integer not null default 60,
  cache_ttl_sec integer not null default 120,
  timeout_ms integer not null default 5000,
  mapping_profile text not null default 'default',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_v11_providers_auth_type_check
    check (auth_type in ('none', 'apikey', 'bearer', 'basic')),
  constraint erp_v11_providers_provider_type_check
    check (provider_type in ('tracking', 'tachy', 'routing', 'traffic', 'eta', 'chat', 'ai')),
  constraint erp_v11_providers_unique unique (tenant_key, provider_key)
);

create index if not exists erp_v11_providers_tenant_type_idx on public.erp_v11_providers(tenant_key, provider_type, enabled, priority);

create table if not exists public.erp_v11_api_mappings (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'default',
  provider_key text not null,
  object_name text not null,
  direction text not null default 'inbound',
  mapping_version integer not null default 1,
  is_active boolean not null default true,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_v11_api_mappings_direction_check
    check (direction in ('inbound', 'outbound')),
  constraint erp_v11_api_mappings_object_name_check
    check (object_name in ('VehiclePosition', 'DriverStatus', 'DrivingTimeStatus', 'TrafficStatus', 'RoutePlan', 'EtaPrediction')),
  constraint erp_v11_api_mappings_unique unique (tenant_key, provider_key, object_name, direction, mapping_version)
);

create index if not exists erp_v11_api_mappings_active_idx on public.erp_v11_api_mappings(tenant_key, provider_key, object_name, is_active);

create table if not exists public.erp_v11_cache (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'default',
  cache_key text not null,
  scope text not null,
  payload jsonb not null default '{}'::jsonb,
  payload_hash text null,
  source text not null default 'internal',
  stale_after timestamptz null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_v11_cache_unique unique (tenant_key, cache_key)
);

create index if not exists erp_v11_cache_expires_idx on public.erp_v11_cache(tenant_key, expires_at);
create index if not exists erp_v11_cache_scope_idx on public.erp_v11_cache(tenant_key, scope);

create table if not exists public.erp_v11_api_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'default',
  module_key text not null,
  provider_key text null,
  request_fingerprint text null,
  status text not null,
  http_status integer null,
  latency_ms integer null,
  request_payload jsonb null,
  response_payload jsonb null,
  error_message text null,
  created_at timestamptz not null default now()
);

create index if not exists erp_v11_api_logs_tenant_created_idx on public.erp_v11_api_logs(tenant_key, created_at desc);
create index if not exists erp_v11_api_logs_provider_idx on public.erp_v11_api_logs(provider_key, created_at desc);

-- Contraintes de clé étrangère multi-tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_v11_modules_tenant_fk'
  ) THEN
    ALTER TABLE public.erp_v11_modules
      ADD CONSTRAINT erp_v11_modules_tenant_fk
      FOREIGN KEY (tenant_key) REFERENCES public.erp_v11_tenants(tenant_key) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_v11_providers_tenant_fk'
  ) THEN
    ALTER TABLE public.erp_v11_providers
      ADD CONSTRAINT erp_v11_providers_tenant_fk
      FOREIGN KEY (tenant_key) REFERENCES public.erp_v11_tenants(tenant_key) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_v11_api_mappings_tenant_fk'
  ) THEN
    ALTER TABLE public.erp_v11_api_mappings
      ADD CONSTRAINT erp_v11_api_mappings_tenant_fk
      FOREIGN KEY (tenant_key) REFERENCES public.erp_v11_tenants(tenant_key) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_v11_cache_tenant_fk'
  ) THEN
    ALTER TABLE public.erp_v11_cache
      ADD CONSTRAINT erp_v11_cache_tenant_fk
      FOREIGN KEY (tenant_key) REFERENCES public.erp_v11_tenants(tenant_key) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_v11_api_logs_tenant_fk'
  ) THEN
    ALTER TABLE public.erp_v11_api_logs
      ADD CONSTRAINT erp_v11_api_logs_tenant_fk
      FOREIGN KEY (tenant_key) REFERENCES public.erp_v11_tenants(tenant_key) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_v11_vehicle_positions_tenant_fk'
  ) THEN
    ALTER TABLE public.erp_v11_vehicle_positions
      ADD CONSTRAINT erp_v11_vehicle_positions_tenant_fk
      FOREIGN KEY (tenant_key) REFERENCES public.erp_v11_tenants(tenant_key) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_v11_driver_activity_tenant_fk'
  ) THEN
    ALTER TABLE public.erp_v11_driver_activity
      ADD CONSTRAINT erp_v11_driver_activity_tenant_fk
      FOREIGN KEY (tenant_key) REFERENCES public.erp_v11_tenants(tenant_key) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_v11_eta_predictions_tenant_fk'
  ) THEN
    ALTER TABLE public.erp_v11_eta_predictions
      ADD CONSTRAINT erp_v11_eta_predictions_tenant_fk
      FOREIGN KEY (tenant_key) REFERENCES public.erp_v11_tenants(tenant_key) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_v11_driver_sessions_tenant_fk'
  ) THEN
    ALTER TABLE public.erp_v11_driver_sessions
      ADD CONSTRAINT erp_v11_driver_sessions_tenant_fk
      FOREIGN KEY (tenant_key) REFERENCES public.erp_v11_tenants(tenant_key) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_v11_client_portal_access_tenant_fk'
  ) THEN
    ALTER TABLE public.erp_v11_client_portal_access
      ADD CONSTRAINT erp_v11_client_portal_access_tenant_fk
      FOREIGN KEY (tenant_key) REFERENCES public.erp_v11_tenants(tenant_key) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_v11_chat_messages_tenant_fk'
  ) THEN
    ALTER TABLE public.erp_v11_chat_messages
      ADD CONSTRAINT erp_v11_chat_messages_tenant_fk
      FOREIGN KEY (tenant_key) REFERENCES public.erp_v11_tenants(tenant_key) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_v11_ai_logs_tenant_fk'
  ) THEN
    ALTER TABLE public.erp_v11_ai_logs
      ADD CONSTRAINT erp_v11_ai_logs_tenant_fk
      FOREIGN KEY (tenant_key) REFERENCES public.erp_v11_tenants(tenant_key) ON DELETE CASCADE;
  END IF;
END $$;

create table if not exists public.erp_v11_vehicle_positions (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'default',
  vehicle_id uuid not null references public.vehicules(id) on delete cascade,
  provider_key text null,
  position_at timestamptz not null default now(),
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  heading_deg numeric(6,2) null,
  speed_kmh numeric(8,2) null,
  accuracy_m numeric(8,2) null,
  source text not null default 'internal',
  raw_payload jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists erp_v11_vehicle_positions_vehicle_idx on public.erp_v11_vehicle_positions(vehicle_id, position_at desc);
create index if not exists erp_v11_vehicle_positions_tenant_idx on public.erp_v11_vehicle_positions(tenant_key, position_at desc);

create table if not exists public.erp_v11_driver_activity (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'default',
  conducteur_id uuid not null references public.conducteurs(id) on delete cascade,
  vehicule_id uuid null references public.vehicules(id) on delete set null,
  ot_id uuid null references public.ordres_transport(id) on delete set null,
  activity_at timestamptz not null default now(),
  driver_status text not null default 'unknown',
  driving_minutes_remaining integer null,
  break_minutes_remaining integer null,
  daily_drive_minutes integer null,
  weekly_drive_minutes integer null,
  source text not null default 'internal',
  raw_payload jsonb null,
  created_at timestamptz not null default now(),
  constraint erp_v11_driver_activity_status_check
    check (driver_status in ('drive', 'rest', 'work', 'available', 'unknown'))
);

create index if not exists erp_v11_driver_activity_conducteur_idx on public.erp_v11_driver_activity(conducteur_id, activity_at desc);
create index if not exists erp_v11_driver_activity_tenant_idx on public.erp_v11_driver_activity(tenant_key, activity_at desc);

create table if not exists public.erp_v11_eta_predictions (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'default',
  ot_id uuid not null references public.ordres_transport(id) on delete cascade,
  vehicle_id uuid null references public.vehicules(id) on delete set null,
  prediction_at timestamptz not null default now(),
  eta_at timestamptz not null,
  confidence numeric(5,2) not null default 0.5,
  delay_minutes integer not null default 0,
  method text not null default 'internal',
  traffic_factor numeric(6,3) null,
  break_factor numeric(6,3) null,
  source_provider text null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint erp_v11_eta_predictions_method_check
    check (method in ('internal', 'provider', 'hybrid'))
);

create index if not exists erp_v11_eta_predictions_ot_idx on public.erp_v11_eta_predictions(ot_id, prediction_at desc);
create index if not exists erp_v11_eta_predictions_tenant_idx on public.erp_v11_eta_predictions(tenant_key, prediction_at desc);

create table if not exists public.erp_v11_driver_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'default',
  conducteur_id uuid not null references public.conducteurs(id) on delete cascade,
  session_token text not null unique,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  last_seen_at timestamptz not null default now(),
  device_info jsonb null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_v11_driver_sessions_status_check
    check (status in ('active', 'closed', 'expired'))
);

create index if not exists erp_v11_driver_sessions_conducteur_idx on public.erp_v11_driver_sessions(conducteur_id, started_at desc);
create index if not exists erp_v11_driver_sessions_token_idx on public.erp_v11_driver_sessions(session_token);

create table if not exists public.erp_v11_client_portal_access (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'default',
  client_id uuid not null references public.clients(id) on delete cascade,
  ot_id uuid not null references public.ordres_transport(id) on delete cascade,
  access_token text not null unique,
  expires_at timestamptz not null,
  enabled boolean not null default true,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists erp_v11_client_portal_access_lookup_idx on public.erp_v11_client_portal_access(access_token, expires_at);
create index if not exists erp_v11_client_portal_access_client_idx on public.erp_v11_client_portal_access(client_id, ot_id);

create table if not exists public.erp_v11_chat_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'default',
  channel_key text not null,
  sender_type text not null,
  sender_id uuid null,
  recipient_type text null,
  recipient_id uuid null,
  ot_id uuid null references public.ordres_transport(id) on delete set null,
  message text not null,
  attachments jsonb not null default '[]'::jsonb,
  delivered_at timestamptz null,
  read_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint erp_v11_chat_messages_sender_type_check
    check (sender_type in ('exploitant', 'conducteur', 'system', 'client')),
  constraint erp_v11_chat_messages_recipient_type_check
    check (recipient_type is null or recipient_type in ('exploitant', 'conducteur', 'system', 'client'))
);

create index if not exists erp_v11_chat_messages_channel_idx on public.erp_v11_chat_messages(channel_key, created_at desc);
create index if not exists erp_v11_chat_messages_ot_idx on public.erp_v11_chat_messages(ot_id, created_at desc);

create table if not exists public.erp_v11_ai_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'default',
  module_key text not null default 'ai',
  context_type text not null,
  context_id text null,
  prompt_hash text null,
  model text null,
  tokens_in integer null,
  tokens_out integer null,
  cost_estimate numeric(12,6) null,
  request_payload jsonb null,
  response_payload jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists erp_v11_ai_logs_tenant_created_idx on public.erp_v11_ai_logs(tenant_key, created_at desc);
create index if not exists erp_v11_ai_logs_context_idx on public.erp_v11_ai_logs(context_type, context_id);

do $$
begin
  perform public.add_updated_at_trigger('public.erp_v11_tenants');
  perform public.add_updated_at_trigger('public.erp_v11_modules');
  perform public.add_updated_at_trigger('public.erp_v11_providers');
  perform public.add_updated_at_trigger('public.erp_v11_api_mappings');
  perform public.add_updated_at_trigger('public.erp_v11_cache');
  perform public.add_updated_at_trigger('public.erp_v11_driver_sessions');
  perform public.add_updated_at_trigger('public.erp_v11_client_portal_access');
exception
  when undefined_function then
    null;
end $$;

insert into public.erp_v11_modules (tenant_key, module_key, enabled, mode, refresh_interval_sec, fallback_strategy)
values
  ('default', 'tracking', true, 'hybrid', 30, 'internal_recompute'),
  ('default', 'tachy', true, 'hybrid', 60, 'internal_recompute'),
  ('default', 'routing', true, 'hybrid', 180, 'stale_cache'),
  ('default', 'eta', true, 'hybrid', 60, 'internal_recompute'),
  ('default', 'driver_session', true, 'internal_only', 30, 'last_known'),
  ('default', 'client_portal', true, 'internal_only', 60, 'stale_cache'),
  ('default', 'chat', true, 'internal_only', 10, 'last_known'),
  ('default', 'ai', true, 'hybrid', 120, 'stale_cache')
on conflict (tenant_key, module_key) do nothing;

alter table public.erp_v11_tenants enable row level security;
alter table public.erp_v11_modules enable row level security;
alter table public.erp_v11_providers enable row level security;
alter table public.erp_v11_api_mappings enable row level security;
alter table public.erp_v11_cache enable row level security;
alter table public.erp_v11_api_logs enable row level security;
alter table public.erp_v11_vehicle_positions enable row level security;
alter table public.erp_v11_driver_activity enable row level security;
alter table public.erp_v11_eta_predictions enable row level security;
alter table public.erp_v11_driver_sessions enable row level security;
alter table public.erp_v11_client_portal_access enable row level security;
alter table public.erp_v11_chat_messages enable row level security;
alter table public.erp_v11_ai_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'erp_v11_modules' and policyname = 'erp_v11_modules_rw_admin'
  ) then
    create policy erp_v11_modules_rw_admin
      on public.erp_v11_modules
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'erp_v11_providers' and policyname = 'erp_v11_providers_rw_admin'
  ) then
    create policy erp_v11_providers_rw_admin
      on public.erp_v11_providers
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'erp_v11_api_mappings' and policyname = 'erp_v11_api_mappings_rw_admin'
  ) then
    create policy erp_v11_api_mappings_rw_admin
      on public.erp_v11_api_mappings
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'erp_v11_cache' and policyname = 'erp_v11_cache_rw_ops'
  ) then
    create policy erp_v11_cache_rw_ops
      on public.erp_v11_cache
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'erp_v11_api_logs' and policyname = 'erp_v11_api_logs_rw_ops'
  ) then
    create policy erp_v11_api_logs_rw_ops
      on public.erp_v11_api_logs
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'erp_v11_vehicle_positions' and policyname = 'erp_v11_vehicle_positions_rw_ops'
  ) then
    create policy erp_v11_vehicle_positions_rw_ops
      on public.erp_v11_vehicle_positions
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'conducteur'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'conducteur'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'erp_v11_driver_activity' and policyname = 'erp_v11_driver_activity_rw_ops'
  ) then
    create policy erp_v11_driver_activity_rw_ops
      on public.erp_v11_driver_activity
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'conducteur'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'conducteur'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'erp_v11_eta_predictions' and policyname = 'erp_v11_eta_predictions_rw_ops'
  ) then
    create policy erp_v11_eta_predictions_rw_ops
      on public.erp_v11_eta_predictions
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'conducteur'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'conducteur'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'erp_v11_driver_sessions' and policyname = 'erp_v11_driver_sessions_rw_ops'
  ) then
    create policy erp_v11_driver_sessions_rw_ops
      on public.erp_v11_driver_sessions
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'conducteur'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'conducteur'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'erp_v11_client_portal_access' and policyname = 'erp_v11_client_portal_access_rw_admin'
  ) then
    create policy erp_v11_client_portal_access_rw_admin
      on public.erp_v11_client_portal_access
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'erp_v11_chat_messages' and policyname = 'erp_v11_chat_messages_rw_all'
  ) then
    create policy erp_v11_chat_messages_rw_all
      on public.erp_v11_chat_messages
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien', 'commercial', 'comptable', 'rh', 'conducteur'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien', 'commercial', 'comptable', 'rh', 'conducteur'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'erp_v11_ai_logs' and policyname = 'erp_v11_ai_logs_rw_ops'
  ) then
    create policy erp_v11_ai_logs_rw_ops
      on public.erp_v11_ai_logs
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant'));
  end if;
end $$;
