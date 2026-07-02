-- Add deliverables columns to deals table
alter table public.deals
  add column if not exists posts       integer default 0,
  add column if not exists impressions bigint  default 0,
  add column if not exists episodes    integer default 0,
  add column if not exists articles    integer default 0;
