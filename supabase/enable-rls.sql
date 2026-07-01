-- Enable Row-Level Security on ALL public tables.
--
-- Why: Supabase auto-exposes public tables via its REST API (PostgREST) using
-- the public anon key. With RLS off, anyone can read/write them. ABMSignal only
-- uses Supabase for AUTH and accesses data via Prisma (as the `postgres` owner,
-- which BYPASSES RLS), so enabling RLS with NO policies denies the REST API
-- while leaving the app fully functional.
--
-- Run this ONCE now, and again after any `prisma migrate deploy` that ADDS
-- tables (new tables default to RLS off). Idempotent — safe to re-run.

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);
  end loop;
end $$;

-- Defense-in-depth (optional, do in the dashboard instead of here):
--   Supabase → Project Settings → API → "Exposed schemas": remove `public`.
-- The app never uses the auto REST API, so this future-proofs against new
-- tables being exposed even before RLS is applied.
