-- User preference: require PIN to view net worth

alter table public.profile
  add column if not exists net_worth_pin_required boolean not null default true;

comment on column public.profile.net_worth_pin_required is
  'When true, user must enter PIN to reveal net worth.';
