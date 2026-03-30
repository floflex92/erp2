# ERP v1.1 Extension Blueprint (Additive)

## Scope

This repository keeps the current ERP unchanged and adds a v1.1 extension layer for:

- tracking fleet
- tachy and driver activity
- routing and traffic
- internal ETA engine
- driver web session
- client portal
- operations chat
- AI/ChatGPT assistance

No existing endpoint or table is replaced.

## Core Principles

1. Backward compatible: only additive tables, services, and endpoints.
2. Offline-first: each feature works with internal logic even without external APIs.
3. API-cost control: cache-first and refresh windows per module/provider.
4. Internal-first computation: ETA, progression, and break constraints are calculated internally.
5. Universal API language: providers are mapped to internal objects:
   - `VehiclePosition`
   - `DriverStatus`
   - `DrivingTimeStatus`
   - `TrafficStatus`
   - `RoutePlan`
   - `EtaPrediction`

## New Data Layer (Supabase migration `20260328_0005_erp_v11_extension.sql`)

Added extension tables:

- `erp_v11_tenants`
- `erp_v11_modules`
- `erp_v11_providers`
- `erp_v11_api_mappings`
- `erp_v11_cache`
- `erp_v11_api_logs`
- `erp_v11_vehicle_positions`
- `erp_v11_driver_activity`
- `erp_v11_eta_predictions`
- `erp_v11_driver_sessions`
- `erp_v11_client_portal_access`
- `erp_v11_chat_messages`
- `erp_v11_ai_logs`

Each table is additive, RLS-enabled, and role-scoped.

## New Server Endpoints (Netlify Functions)

- `/.netlify/functions/v11-admin-config`
  - modules/providers/mappings/settings management
- `/.netlify/functions/v11-tracking`
  - live position and history
- `/.netlify/functions/v11-tachy`
  - driver status and driving-time status
- `/.netlify/functions/v11-routing`
  - route + traffic (internal + provider enrich)
- `/.netlify/functions/v11-eta`
  - ETA prediction internal-first with provider enrichment
- `/.netlify/functions/v11-driver-session`
  - open/heartbeat/close session + driver missions
- `/.netlify/functions/v11-client-portal`
  - tokenized client tracking access and grant/revoke
- `/.netlify/functions/v11-chat`
  - exploitant/driver channel messaging
- `/.netlify/functions/v11-ai`
  - ETA analysis, delay explanation, ops assistant (internal fallback + optional OpenAI)

Shared runtime utilities:

- `netlify/functions/_lib/v11-core.js`
  - auth, tenant resolution, cache, provider calls, mapping, internal route/tachy/ETA computations

## Admin Settings UI

`src/components/settings/ErpV11Settings.tsx` is injected into:

- `src/pages/Parametres.tsx` (admin/dirigeant section)

Sections exposed:

- modules toggles and modes
- providers list and add/remove
- mapping status by internal object
- cache and frequency settings
- fallback and logs settings
- IA settings

## Offline-First by Feature

- Tracking:
  - no API: internal estimated positions + local history tables
  - with API: provider enrich + mapping + cache
- Tachy:
  - no API: aggregate from internal tachy entries
  - with API: mapped provider values and fallback to internal aggregation
- Routing/Traffic:
  - no API: internal route distance/time + internal traffic model
  - with API: mapped route/traffic payload
- ETA:
  - no API: internal route + traffic + driving-time constraints
  - with API: enriched ETA then stored to predictions
- Driver session:
  - no API needed: internal session tokens and mission feed
- Client portal:
  - no API needed: token access on internal ERP data
- Chat:
  - no API needed: internal channel messages
- IA:
  - no API: deterministic internal analysis engine
  - with API: optional OpenAI call, cached and logged

## Cost and Call Limitation

- Module-level refresh intervals (`erp_v11_modules.refresh_interval_sec`)
- Provider-level cache TTL and rate profile (`erp_v11_providers.cache_ttl_sec`, `rate_limit_per_minute`)
- Shared cache table (`erp_v11_cache`)
- API call logs (`erp_v11_api_logs`, `erp_v11_ai_logs`)

