-- ⚠️ DELETE ALL DUMMY / SEED DATA
-- Run in Supabase SQL Editor ONLY when you are ready to start with real data.
-- This clears test clients, deals, invoices, meetings, follow-ups, and revenue entries.
-- Call reports and attendance are NOT touched (they have real data).

truncate table public.invoices      restart identity cascade;
truncate table public.follow_ups    restart identity cascade;
truncate table public.meeting_logs  restart identity cascade;
truncate table public.deals         restart identity cascade;
truncate table public.clients       restart identity cascade;
truncate table public.revenue_entries restart identity cascade;

-- Verify
select 'clients'       as tbl, count(*) from public.clients
union all
select 'deals',               count(*) from public.deals
union all
select 'invoices',            count(*) from public.invoices
union all
select 'meeting_logs',        count(*) from public.meeting_logs
union all
select 'follow_ups',          count(*) from public.follow_ups
union all
select 'revenue_entries',     count(*) from public.revenue_entries;
