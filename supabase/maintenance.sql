-- Run separately as project administrator AFTER the core migration.
-- Install, then schedule `select public.mn_purge_expired_metadata();` daily
-- using Supabase Cron or an administrator job. Not exposed to the application.
create or replace function public.mn_purge_expired_metadata()
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.memories where status <> 'active' and invalidated_at < clock_timestamp() - interval '90 days';
  delete from public.journal_entries where deleted_at < clock_timestamp() - interval '90 days';
end $$;
revoke all on function public.mn_purge_expired_metadata() from public,anon,authenticated;
