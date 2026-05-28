-- ═══════════════════════════════════════════════════════════════
-- YachtOps — Push notification token column
-- Run AFTER schema.sql
-- Safe to re-run: ADD COLUMN IF NOT EXISTS is idempotent.
-- Note: push_token is already in schema.sql; this file is kept
-- for backwards compatibility only.
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists push_token text;
