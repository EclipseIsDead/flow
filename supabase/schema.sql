-- Flow task storage.
-- The app auto-creates these tables when POSTGRES_URL is configured.
-- Run this manually only if you use the Supabase REST fallback instead.

create table if not exists public.flow_state (
  id text primary key,
  tasks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.flow_state (id, tasks)
values ('tasks', '[]'::jsonb)
on conflict (id) do nothing;

-- Independent protein tracker storage.
create table if not exists public.flow_protein_days (
  date text primary key,
  grams integer not null default 0,
  goal_grams integer not null default 150,
  updated_at timestamptz not null default now()
);

-- Keep public anon/publishable clients out. Server-side service-role/secret keys
-- can still access these tables through the app API.
alter table public.flow_state enable row level security;
alter table public.flow_protein_days enable row level security;
