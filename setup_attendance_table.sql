-- Attendance tracking table
-- Run in Supabase SQL Editor

create table if not exists public.attendance (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  rep_name text not null,
  date date not null,
  check_in_time time,
  check_out_time time,
  status text default 'Present' check (status in ('Present','Late','Half-day','Absent')),
  notes text,
  created_at timestamptz default now(),
  unique(rep_name, date)
);

alter table public.attendance enable row level security;

create policy "Users can insert attendance"
  on public.attendance for insert to authenticated
  with check (true);

create policy "Users can read all attendance"
  on public.attendance for select to authenticated
  using (true);

create policy "Users can update attendance"
  on public.attendance for update to authenticated
  using (true);

create index if not exists attendance_date_idx on public.attendance(date desc);
create index if not exists attendance_rep_idx on public.attendance(rep_name);
