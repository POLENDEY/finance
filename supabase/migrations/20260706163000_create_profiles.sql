-- Finance Monitoring: user profiles linked to Supabase Auth

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'viewer' check (role in ('admin', 'analyst', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'App user profiles, one row per auth user.';

create index profiles_email_idx on public.profiles (email);

alter table public.profiles enable row level security;

create policy "Profiles are readable by owner"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Profiles are insertable for self"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Auto-confirm email so sign-up works immediately without inbox verification.
create or replace function public.auto_confirm_user()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  update auth.users
  set
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    confirmed_at = coalesce(confirmed_at, now())
  where id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_auto_confirm
  after insert on auth.users
  for each row
  execute function public.auto_confirm_user();
