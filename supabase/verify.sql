-- Run in the target project's SQL Editor as administrator. Read-only metadata;
-- no private content, no writes. Every row must be passed=true.
-- This diagnoses setup, not deployed two-user behavioral acceptance.
with expected_tables(name) as (
  values ('characters'), ('journal_entries'), ('memories'), ('memory_consents')
), expected_functions(signature,client_allowed) as (
  values
    ('public.mn_create_entry(text,text,date,uuid)',true),
    ('public.mn_edit_entry(uuid,integer,text,text,date)',true),
    ('public.mn_delete_entry(uuid,integer)',true),
    ('public.mn_grant_memory(uuid,integer,text,uuid,uuid,integer)',true),
    ('public.mn_revoke_memory(uuid)',true),
    ('public.mn_recall_memories()',true),
    ('public.mn_list_entries(text,date,timestamp with time zone,uuid)',true),
    ('public.mn_retire_memory(uuid,text,text)',false),
    ('public.mn_purge_expired_metadata()',false)
), checks as (
  select 'table/' || t.name as check_name,
    coalesce(c.relrowsecurity and exists (
      select 1 from pg_policy p where p.polrelid=c.oid
    ) and has_table_privilege('authenticated',c.oid,'SELECT')
    and not has_table_privilege('anon',c.oid,'SELECT')
    and not has_table_privilege('anon',c.oid,'INSERT,UPDATE,DELETE')
    and not has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE'),false) as passed
  from expected_tables t
  left join pg_class c on c.oid=to_regclass('public.' || t.name)
  union all
  select 'function/' || f.signature,
    coalesce(p.prosecdef
      and 'search_path=""'=any(p.proconfig)
      and has_function_privilege('authenticated',p.oid,'EXECUTE')=f.client_allowed
      and not has_function_privilege('anon',p.oid,'EXECUTE'),false)
  from expected_functions f
  left join pg_proc p on p.oid=to_regprocedure(f.signature)
)
select check_name,passed from checks order by check_name;
