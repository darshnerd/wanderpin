-- Wanderpin: auto-expire shared trips after 7 days.
-- Run ONCE in the Supabase dashboard -> SQL Editor. Safe to re-run (idempotent).

-- 1. A timestamp to age rows against (existing rows default to "now").
alter table public.trips
  add column if not exists created_at timestamptz not null default now();

-- 2. The scheduler extension.
create extension if not exists pg_cron;

-- 3. Daily purge of trips older than 7 days (03:17 UTC).
--    Drop any prior job of the same name first so re-running this file is clean.
do $$
begin
  perform cron.unschedule('purge-old-trips');
exception
  when others then null;
end $$;

select cron.schedule(
  'purge-old-trips',
  '17 3 * * *',
  $$ delete from public.trips where created_at < now() - interval '7 days' $$
);

-- Check it landed:  select * from cron.job where jobname = 'purge-old-trips';
