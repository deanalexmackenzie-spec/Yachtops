-- ═══════════════════════════════════════════════════════════════
-- YachtOps — Push notification token column
-- Run AFTER schema.sql
-- ═══════════════════════════════════════════════════════════════

-- Add push_token column to profiles so each device can receive
-- Expo push notifications when a worklist is published.
alter table public.profiles
  add column if not exists push_token text;
