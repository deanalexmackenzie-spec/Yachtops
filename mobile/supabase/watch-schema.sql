-- ═══════════════════════════════════════════════════════════════
-- YachtOps — Watch roster schema
-- Run AFTER schema.sql
-- Safe to re-run: all statements are idempotent.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.watch_slots (
  id           uuid primary key default gen_random_uuid(),
  vessel_id    uuid not null references public.vessels(id) on delete cascade,
  assignee_id  uuid not null references public.profiles(id),
  date         date not null,
  start_time   time not null,
  end_time     time not null,
  notes        text,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

alter table public.watch_slots enable row level security;

drop policy if exists "vessel crew can read watch slots" on public.watch_slots;
create policy "vessel crew can read watch slots" on public.watch_slots
  for select using (vessel_id = public.my_vessel_id());

drop policy if exists "officers can manage watch slots" on public.watch_slots;
create policy "officers can manage watch slots" on public.watch_slots
  for all using (vessel_id = public.my_vessel_id() and public.am_officer());
