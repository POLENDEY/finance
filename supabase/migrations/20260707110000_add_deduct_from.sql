-- Track whether an expense was deducted from allowance or net worth

alter table public.transactions
  add column if not exists deduct_from text
    check (deduct_from is null or deduct_from in ('allowance', 'net_worth'));

comment on column public.transactions.deduct_from is
  'For expenses: which balance was deducted. Null for deposits.';
