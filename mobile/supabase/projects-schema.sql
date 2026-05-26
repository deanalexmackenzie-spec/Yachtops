-- ═══════════════════════════════════════════════════════════════
-- YachtOps — Projects schema
-- Run AFTER schema.sql
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  vessel_id   uuid not null references public.vessels(id) on delete cascade,
  title       text not null,
  description text,
  department  text,                         -- null = cross-department
  priority    text not null default 'medium'
                check (priority in ('low','medium','high','urgent')),
  status      text not null default 'planning'
                check (status in ('planning','active','on_hold','complete')),
  due_date    date,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  title        text not null,
  notes        text,
  assignee_id  uuid references public.profiles(id),
  status       text not null default 'todo'
                 check (status in ('todo','in_progress','done')),
  due_date     date,
  position     integer not null default 0,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.projects      enable row level security;
alter table public.project_tasks enable row level security;

create policy "vessel crew can read projects" on public.projects
  for select using (vessel_id = public.my_vessel_id());

create policy "officers can manage projects" on public.projects
  for all using (vessel_id = public.my_vessel_id() and public.am_officer());

create policy "vessel crew can read project tasks" on public.project_tasks
  for select using (
    project_id in (
      select id from public.projects where vessel_id = public.my_vessel_id()
    )
  );

create policy "officers can manage project tasks" on public.project_tasks
  for all using (
    project_id in (
      select id from public.projects where vessel_id = public.my_vessel_id()
        and public.am_officer()
    )
  );

-- ── Seed data ────────────────────────────────────────────────────────────────
-- Replace vessel_id with a real vessel uuid before running

-- insert into public.projects (vessel_id, title, description, department, priority, status, due_date)
-- values
--   ('00000000-0000-0000-0000-000000000000', 'Annual Engine Survey Prep',
--    'Prepare documentation and spares list for annual classification survey.',
--    'engine', 'high', 'active', current_date + interval '30 days'),
--   ('00000000-0000-0000-0000-000000000000', 'Guest Charter Q3 Refit',
--    'Deep clean, soft furnishing refresh and tender maintenance ahead of charter season.',
--    null, 'medium', 'planning', current_date + interval '60 days');
