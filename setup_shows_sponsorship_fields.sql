-- Add sponsorship availability fields to shows table
-- Run in Supabase SQL Editor

alter table public.shows
  add column if not exists air_days text,
  add column if not exists time_slot text,
  add column if not exists aired_episodes integer,
  add column if not exists remaining_episodes integer,
  add column if not exists rate_presented_by numeric(12,2),
  add column if not exists rate_powered_by numeric(12,2),
  add column if not exists rate_associated_by numeric(12,2);
