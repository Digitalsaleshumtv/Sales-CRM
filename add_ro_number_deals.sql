-- Add RO number to deals table
alter table public.deals
  add column if not exists ro_number text;

create index if not exists deals_ro_idx on public.deals(ro_number);
