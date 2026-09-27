-- One knowledge entry may cite several published forum posts. Keep the legacy
-- source_post_id as its primary source for existing readers and workflows.
create table public.knowledge_post_sources (
  knowledge_id uuid not null references public.knowledge_entries(id) on delete cascade,
  post_id bigint not null references public.posts(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  primary key (knowledge_id, post_id)
);

create index knowledge_post_sources_post_idx on public.knowledge_post_sources(post_id);

alter table public.knowledge_post_sources enable row level security;
revoke all on public.knowledge_post_sources from anon, authenticated;
grant select on public.knowledge_post_sources to anon, authenticated;
grant insert, update, delete on public.knowledge_post_sources to authenticated;

create policy "Read sources of published knowledge"
on public.knowledge_post_sources for select to anon, authenticated
using (
  (exists (
    select 1 from public.knowledge_entries k
    join public.posts p on p.id = post_id
    where k.id = knowledge_id and k.status = 'published' and k.deleted_at is null
      and p.status = 'published' and p.deleted_at is null
  ))
  or (select public.current_user_is_operator())
);

create policy "Operators add knowledge sources"
on public.knowledge_post_sources for insert to authenticated
with check ((select public.current_user_is_operator()));

create policy "Operators reorder knowledge sources"
on public.knowledge_post_sources for update to authenticated
using ((select public.current_user_is_operator()))
with check ((select public.current_user_is_operator()));

create policy "Operators remove knowledge sources"
on public.knowledge_post_sources for delete to authenticated
using ((select public.current_user_is_operator()));

insert into public.knowledge_post_sources(knowledge_id, post_id, position)
select id, source_post_id, 0
from public.knowledge_entries
where source_post_id is not null
on conflict do nothing;

-- Existing create_knowledge_from_post calls continue to populate the relation.
create or replace function public.sync_primary_knowledge_post_source()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE' and old.source_post_id is distinct from new.source_post_id then
    delete from public.knowledge_post_sources
    where knowledge_id = new.id and post_id = old.source_post_id and position = 0;
  end if;
  if new.source_post_id is not null then
    insert into public.knowledge_post_sources(knowledge_id, post_id, position)
    values (new.id, new.source_post_id, 0)
    on conflict (knowledge_id, post_id) do update set position = 0;
  end if;
  return new;
end; $$;

create trigger knowledge_sync_primary_post_source
after insert or update of source_post_id on public.knowledge_entries
for each row execute function public.sync_primary_knowledge_post_source();

-- The primary source stays fixed; editors can add or replace supporting posts.
create or replace function public.set_knowledge_post_sources(
  p_knowledge_id uuid, p_additional_post_ids bigint[]
)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  primary_post_id bigint;
  normalized_ids bigint[];
  invalid_count integer;
  source_id bigint;
  source_position integer := 1;
begin
  if not public.current_user_is_operator() then raise exception 'forbidden'; end if;

  select source_post_id into primary_post_id
  from public.knowledge_entries
  where id = p_knowledge_id and deleted_at is null
  for update;
  if not found then raise exception 'knowledge_not_found'; end if;
  if primary_post_id is null then raise exception 'primary_source_required'; end if;

  select coalesce(array_agg(id order by first_position), '{}'::bigint[])
  into normalized_ids
  from (
    select id, min(ordinality) as first_position
    from unnest(coalesce(p_additional_post_ids, '{}'::bigint[])) with ordinality as input(id, ordinality)
    where id is not null and id <> primary_post_id
    group by id
  ) unique_ids;
  if cardinality(normalized_ids) > 9 then raise exception 'too_many_sources'; end if;
  if exists (select 1 from unnest(coalesce(p_additional_post_ids, '{}'::bigint[])) as requested(id) where id is null or id <= 0) then
    raise exception 'invalid_post_id';
  end if;

  select count(*) into invalid_count
  from unnest(normalized_ids) as requested(id)
  where not exists (
    select 1 from public.posts p
    where p.id = requested.id and p.status = 'published' and p.deleted_at is null
  );
  if invalid_count > 0 then raise exception 'published_post_required'; end if;

  delete from public.knowledge_post_sources
  where knowledge_id = p_knowledge_id and post_id <> primary_post_id
    and not (post_id = any(normalized_ids));
  foreach source_id in array normalized_ids loop
    insert into public.knowledge_post_sources(knowledge_id, post_id, position)
    values (p_knowledge_id, source_id, source_position)
    on conflict (knowledge_id, post_id) do update set position = excluded.position;
    source_position := source_position + 1;
  end loop;

  update public.knowledge_entries set updated_at = now() where id = p_knowledge_id;
  return jsonb_build_object('ok', true, 'source_count', cardinality(normalized_ids) + 1);
end; $$;

revoke all on function public.set_knowledge_post_sources(uuid, bigint[]) from public, anon;
grant execute on function public.set_knowledge_post_sources(uuid, bigint[]) to authenticated;

-- A hidden source must not remain reachable through a published knowledge entry.
create or replace function public.sync_knowledge_source_state()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status <> 'published' or new.deleted_at is not null then
    update public.knowledge_entries k
    set status = 'unpublished', updated_at = now()
    where k.deleted_at is null and (
      k.source_post_id = new.id or exists (
        select 1 from public.knowledge_post_sources s
        where s.knowledge_id = k.id and s.post_id = new.id
      )
    );
  elsif new.title is distinct from old.title or new.content is distinct from old.content then
    update public.knowledge_entries k
    set needs_review = true, updated_at = now()
    where k.status = 'published' and k.deleted_at is null and (
      k.source_post_id = new.id or exists (
        select 1 from public.knowledge_post_sources s
        where s.knowledge_id = k.id and s.post_id = new.id
      )
    );
  end if;
  return new;
end; $$;
