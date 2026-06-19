-- Flow stores the whole task list in one JSONB document.
-- The app auto-creates this table when POSTGRES_URL is configured.
-- Run this manually only if you use the Supabase REST fallback instead.

create table if not exists public.flow_state (
  id text primary key,
  tasks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.flow_state (id, tasks)
values ('tasks', '[]'::jsonb)
on conflict (id) do nothing;

-- Keep public anon/publishable clients out. Server-side service-role/secret keys
-- can still access this table through the app API.
alter table public.flow_state enable row level security;
