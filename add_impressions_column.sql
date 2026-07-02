-- Add impressions column to revenue_entries
-- Run in Supabase SQL Editor

alter table public.revenue_entries
  add column if not exists impressions bigint;
