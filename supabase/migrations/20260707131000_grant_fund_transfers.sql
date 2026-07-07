-- Ensure service role can read/write fund_transfers via the Data API

grant all on table public.fund_transfers to service_role;
grant usage, select on sequence fund_transfers_id_seq to service_role;

notify pgrst, 'reload schema';
