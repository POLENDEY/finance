-- Add net worth, allowance balance, and PIN protection to profile

alter table public.profile
  add column if not exists net_worth numeric(12, 2) not null default 0,
  add column if not exists allowance_balance numeric(12, 2) not null default 0,
  add column if not exists net_worth_pin_hash text;

comment on column public.profile.net_worth is 'Protected savings balance, hidden behind PIN.';
comment on column public.profile.allowance_balance is 'Visible spending allowance balance.';
comment on column public.profile.net_worth_pin_hash is 'Bcrypt hash of 6-digit PIN for net worth access.';
