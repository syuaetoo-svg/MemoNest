-- B2: Supabase Auth owns passwords/sessions; all business writes are atomic RPCs.
-- Run once with Supabase migrations, or in the SQL editor of a new project.
begin;
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);
insert into public.characters (id, slug, name) values ('11111111-1111-4111-8111-111111111111', 'xiaoqi', '小栖');

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '' check (length(title) <= 120),
  body text not null check (length(body) <= 10000),
  event_date date,
  version integer not null default 1 check (version > 0),
  origin text not null default 'manual' check (origin = 'manual'),
  client_request_id uuid not null,
  request_hash text not null,
  undo_until timestamptz not null default (clock_timestamp() + interval '10 seconds'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  unique (user_id, id), unique (user_id, client_request_id),
  check (deleted_at is not null or (length(btrim(body)) > 0 and event_date is not null)),
  check (event_date is null or event_date between date '1900-01-01' and date '2100-12-31')
);
create index journal_timeline on public.journal_entries(user_id, event_date desc, created_at desc, id desc) where deleted_at is null;

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id),
  journal_entry_id uuid not null,
  source_version integer not null,
  summary text not null check (length(summary) <= 1200),
  content_hash text not null,
  version integer not null default 1 check (version > 0),
  status text not null check (status in ('active','revoked','invalidated','deleted')),
  client_request_id uuid not null,
  request_hash text not null,
  created_at timestamptz not null default clock_timestamp(),
  invalidated_at timestamptz,
  unique(user_id, id), unique(user_id, client_request_id),
  foreign key (user_id, journal_entry_id) references public.journal_entries(user_id, id) on delete cascade,
  check ((status = 'active' and length(btrim(summary)) > 0) or (status <> 'active' and summary = ''))
);
create unique index one_active_memory on public.memories(user_id,journal_entry_id,character_id) where status = 'active';
create index memory_owner on public.memories(user_id,character_id,status);

create table public.memory_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_id uuid not null,
  action text not null check (action in ('GRANT','REVOKE')),
  grant_id uuid references public.memory_consents(id),
  memory_version integer not null,
  source_version integer not null,
  content_hash text not null,
  character_id uuid not null references public.characters(id),
  purpose text not null default 'role_recall' check (purpose = 'role_recall'),
  policy_version text not null default 'b2-v1',
  reason text not null,
  created_at timestamptz not null default clock_timestamp(),
  foreign key (user_id,memory_id) references public.memories(user_id,id) on delete cascade,
  check ((action = 'GRANT' and grant_id is null) or (action = 'REVOKE' and grant_id is not null))
);
create unique index consent_one_grant on public.memory_consents(memory_id) where action = 'GRANT';
create unique index consent_one_revoke on public.memory_consents(grant_id) where action = 'REVOKE';

alter table public.characters enable row level security;
alter table public.journal_entries enable row level security;
alter table public.memories enable row level security;
alter table public.memory_consents enable row level security;
create policy character_read on public.characters for select to authenticated using (true);
create policy journal_owner on public.journal_entries for select to authenticated using ((select auth.uid()) = user_id and deleted_at is null);
create policy memory_owner on public.memories for select to authenticated using ((select auth.uid()) = user_id);
create policy consent_owner on public.memory_consents for select to authenticated using ((select auth.uid()) = user_id);
-- No client-side insert/update/delete privileges, even for the owner.
revoke all on public.characters, public.journal_entries, public.memories, public.memory_consents from anon, authenticated;
grant select on public.characters, public.journal_entries, public.memories, public.memory_consents to authenticated;

create function public.mn_create_entry(p_title text,p_body text,p_event_date date,p_key uuid)
returns public.journal_entries language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); e public.journal_entries; h text;
begin
  if u is null then raise exception 'MN_UNAUTHORIZED'; end if;
  if p_key is null or p_title is null or p_body is null or p_event_date is null or length(p_title)>120 or length(btrim(p_body))=0 or length(p_body)>10000 then raise exception 'MN_INVALID'; end if;
  h := encode(sha256(convert_to(jsonb_build_array(p_title,p_body,p_event_date)::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended(u::text || ':' || p_key::text,0));
  select * into e from public.journal_entries where user_id=u and client_request_id=p_key;
  if found then
    if e.request_hash<>h or e.deleted_at is not null then raise exception 'MN_CONFLICT'; end if;
    return e;
  end if;
  insert into public.journal_entries(user_id,title,body,event_date,client_request_id,request_hash)
    values(u,p_title,p_body,p_event_date,p_key,h) returning * into e;
  return e;
end $$;

-- Internal-only helper: clears live content and adds a matching revoke event.
create function public.mn_retire_memory(p_id uuid,p_reason text,p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.memories; g public.memory_consents;
begin
  select * into m from public.memories where id=p_id for update;
  if not found or m.status<>'active' then return; end if;
  select * into g from public.memory_consents where memory_id=m.id and action='GRANT';
  insert into public.memory_consents(user_id,memory_id,action,grant_id,memory_version,source_version,content_hash,character_id,reason)
    values(m.user_id,m.id,'REVOKE',g.id,m.version,m.source_version,m.content_hash,m.character_id,p_reason)
    on conflict (grant_id) where action='REVOKE' do nothing;
  update public.memories set status=p_status,summary='',invalidated_at=clock_timestamp() where id=m.id;
end $$;

create function public.mn_edit_entry(p_id uuid,p_expected_version integer,p_title text,p_body text,p_event_date date)
returns public.journal_entries language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); e public.journal_entries; m record;
begin
  if u is null then raise exception 'MN_UNAUTHORIZED'; end if;
  select * into e from public.journal_entries where id=p_id and user_id=u and deleted_at is null for update;
  if not found then raise exception 'MN_NOT_FOUND'; end if;
  if p_expected_version is null or e.version<>p_expected_version then raise exception 'MN_CONFLICT'; end if;
  if p_title is null or p_body is null or p_event_date is null or length(p_title)>120 or length(btrim(p_body))=0 or length(p_body)>10000 then raise exception 'MN_INVALID'; end if;
  for m in select id from public.memories where journal_entry_id=e.id and user_id=u and status='active' loop
    perform public.mn_retire_memory(m.id,'source_changed','invalidated');
  end loop;
  update public.journal_entries set title=p_title,body=p_body,event_date=p_event_date,version=version+1,updated_at=clock_timestamp()
    where id=e.id returning * into e;
  -- undo_until deliberately unchanged: editing cannot bypass the initial window.
  return e;
end $$;

create function public.mn_delete_entry(p_id uuid,p_expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); e public.journal_entries; m record;
begin
  if u is null then raise exception 'MN_UNAUTHORIZED'; end if;
  select * into e from public.journal_entries where id=p_id and user_id=u for update;
  if not found then raise exception 'MN_NOT_FOUND'; end if;
  if e.deleted_at is not null then return; end if;
  if p_expected_version is null or e.version<>p_expected_version then raise exception 'MN_CONFLICT'; end if;
  for m in select id from public.memories where journal_entry_id=e.id and user_id=u and status='active' loop
    perform public.mn_retire_memory(m.id,'source_deleted','deleted');
  end loop;
  update public.memories set status='deleted',summary='',invalidated_at=coalesce(invalidated_at,clock_timestamp()) where user_id=u and journal_entry_id=e.id;
  update public.journal_entries set title='',body='',event_date=null,version=version+1,deleted_at=clock_timestamp(),updated_at=clock_timestamp() where id=e.id;
end $$;

create function public.mn_grant_memory(p_entry_id uuid,p_source_version integer,p_summary text,p_key uuid,p_replace_id uuid default null,p_expected_memory_version integer default null)
returns public.memories language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); e public.journal_entries; m public.memories; old public.memories; h text; v integer := 1;
begin
  if u is null then raise exception 'MN_UNAUTHORIZED'; end if;
  if p_key is null or p_summary is null or length(btrim(p_summary))=0 or length(p_summary)>1200 then raise exception 'MN_INVALID'; end if;
  select * into e from public.journal_entries where id=p_entry_id and user_id=u and deleted_at is null for update;
  if not found then raise exception 'MN_NOT_FOUND'; end if;
  h := encode(sha256(convert_to(jsonb_build_array(p_entry_id,p_source_version,p_summary,p_replace_id,p_expected_memory_version)::text,'UTF8')),'hex');
  select * into m from public.memories where user_id=u and client_request_id=p_key;
  if found then
    if m.request_hash<>h or m.status<>'active' then raise exception 'MN_CONFLICT'; end if;
    return m;
  end if;
  if p_source_version is null or e.version<>p_source_version then raise exception 'MN_CONFLICT'; end if;
  if clock_timestamp()<e.undo_until then raise exception 'MN_UNDO_WINDOW'; end if;
  if p_replace_id is not null then
    select * into old from public.memories where id=p_replace_id and user_id=u and journal_entry_id=e.id and status='active' for update;
    if not found then raise exception 'MN_NOT_FOUND'; end if;
    if p_expected_memory_version is null or old.version<>p_expected_memory_version then raise exception 'MN_CONFLICT'; end if;
    perform public.mn_retire_memory(old.id,'summary_changed','invalidated');
    v := old.version+1;
  elsif exists(select 1 from public.memories where user_id=u and journal_entry_id=e.id and status='active') then
    raise exception 'MN_CONFLICT';
  end if;
  insert into public.memories(user_id,character_id,journal_entry_id,source_version,summary,content_hash,version,status,client_request_id,request_hash)
    values(u,'11111111-1111-4111-8111-111111111111',e.id,e.version,p_summary,encode(sha256(convert_to(p_summary,'UTF8')),'hex'),v,'active',p_key,h) returning * into m;
  insert into public.memory_consents(user_id,memory_id,action,memory_version,source_version,content_hash,character_id,reason)
    values(u,m.id,'GRANT',m.version,m.source_version,m.content_hash,m.character_id,'explicit_confirmation');
  return m;
end $$;

create function public.mn_revoke_memory(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); entry_id uuid; m public.memories;
begin
  if u is null then raise exception 'MN_UNAUTHORIZED'; end if;
  select journal_entry_id into entry_id from public.memories where id=p_id and user_id=u;
  if not found then raise exception 'MN_NOT_FOUND'; end if;
  -- Same lock order as edits/grants: source then memory, avoiding deadlocks.
  perform 1 from public.journal_entries where id=entry_id and user_id=u for update;
  select * into m from public.memories where id=p_id and user_id=u for update;
  perform public.mn_retire_memory(m.id,'user_revoked','revoked');
end $$;

create function public.mn_recall_memories()
returns table(id uuid,journal_entry_id uuid,source_version integer,summary text,character_id uuid,version integer)
language sql security definer set search_path = '' as $$
  select m.id,m.journal_entry_id,m.source_version,m.summary,m.character_id,m.version
  from public.memories m join public.journal_entries e on e.id=m.journal_entry_id and e.user_id=m.user_id
  join public.memory_consents g on g.memory_id=m.id and g.user_id=m.user_id and g.action='GRANT'
    and g.memory_version=m.version and g.source_version=m.source_version and g.content_hash=m.content_hash
    and g.character_id=m.character_id and g.purpose='role_recall'
  where m.user_id=auth.uid() and m.character_id='11111111-1111-4111-8111-111111111111' and m.status='active'
    and e.deleted_at is null and e.version=m.source_version
    and m.content_hash=encode(sha256(convert_to(m.summary,'UTF8')),'hex')
    and not exists(select 1 from public.memory_consents r where r.grant_id=g.id and r.action='REVOKE')
  order by m.created_at desc,m.id desc;
$$;

revoke all on function public.mn_retire_memory(uuid,text,text) from public,anon,authenticated;
revoke all on function public.mn_create_entry(text,text,date,uuid),public.mn_edit_entry(uuid,integer,text,text,date),public.mn_delete_entry(uuid,integer),public.mn_grant_memory(uuid,integer,text,uuid,uuid,integer),public.mn_revoke_memory(uuid),public.mn_recall_memories() from public,anon;
grant execute on function public.mn_create_entry(text,text,date,uuid),public.mn_edit_entry(uuid,integer,text,text,date),public.mn_delete_entry(uuid,integer),public.mn_grant_memory(uuid,integer,text,uuid,uuid,integer),public.mn_revoke_memory(uuid),public.mn_recall_memories() to authenticated;

create function public.mn_list_entries(p_keyword text default '',p_before_date date default null,p_before_created timestamptz default null,p_before_id uuid default null)
returns setof public.journal_entries language sql security definer set search_path = '' as $$
  select e.* from public.journal_entries e
  where e.user_id=auth.uid() and e.deleted_at is null
    and position(lower(left(coalesce(p_keyword,''),200)) in lower(e.title || E'\\n' || e.body))>0
    and (p_before_date is null or (e.event_date,e.created_at,e.id)<(p_before_date,p_before_created,p_before_id))
  order by e.event_date desc,e.created_at desc,e.id desc limit 31;
$$;
revoke all on function public.mn_list_entries(text,date,timestamptz,uuid) from public,anon;
grant execute on function public.mn_list_entries(text,date,timestamptz,uuid) to authenticated;
commit;
