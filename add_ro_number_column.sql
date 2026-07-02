-- Add RO number column to revenue_entries
-- Run in Supabase SQL Editor

alter table public.revenue_entries
  add column if not exists ro_number text;

create index if not exists revenue_entries_ro_idx on public.revenue_entries(ro_number);
