-- Secure profile and transactions tables with Row Level Security.
-- The app uses the service role on the server, which bypasses RLS.
-- Enabling RLS blocks direct public API access via the anon key.

alter table public.profile enable row level security;
alter table public.transactions enable row level security;

-- Remove direct API access for client-facing roles.
revoke all on table public.profile from anon, authenticated;
revoke all on table public.transactions from anon, authenticated;

-- Explicit deny-by-default: no policies for anon/authenticated.
-- Only service_role (server-side) can read/write these tables.
