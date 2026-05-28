-- ═══════════════════════════════════════════════════════════════
-- YachtOps — Checklists schema
-- Run AFTER schema.sql
-- Safe to re-run: all statements are idempotent.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.checklists (
  id          uuid primary key default gen_random_uuid(),
  vessel_id   uuid not null references public.vessels(id) on delete cascade,
  department  text,
  frequency   text not null check (frequency in ('daily','weekly','monthly','quarterly')),
  title       text not null,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

create table if not exists public.checklist_sections (
  id            uuid primary key default gen_random_uuid(),
  checklist_id  uuid not null references public.checklists(id) on delete cascade,
  title         text not null,
  position      integer not null default 0
);

create table if not exists public.checklist_steps (
  id              uuid primary key default gen_random_uuid(),
  checklist_id    uuid not null references public.checklists(id) on delete cascade,
  section_id      uuid references public.checklist_sections(id) on delete set null,
  text            text not null,
  hint            text,
  requires_photo  boolean not null default false,
  position        integer not null default 0
);

create table if not exists public.checklist_runs (
  id            uuid primary key default gen_random_uuid(),
  checklist_id  uuid not null references public.checklists(id) on delete cascade,
  vessel_id     uuid not null references public.vessels(id) on delete cascade,
  started_by    uuid not null references public.profiles(id),
  started_at    timestamptz not null default now(),
  period_date   date not null,
  completed_at  timestamptz,
  completed_by  uuid references public.profiles(id),
  has_issue     boolean not null default false,
  unique (checklist_id, period_date)
);

create table if not exists public.checklist_step_results (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.checklist_runs(id) on delete cascade,
  step_id     uuid not null references public.checklist_steps(id) on delete cascade,
  checked_at  timestamptz,
  checked_by  uuid references public.profiles(id),
  issue_note  text,
  has_issue   boolean not null default false,
  unique (run_id, step_id)
);

alter table public.checklists             enable row level security;
alter table public.checklist_sections     enable row level security;
alter table public.checklist_steps        enable row level security;
alter table public.checklist_runs         enable row level security;
alter table public.checklist_step_results enable row level security;

drop policy if exists "vessel crew can read checklists" on public.checklists;
create policy "vessel crew can read checklists" on public.checklists
  for select using (vessel_id = public.my_vessel_id());

drop policy if exists "officers can manage checklists" on public.checklists;
create policy "officers can manage checklists" on public.checklists
  for all using (vessel_id = public.my_vessel_id() and public.am_officer());

drop policy if exists "vessel crew can read checklist sections" on public.checklist_sections;
create policy "vessel crew can read checklist sections" on public.checklist_sections
  for select using (
    checklist_id in (select id from public.checklists where vessel_id = public.my_vessel_id())
  );

drop policy if exists "officers can manage checklist sections" on public.checklist_sections;
create policy "officers can manage checklist sections" on public.checklist_sections
  for all using (
    checklist_id in (
      select id from public.checklists where vessel_id = public.my_vessel_id() and public.am_officer()
    )
  );

drop policy if exists "vessel crew can read checklist steps" on public.checklist_steps;
create policy "vessel crew can read checklist steps" on public.checklist_steps
  for select using (
    checklist_id in (select id from public.checklists where vessel_id = public.my_vessel_id())
  );

drop policy if exists "officers can manage checklist steps" on public.checklist_steps;
create policy "officers can manage checklist steps" on public.checklist_steps
  for all using (
    checklist_id in (
      select id from public.checklists where vessel_id = public.my_vessel_id() and public.am_officer()
    )
  );

drop policy if exists "vessel crew can read checklist runs" on public.checklist_runs;
create policy "vessel crew can read checklist runs" on public.checklist_runs
  for select using (vessel_id = public.my_vessel_id());

drop policy if exists "crew can manage checklist runs" on public.checklist_runs;
create policy "crew can manage checklist runs" on public.checklist_runs
  for all using (vessel_id = public.my_vessel_id());

drop policy if exists "vessel crew can read step results" on public.checklist_step_results;
create policy "vessel crew can read step results" on public.checklist_step_results
  for select using (
    run_id in (select id from public.checklist_runs where vessel_id = public.my_vessel_id())
  );

drop policy if exists "crew can manage step results" on public.checklist_step_results;
create policy "crew can manage step results" on public.checklist_step_results
  for all using (
    run_id in (select id from public.checklist_runs where vessel_id = public.my_vessel_id())
  );

do $$ begin
  alter publication supabase_realtime add table public.checklist_runs;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.checklist_step_results;
exception when duplicate_object then null;
end $$;

-- ── Seed: Tender daily check (skipped if already exists) ──────────
do $$
declare
  vid   uuid := '00000000-0000-0000-0000-000000000001';
  ck_id uuid;
  sec1  uuid := gen_random_uuid();
  sec2  uuid := gen_random_uuid();
  sec3  uuid := gen_random_uuid();
begin
  if exists (select 1 from public.checklists where vessel_id = vid and title = 'Tender T1 — pre-use inspection') then
    return;
  end if;
  ck_id := gen_random_uuid();
  insert into public.checklists (id, vessel_id, department, frequency, title)
  values (ck_id, vid, 'deck', 'daily', 'Tender T1 — pre-use inspection');
  insert into public.checklist_sections (id, checklist_id, title, position) values
    (sec1, ck_id, 'Visual + safety inspection', 0),
    (sec2, ck_id, 'Launch sequence — davit', 1),
    (sec3, ck_id, 'Post-launch · final checks', 2);
  insert into public.checklist_steps (checklist_id, section_id, text, hint, position) values
    (ck_id, sec1, 'Fuel level > 80% (visual gauge + dip)', null, 0),
    (ck_id, sec1, 'Bilge dry — no water, no fuel smell', null, 1),
    (ck_id, sec1, 'Safety kit complete: VHF, flares (in date), 6× life jackets, first-aid', 'reference photo', 2),
    (ck_id, sec1, 'Engine cranks on first attempt — no warning lights', null, 3),
    (ck_id, sec1, 'VHF test on Ch 8 with bridge — confirm clear', null, 4),
    (ck_id, sec2, 'Clear area beneath davit — no crew, no obstructions', null, 0),
    (ck_id, sec2, 'Confirm davit hook engaged on tender lift points · both fore + aft', 'reference photo', 1),
    (ck_id, sec2, 'Take strain · slow lift to verify load before swing-out', null, 2),
    (ck_id, sec2, 'Swing davit outboard — control with tag lines if wind > 15kt', null, 3),
    (ck_id, sec2, 'Lower at slow speed until afloat · keep tension on painter', null, 4),
    (ck_id, sec2, 'Release davit hooks · stow safely · confirm tender free', null, 5),
    (ck_id, sec3, 'Confirm with bridge over VHF — tender in water, on station', null, 0),
    (ck_id, sec3, 'Stow davit hook & ropes · secure for sea', null, 1),
    (ck_id, sec3, 'Log launch time and crew aboard', null, 2);
end $$;
