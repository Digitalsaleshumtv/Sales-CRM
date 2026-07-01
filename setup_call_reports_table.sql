-- Daily Call Reports table
-- Run this in Supabase SQL Editor

create table if not exists public.call_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  report_date date not null,
  rep_name text not null,
  customer_name text not null,
  client_agency text,
  contact_person text,
  mobile_email text,
  lead_source text,
  call_type text,
  call_status text,
  customer_requirement text,
  follow_up_date date,
  deal_amount numeric(14,2),
  remarks text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.call_reports enable row level security;

-- All authenticated users can insert their own reports
create policy "Users can insert call reports"
  on public.call_reports for insert
  to authenticated
  with check (auth.uid() = user_id);

-- All authenticated users can read all reports
create policy "Users can read all call reports"
  on public.call_reports for select
  to authenticated
  using (true);

-- Users can update/delete their own reports
create policy "Users can update own call reports"
  on public.call_reports for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own call reports"
  on public.call_reports for delete
  to authenticated
  using (auth.uid() = user_id);

-- Index for common filter patterns
create index if not exists call_reports_date_idx on public.call_reports(report_date desc);
create index if not exists call_reports_rep_idx on public.call_reports(rep_name);
