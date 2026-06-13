-- ============================================================
-- Revenue live-entries table — run this once in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zrqtnxstibtegnfguglz/sql/new
-- The Revenue tab reads these entries and updates in real time.
-- ============================================================

create table if not exists public.revenue_entries (
  id uuid default gen_random_uuid() primary key,
  month text not null,                -- 'YYYY-MM', e.g. '2026-07'
  amount numeric not null,
  category text,                      -- Drama Sponsorship / Events / Live Streaming / Exclusive Content / Web & Social / Glam Magazine
  channel text,                       -- HUM TV Entertainment / HUM News / Masala TV / Glam Magazine
  agency text,
  brand text,
  campaign text,
  portal text,
  notes text,
  created_by text,
  created_at timestamptz default now()
);

alter table public.revenue_entries enable row level security;

create policy "Authenticated read revenue_entries"
  on public.revenue_entries for select to authenticated using (true);
create policy "Authenticated insert revenue_entries"
  on public.revenue_entries for insert to authenticated with check (true);
create policy "Authenticated update revenue_entries"
  on public.revenue_entries for update to authenticated using (true);
create policy "Authenticated delete revenue_entries"
  on public.revenue_entries for delete to authenticated using (true);

-- Enable realtime so open dashboards refresh instantly on new entries
alter publication supabase_realtime add table public.revenue_entries;
