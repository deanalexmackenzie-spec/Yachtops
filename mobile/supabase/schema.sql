-- ═══════════════════════════════════════════════════════════════
-- YachtOps — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Safe to re-run: all statements are idempotent.
-- ═══════════════════════════════════════════════════════════════

-- ── Vessels ──────────────────────────────────────────────────────
create table if not exists public.vessels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  join_code   text not null unique,
  flag        text,
  created_at  timestamptz not null default now()
);

insert into public.vessels (id, name, join_code)
values ('00000000-0000-0000-0000-000000000001', 'M/Y Eclipse', 'ECLIPS')
on conflict do nothing;

-- ── Profiles ──────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  vessel_id    uuid references public.vessels(id),
  full_name    text not null,
  role         text not null default 'Crew',
  initials     text not null,
  department   text not null check (department in ('deck','interior','engine','galley','bridge','eto')),
  is_officer   boolean not null default false,
  color        text not null default '#0c4a6e',
  push_token   text,
  created_at   timestamptz not null default now()
);

-- ── Worklists ─────────────────────────────────────────────────────
create table if not exists public.worklists (
  id            uuid primary key default gen_random_uuid(),
  vessel_id     uuid not null references public.vessels(id) on delete cascade,
  department    text not null check (department in ('deck','interior','engine','galley','bridge','eto')),
  date          date not null,
  morning_note  text,
  published_at  timestamptz,
  published_by  uuid references public.profiles(id),
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now(),
  unique (vessel_id, department, date)
);

-- ── Worklist sections ─────────────────────────────────────────────
create table if not exists public.worklist_sections (
  id           uuid primary key default gen_random_uuid(),
  worklist_id  uuid not null references public.worklists(id) on delete cascade,
  label        text not null,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ── Worklist jobs ─────────────────────────────────────────────────
create table if not exists public.worklist_jobs (
  id                   uuid primary key default gen_random_uuid(),
  worklist_id          uuid not null references public.worklists(id) on delete cascade,
  section_id           uuid references public.worklist_sections(id) on delete set null,
  title                text not null,
  notes                text,
  assignee_id          uuid references public.profiles(id) on delete set null,
  is_priority          boolean not null default false,
  photo_required       boolean not null default false,
  sop_reference        text,
  position             integer not null default 0,
  completed_at         timestamptz,
  completed_by         uuid references public.profiles(id) on delete set null,
  completed_note       text,
  created_at           timestamptz not null default now()
);

-- ── Notices ───────────────────────────────────────────────────────
create table if not exists public.notices (
  id          uuid primary key default gen_random_uuid(),
  vessel_id   uuid not null references public.vessels(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  department  text,
  priority    text not null default 'info' check (priority in ('info','heads_up','urgent')),
  title       text not null,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- ── Notice reads ──────────────────────────────────────────────────
create table if not exists public.notice_reads (
  notice_id  uuid not null references public.notices(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  read_at    timestamptz not null default now(),
  primary key (notice_id, user_id)
);

-- ── Reminders (Notes tab) ─────────────────────────────────────────
create table if not exists public.reminders (
  id                  uuid primary key default gen_random_uuid(),
  author_id           uuid not null references public.profiles(id) on delete cascade,
  vessel_id           uuid not null references public.vessels(id) on delete cascade,
  title               text not null,
  body                text not null default '',
  is_shared_officers  boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── Calendar events ───────────────────────────────────────────────
create table if not exists public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  vessel_id   uuid not null references public.vessels(id) on delete cascade,
  title       text not null,
  date        date not null,
  type        text not null default 'other'
    check (type in ('drill','delivery','owner','charter','contractor','survey','other')),
  notes       text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════

alter table public.vessels           enable row level security;
alter table public.profiles          enable row level security;
alter table public.worklists         enable row level security;
alter table public.worklist_sections enable row level security;
alter table public.worklist_jobs     enable row level security;
alter table public.notices           enable row level security;
alter table public.notice_reads      enable row level security;
alter table public.reminders         enable row level security;
alter table public.calendar_events   enable row level security;

-- ── Helpers ───────────────────────────────────────────────────────
create or replace function public.my_vessel_id()
returns uuid language sql stable security definer as $$
  select vessel_id from public.profiles where id = auth.uid()
$$;

create or replace function public.am_officer()
returns boolean language sql stable security definer as $$
  select coalesce((select is_officer from public.profiles where id = auth.uid()), false)
$$;

-- ── Vessels ───────────────────────────────────────────────────────
drop policy if exists "vessel members can read" on public.vessels;
create policy "vessel members can read" on public.vessels
  for select using (id = public.my_vessel_id());

-- ── Profiles ──────────────────────────────────────────────────────
drop policy if exists "crew can read own vessel profiles" on public.profiles;
create policy "crew can read own vessel profiles" on public.profiles
  for select using (vessel_id = public.my_vessel_id());

drop policy if exists "user can insert own profile" on public.profiles;
create policy "user can insert own profile" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "user can update own profile" on public.profiles;
create policy "user can update own profile" on public.profiles
  for update using (id = auth.uid());

-- ── Worklists ─────────────────────────────────────────────────────
drop policy if exists "vessel crew can read published worklists" on public.worklists;
create policy "vessel crew can read published worklists" on public.worklists
  for select using (
    vessel_id = public.my_vessel_id()
    and (published_at is not null or created_by = auth.uid() or public.am_officer())
  );

drop policy if exists "officers can insert worklists" on public.worklists;
create policy "officers can insert worklists" on public.worklists
  for insert with check (vessel_id = public.my_vessel_id() and public.am_officer());

drop policy if exists "creator can update worklist" on public.worklists;
create policy "creator can update worklist" on public.worklists
  for update using (vessel_id = public.my_vessel_id() and (created_by = auth.uid() or public.am_officer()));

-- ── Worklist sections ─────────────────────────────────────────────
drop policy if exists "vessel crew can read sections" on public.worklist_sections;
create policy "vessel crew can read sections" on public.worklist_sections
  for select using (
    worklist_id in (select id from public.worklists where vessel_id = public.my_vessel_id())
  );

drop policy if exists "officers can manage sections" on public.worklist_sections;
create policy "officers can manage sections" on public.worklist_sections
  for all using (
    worklist_id in (select id from public.worklists where vessel_id = public.my_vessel_id() and public.am_officer())
  );

-- ── Worklist jobs ─────────────────────────────────────────────────
drop policy if exists "vessel crew can read jobs" on public.worklist_jobs;
create policy "vessel crew can read jobs" on public.worklist_jobs
  for select using (
    worklist_id in (select id from public.worklists where vessel_id = public.my_vessel_id())
  );

drop policy if exists "officers can insert jobs" on public.worklist_jobs;
create policy "officers can insert jobs" on public.worklist_jobs
  for insert with check (
    worklist_id in (select id from public.worklists where vessel_id = public.my_vessel_id() and public.am_officer())
  );

drop policy if exists "officers can update jobs" on public.worklist_jobs;
create policy "officers can update jobs" on public.worklist_jobs
  for update using (
    worklist_id in (select id from public.worklists where vessel_id = public.my_vessel_id())
    and (public.am_officer() or completed_by is null)
  );

-- ── Notices ───────────────────────────────────────────────────────
drop policy if exists "vessel crew can read notices" on public.notices;
create policy "vessel crew can read notices" on public.notices
  for select using (vessel_id = public.my_vessel_id());

drop policy if exists "officers can post notices" on public.notices;
create policy "officers can post notices" on public.notices
  for insert with check (vessel_id = public.my_vessel_id() and public.am_officer());

-- ── Notice reads ──────────────────────────────────────────────────
drop policy if exists "crew can read notice_reads for their vessel" on public.notice_reads;
create policy "crew can read notice_reads for their vessel" on public.notice_reads
  for select using (
    notice_id in (select id from public.notices where vessel_id = public.my_vessel_id())
  );

drop policy if exists "crew can mark their own reads" on public.notice_reads;
create policy "crew can mark their own reads" on public.notice_reads
  for insert with check (user_id = auth.uid());

drop policy if exists "crew can upsert their own reads" on public.notice_reads;
create policy "crew can upsert their own reads" on public.notice_reads
  for update using (user_id = auth.uid());

-- ── Reminders ─────────────────────────────────────────────────────
drop policy if exists "author can manage own reminders" on public.reminders;
create policy "author can manage own reminders" on public.reminders
  for all using (author_id = auth.uid());

drop policy if exists "officers can read shared reminders" on public.reminders;
create policy "officers can read shared reminders" on public.reminders
  for select using (is_shared_officers = true and vessel_id = public.my_vessel_id() and public.am_officer());

-- ── Calendar events ───────────────────────────────────────────────
drop policy if exists "vessel crew can read events" on public.calendar_events;
create policy "vessel crew can read events" on public.calendar_events
  for select using (vessel_id = public.my_vessel_id());

drop policy if exists "officers can manage events" on public.calendar_events;
create policy "officers can manage events" on public.calendar_events
  for all using (vessel_id = public.my_vessel_id() and public.am_officer());

-- ═══════════════════════════════════════════════════════════════
-- Realtime
-- ═══════════════════════════════════════════════════════════════

do $$ begin
  alter publication supabase_realtime add table public.worklists;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.worklist_sections;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.worklist_jobs;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.notices;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.notice_reads;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.calendar_events;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.reminders;
exception when duplicate_object then null;
end $$;
