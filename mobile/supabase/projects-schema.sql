-- ═══════════════════════════════════════════════════════════════
-- YachtOps — Projects schema
-- Run AFTER schema.sql
-- Safe to re-run: all statements are idempotent.
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

drop policy if exists "vessel crew can read projects" on public.projects;
create policy "vessel crew can read projects" on public.projects
  for select using (vessel_id = public.my_vessel_id());

drop policy if exists "officers can manage projects" on public.projects;
create policy "officers can manage projects" on public.projects
  for all using (vessel_id = public.my_vessel_id() and public.am_officer());

drop policy if exists "vessel crew can read project tasks" on public.project_tasks;
create policy "vessel crew can read project tasks" on public.project_tasks
  for select using (
    project_id in (
      select id from public.projects where vessel_id = public.my_vessel_id()
    )
  );

drop policy if exists "officers can manage project tasks" on public.project_tasks;
create policy "officers can manage project tasks" on public.project_tasks
  for all using (
    project_id in (
      select id from public.projects where vessel_id = public.my_vessel_id()
        and public.am_officer()
    )
  );
