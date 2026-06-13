-- ============================================================
-- HUM TV Sales Intelligence Platform - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- USERS (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null,
  role text check (role in ('head','salesperson','readonly')) default 'salesperson',
  region text check (region in ('Karachi','Lahore','Islamabad')) default 'Karachi',
  email_provider text check (email_provider in ('gmail','outlook')),
  email_oauth_token text, -- encrypted
  created_at timestamptz default now()
);

-- CLIENTS
create table public.clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text check (type in ('brand','agency')) default 'brand',
  parent_agency_id uuid references public.clients(id),
  industry text[],
  region text,
  contact_name text,
  contact_email text,
  contact_phone text,
  assigned_to uuid references public.users(id),
  status text check (status in ('active','inactive')) default 'active',
  last_contact_date date,
  entertainment_budget numeric,
  notes text,
  created_at timestamptz default now()
);

-- SHOWS
create table public.shows (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  channel text check (channel in ('HUM TV','Masala TV','HUM News','HUM Network')),
  schedule text,
  status text check (status in ('Live','Upcoming','Completed','On Break')) default 'Upcoming',
  presenting_client_id uuid references public.clients(id),
  powered_client_id uuid references public.clients(id),
  associated_client_id uuid references public.clients(id),
  locked_by uuid references public.users(id),
  youtube_upload boolean default false,
  episode_count integer,
  paid_drama_budget numeric,
  created_at timestamptz default now()
);

-- DEALS
create table public.deals (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null,
  client_id uuid references public.clients(id),
  channel text[],
  platform text[],
  show_id uuid references public.shows(id),
  tier text,
  start_date date,
  end_date date,
  value_net numeric,
  gst numeric generated always as (value_net * 0.18) stored,
  value_gross numeric generated always as (value_net * 1.18) stored,
  assigned_to uuid references public.users(id),
  locked_by uuid references public.users(id),
  locked_at timestamptz,
  status text check (status in (
    'Prospecting','Pitch Sent','In Negotiation','Under Process',
    'Locked','RO Received','Billed','Sent to Finance','Completed','Cancelled'
  )) default 'Prospecting',
  ro_number text,
  ro_received boolean default false,
  ro_date date,
  transfer_done boolean default false,
  transfer_date date,
  transfer_ref text,
  billing_done boolean default false,
  invoice_number text,
  sent_to_finance boolean default false,
  finance_date date,
  payment_status text,
  agency_commission_pct numeric default 15,
  notes text,
  created_at timestamptz default now()
);

-- FOLLOW-UPS
create table public.follow_ups (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id),
  deal_id uuid references public.deals(id),
  assigned_to uuid references public.users(id),
  follow_up_date date not null,
  type text,
  notes text,
  status text check (status in ('Pending','Done','Overdue')) default 'Pending',
  next_action text,
  next_follow_up_date date,
  created_at timestamptz default now()
);

-- MEETING LOGS
create table public.meeting_logs (
  id uuid default gen_random_uuid() primary key,
  salesperson_id uuid references public.users(id),
  client_id uuid references public.clients(id),
  deal_id uuid references public.deals(id),
  meeting_date date not null,
  type text,
  outcome text,
  deal_status_after text,
  notes text,
  next_steps text,
  follow_up_created boolean default false,
  created_at timestamptz default now()
);

-- DELIVERABLES
create table public.deliverables (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references public.deals(id),
  client_id uuid references public.clients(id),
  type text not null,
  platform text,
  channel text,
  qty_committed integer default 1,
  qty_delivered integer default 0,
  due_date date,
  delivered_date date,
  status text check (status in ('Pending','In Progress','Delivered','Delayed')) default 'Pending',
  proof_url text,
  notes text
);

-- INVOICES
create table public.invoices (
  id uuid default gen_random_uuid() primary key,
  invoice_number text unique not null,
  client_id uuid references public.clients(id),
  deal_id uuid references public.deals(id),
  invoice_date date not null,
  amount_net numeric not null,
  gst numeric generated always as (amount_net * 0.18) stored,
  amount_gross numeric generated always as (amount_net * 1.18) stored,
  due_date date,
  payment_date date,
  amount_received numeric default 0,
  status text check (status in ('Unpaid','Partial','Paid','Overdue')) default 'Unpaid',
  created_at timestamptz default now()
);

-- PRESENTATIONS
create table public.presentations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text,
  channel text[],
  file_url text,
  created_by uuid references public.users(id),
  created_at timestamptz default now(),
  last_sent_date timestamptz,
  status text default 'Active',
  notes text
);

-- TRAVEL RECORDS
create table public.travel_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id),
  start_date date,
  end_date date,
  destination text,
  purpose text,
  client_id uuid references public.clients(id),
  deal_id uuid references public.deals(id),
  mode text,
  accommodation numeric default 0,
  transport numeric default 0,
  meals numeric default 0,
  total numeric generated always as (accommodation + transport + meals) stored,
  budget numeric,
  approved_by uuid references public.users(id),
  receipt_url text,
  notes text,
  created_at timestamptz default now()
);

-- PRODUCTION EXPENSES
create table public.production_expenses (
  id uuid default gen_random_uuid() primary key,
  show_id uuid references public.shows(id),
  deal_id uuid references public.deals(id),
  expense_type text check (expense_type in ('Crew','Equipment','Location','Post-Production','Talent','Misc')),
  vendor text,
  date date,
  amount numeric not null,
  po_number text,
  invoice_received boolean default false,
  approved_by uuid references public.users(id),
  budget_code text,
  notes text,
  created_at timestamptz default now()
);

-- SALES TARGETS
create table public.sales_targets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id),
  month integer check (month between 1 and 12),
  year integer not null,
  monthly_target numeric not null,
  annual_target numeric,
  set_by uuid references public.users(id),
  set_at timestamptz default now()
);

-- EMAIL LOGS
create table public.email_logs (
  id uuid default gen_random_uuid() primary key,
  sent_by uuid references public.users(id),
  recipient_email text,
  client_id uuid references public.clients(id),
  deal_id uuid references public.deals(id),
  subject text,
  template_used text,
  sent_at timestamptz default now(),
  status text check (status in ('Draft','Sent','Opened','Replied')) default 'Draft',
  notes text
);

-- RATE CARDS
create table public.rate_cards (
  id uuid default gen_random_uuid() primary key,
  type text not null,
  channel text,
  tier text,
  platform text,
  posts_min integer,
  posts_max integer,
  duration_weeks_min integer,
  duration_weeks_max integer,
  rate_pkr numeric not null,
  modifier_pct numeric default 0,
  notes text,
  updated_at timestamptz default now()
);

-- ============================================================
-- AD INTELLIGENCE TABLES
-- ============================================================

-- MONITORED SITES
create table public.sites (
  id uuid default gen_random_uuid() primary key,
  url text not null unique,
  nickname text,
  category text check (category in ('News','Entertainment','E-commerce','Lifestyle','Other')) default 'News',
  is_active boolean default true,
  created_at timestamptz default now(),
  last_scraped_at timestamptz
);

-- SCRAPE RESULTS
create table public.scrape_results (
  id uuid default gen_random_uuid() primary key,
  site_id uuid references public.sites(id),
  scraped_at timestamptz default now(),
  screenshot_url text,
  viewport_screenshot_url text,
  ads_detected jsonb default '[]',
  new_content jsonb default '[]',
  all_content jsonb default '[]',
  crm_matches jsonb default '[]',
  status text check (status in ('success','failed')) default 'success',
  error_message text
);

-- FACEBOOK AD SEARCHES
create table public.fb_ad_searches (
  id uuid default gen_random_uuid() primary key,
  search_query text not null,
  country text default 'PK',
  platform_filter text default 'ALL',
  status_filter text default 'ACTIVE',
  searched_at timestamptz default now(),
  results jsonb default '[]',
  result_count integer default 0,
  searched_by uuid references public.users(id)
);

-- DETECTED BRANDS
create table public.detected_brands (
  id uuid default gen_random_uuid() primary key,
  brand_name text not null unique,
  first_detected_at timestamptz default now(),
  last_detected_at timestamptz default now(),
  detection_source text check (detection_source in ('scrape','facebook','both')) default 'scrape',
  sites_detected_on jsonb default '[]',
  fb_ad_count integer default 0,
  reach_estimate text,
  crm_client_id uuid references public.clients(id),
  spend_signal text check (spend_signal in ('high','medium','low')) default 'low'
);

-- ============================================================
-- ROW LEVEL SECURITY (enable after setup)
-- ============================================================
-- alter table public.clients enable row level security;
-- alter table public.deals enable row level security;
-- (add policies per your role requirements)

-- Pre-load suggested competitor sites
insert into public.sites (url, nickname, category) values
  ('https://www.dawn.com', 'Dawn.com', 'News'),
  ('https://www.geo.tv', 'Geo.tv', 'News'),
  ('https://arydraama.tv', 'ARY Digital', 'Entertainment'),
  ('https://www.samaa.tv', 'Samaa TV', 'News'),
  ('https://tribune.com.pk', 'Express Tribune', 'News'),
  ('https://www.thenews.com.pk', 'The News', 'News'),
  ('https://jang.com.pk', 'Jang.com', 'News'),
  ('https://dunyanews.tv', 'Duniya TV', 'News'),
  ('https://www.bolnews.com', 'BOL News', 'News'),
  ('https://nayadaur.tv', 'Naya Daur', 'News'),
  ('https://mashable.com/pakistan', 'Mashable Pakistan', 'Lifestyle')
on conflict (url) do nothing;
