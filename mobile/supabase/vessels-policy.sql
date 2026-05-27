-- ═══════════════════════════════════════════════════════════════
-- YachtOps — Vessel join-code lookup RPC
-- Run AFTER schema.sql
-- Safe to re-run: CREATE OR REPLACE is idempotent.
-- ═══════════════════════════════════════════════════════════════

-- Allows the anon role to look up a vessel by join code (needed during signup)

create or replace function public.vessel_by_join_code(code text)
returns table(id uuid, vessel_name text, vessel_flag text)
language sql
security definer
set search_path = public
as $$
  select id, name as vessel_name, flag as vessel_flag
  from public.vessels
  where join_code = upper(trim(code))
  limit 1;
$$;

grant execute on function public.vessel_by_join_code(text) to anon, authenticated;
