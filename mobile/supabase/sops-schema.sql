-- ═══════════════════════════════════════════════════════════════
-- YachtOps — SOPs schema
-- Run AFTER schema.sql
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.sops (
  id          uuid primary key default gen_random_uuid(),
  vessel_id   uuid not null references public.vessels(id) on delete cascade,
  department  text,
  category    text,
  title       text not null,
  content     text not null default '',
  ref_code    text,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.sops enable row level security;

create policy "vessel crew can read sops" on public.sops
  for select using (vessel_id = public.my_vessel_id());

create policy "officers can manage sops" on public.sops
  for all using (vessel_id = public.my_vessel_id() and public.am_officer());

-- ── Seed data ─────────────────────────────────────────────────
do $$
declare vid uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into public.sops (vessel_id, department, category, title, ref_code, content) values

  (vid, 'deck', 'Tender Ops',
   'Tender Launch & Recovery — Davit System',
   'DECK-001',
   E'## Purpose\nSafe launch and recovery of the primary tender using the davit system.\n\n## Pre-Launch Checklist\n1. Brief all deck crew on roles before commencing.\n2. Confirm clear zone beneath davit — no crew, no guests, no obstructions.\n3. Check davit hook condition and safety latch function.\n4. Verify tender fuel >80%, bilge dry, all safety gear aboard.\n5. Radio check with bridge on Ch 8.\n\n## Launch Sequence\n1. Attach davit hooks to tender fore and aft lift points.\n2. Take strain slowly — confirm load evenly distributed before swing-out.\n3. Swing davit outboard using tag lines if wind >15 kt.\n4. Lower tender at slow speed until afloat; maintain painter tension.\n5. Release hooks, stow safely, and confirm tender free.\n6. Report to bridge: tender in water, crew aboard, on station.\n\n## Recovery Sequence\nReverse launch sequence. Never recover in sea state >Bft 4 without officer approval.\n\n## Emergency Abort\nIf load shifts or hook shows distress — cease operation, lower back to cradle, investigate before retry.'),

  (vid, 'deck', 'Tender Ops',
   'Tender — Fuel & Pre-Use Inspection',
   'DECK-002',
   E'## Daily Inspection Points\n- **Fuel**: >80% (visual gauge and dip-stick confirm)\n- **Bilge**: Dry; no water ingress, no fuel smell\n- **Engine**: Cold start on first attempt; no warning lights\n- **Safety kit**: VHF charged, flares in-date, 6× life jackets, first-aid kit\n- **Hull**: No damage, transom secure\n\n## Refuelling\n1. Stop engine. No smoking within 10 m.\n2. Use funnel with filter. Avoid spills — have absorbent pads ready.\n3. Replace cap firmly. Check for leaks before starting.\n4. Log fuel quantity added in deck log.\n\n## Out-of-Service Criteria\nRemove from service if: bilge holds water after 10 min pumping; warning light persists after restart; flares expired; VHF inoperative.'),

  (vid, 'engine', 'Safety',
   'Engine Room Entry Procedure',
   'ENG-001',
   E'## Rule\nNo crew member enters the engine room alone. Always inform bridge of entry and exit.\n\n## Entry Steps\n1. Inform bridge: "Engine room entry, [name]."\n2. Check engine room ventilation is running.\n3. Check for unusual smells (fuel, burning) before proceeding.\n4. Sign the engine room log — time in.\n5. Carry personal gas detector if available.\n\n## Exit Steps\n1. Sign engine room log — time out.\n2. Inform bridge: "Engine room clear."\n3. Ensure all panels closed and secured.\n\n## Emergency\nIf CO2 or Halon system activates — evacuate immediately. Do NOT re-enter until engineering officer confirms safe.'),

  (vid, 'interior', 'Guest Service',
   'Guest Welcome & Cabin Preparation',
   'INT-001',
   E'## 48 Hours Before Arrival\n- Confirm guest list and any dietary / allergy requirements with chef.\n- Press all linen; check towel animals are briefed if requested.\n- Confirm cabin amenities: toiletries full, minibar stocked, welcome card signed.\n\n## Day of Arrival\n- Full vacuum and surface clean by 10:00.\n- Fresh flowers placed by 11:00.\n- Welcome drink prepared — confirm preference (charter preference sheet).\n- All crew in whites, on deck for arrival.\n\n## Cabin Standard\n- Bed made to military standard; no wrinkles.\n- Pillows: two per person plus two accent pillows.\n- TV remote on nightstand, guide open to welcome channel.\n- AC set to 21 °C unless guest preference specified otherwise.');
end $$;
