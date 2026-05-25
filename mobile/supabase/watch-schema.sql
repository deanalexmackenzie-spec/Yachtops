-- ═══════════════════════════════════════════════════════════════
-- YachtOps — Watch schema
-- Run AFTER schema.sql
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.watch_slots (
  id           uuid primary key default gen_random_uuid(),
  vessel_id    uuid not null references public.vessels(id) on delete cascade,
  assignee_id  uuid not null references public.profiles(id),
  date         date not null,
  start_time   time not null,   -- e.g. '00:00', '04:00', '08:00'
  end_time     time not null,   -- e.g. '04:00', '08:00', '12:00'
  notes        text,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

alter table public.watch_slots enable row level security;

create policy "vessel crew can read watch slots" on public.watch_slots
  for select using (vessel_id = public.my_vessel_id());

create policy "officers can manage watch slots" on public.watch_slots
  for all using (vessel_id = public.my_vessel_id() and public.am_officer());
