-- 作品详情发帖闭环：原子创建帖子 + 作品关联，并在帖子公开后通知作品作者。

create or replace function public.submit_post_for_review(p_post_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.posts%rowtype;
  old_status text;
begin
  select * into p from public.posts where id = p_post_id and user_id = (select auth.uid());
  if p.id is null then raise exception 'post_not_found'; end if;
  if public.current_user_is_muted() then raise exception 'user_muted'; end if;
  old_status := p.status;
  update public.posts
  set status = 'pending',
      rejection_reason = null,
      version = version + 1,
      updated_at = now()
  where id = p_post_id;
  insert into public.forum_activity_events(actor_id, event_type, post_id, first_occurrence)
  values ((select auth.uid()), 'post_submitted', p_post_id, old_status is distinct from 'pending');
  return jsonb_build_object('ok', true, 'status', 'pending');
end;
$$;

revoke all on function public.submit_post_for_review(bigint) from public;
grant execute on function public.submit_post_for_review(bigint) to authenticated;

drop policy if exists "Public links follow content" on public.content_product_links;
create policy "Public links follow content"
on public.content_product_links
for select
using (
  (content_type = 'post' and exists (
    select 1 from public.posts p
    where p.id::text = content_id
      and p.deleted_at is null
      and (p.status = 'published' or p.user_id = (select auth.uid()))
  ))
  or (content_type = 'knowledge' and exists (
    select 1 from public.knowledge_entries k
    where k.id::text = content_id
      and k.status = 'published'
      and k.deleted_at is null
  ))
  or public.current_user_is_operator()
);

drop policy if exists "Members create own post product links" on public.content_product_links;
create policy "Members create own post product links"
on public.content_product_links
for insert
to authenticated
with check (
  content_type = 'post'
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id::text = content_id
      and p.user_id = (select auth.uid())
      and p.deleted_at is null
  )
  and (
    (product_type = 'skill' and exists (
      select 1 from public.skills s
      where s.id::text = product_id
        and (s.status = 'published' or s.user_id = (select auth.uid()))
    ))
    or (product_type = 'agent' and exists (
      select 1 from public.agents a where a.id::text = product_id
    ))
  )
);

drop policy if exists "Members delete own post product links" on public.content_product_links;
create policy "Members delete own post product links"
on public.content_product_links
for delete
to authenticated
using (
  created_by = (select auth.uid())
  and content_type = 'post'
  and exists (
    select 1 from public.posts p
    where p.id::text = content_id and p.user_id = (select auth.uid())
  )
);

create index if not exists content_product_links_product_idx
on public.content_product_links(product_type, product_id, content_type, created_at desc);

create or replace function public.create_forum_post_with_product(
  p_title text,
  p_content text,
  p_category text,
  p_content_type text,
  p_author text,
  p_request_id uuid,
  p_case_scenario text default null,
  p_case_goal text default null,
  p_case_tools_environment text default null,
  p_case_steps text default null,
  p_case_input_example text default null,
  p_case_output_example text default null,
  p_case_effects text default null,
  p_case_limitations text default null,
  p_product_type text default null,
  p_product_id text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_post_id bigint;
  existing_post_id bigint;
  product_exists boolean := false;
begin
  if current_user_id is null then raise exception 'not_authenticated'; end if;
  if public.current_user_is_muted() then raise exception 'user_muted'; end if;
  if nullif(btrim(coalesce(p_title, '')), '') is null then raise exception 'title_required'; end if;
  if nullif(btrim(coalesce(p_content, '')), '') is null then raise exception 'content_required'; end if;
  if p_content_type not in ('discussion', 'question', 'case') then raise exception 'invalid_content_type'; end if;
  if p_product_type is not null or p_product_id is not null then
    if p_product_type not in ('skill', 'agent') or nullif(btrim(coalesce(p_product_id, '')), '') is null then
      raise exception 'invalid_product_link';
    end if;
    if p_product_type = 'skill' then
      select exists(
        select 1 from public.skills s
        where s.id::text = p_product_id
          and (s.status = 'published' or s.user_id = current_user_id)
      ) into product_exists;
    else
      select exists(select 1 from public.agents a where a.id::text = p_product_id) into product_exists;
    end if;
    if not product_exists then raise exception 'product_unavailable'; end if;
  end if;

  select id into existing_post_id
  from public.posts
  where user_id = current_user_id and request_id = p_request_id;
  if existing_post_id is not null then
    return jsonb_build_object('ok', true, 'id', existing_post_id, 'status', 'pending', 'idempotent', true);
  end if;

  insert into public.posts(
    title, content, category, content_type, status, author, user_id, request_id,
    case_scenario, case_goal, case_tools_environment, case_steps,
    case_input_example, case_output_example, case_effects, case_limitations
  ) values (
    btrim(p_title), btrim(p_content), p_category, p_content_type, 'pending', p_author,
    current_user_id, p_request_id, p_case_scenario, p_case_goal, p_case_tools_environment,
    p_case_steps, p_case_input_example, p_case_output_example, p_case_effects, p_case_limitations
  ) returning id into new_post_id;

  if p_product_type is not null then
    insert into public.content_product_links(content_type, content_id, product_type, product_id, created_by)
    values ('post', new_post_id::text, p_product_type, p_product_id, current_user_id);
  end if;

  perform public.submit_post_for_review(new_post_id);
  return jsonb_build_object('ok', true, 'id', new_post_id, 'status', 'pending', 'idempotent', false);
end;
$$;

revoke all on function public.create_forum_post_with_product(
  text, text, text, text, text, uuid, text, text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.create_forum_post_with_product(
  text, text, text, text, text, uuid, text, text, text, text, text, text, text, text, text, text
) to authenticated;

create or replace function public.notify_product_owner_for_post(p_post_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner uuid;
  post_title text;
  link record;
  product_owner uuid;
begin
  select user_id, title into post_owner, post_title
  from public.posts
  where id = p_post_id and status = 'published' and deleted_at is null;
  if p_post_id is null or post_title is null then return; end if;

  for link in
    select product_type, product_id
    from public.content_product_links
    where content_type = 'post' and content_id = p_post_id::text
  loop
    product_owner := null;
    if link.product_type = 'skill' then
      select user_id into product_owner
      from public.skills
      where id::text = link.product_id and status = 'published';
    else
      select user_id into product_owner
      from public.agents
      where id::text = link.product_id;
    end if;

    if product_owner is not null and product_owner <> post_owner then
      insert into public.notifications(user_id, actor_id, event_key, kind, target_type, target_id, message)
      values (
        product_owner,
        post_owner,
        'linked-post:' || p_post_id::text || ':' || link.product_type || ':' || link.product_id,
        'linked_post',
        'post',
        p_post_id::text,
        '你的作品收到了新的关联帖子：' || left(post_title, 80)
      ) on conflict (user_id, event_key) do nothing;
    end if;
  end loop;
end;
$$;

revoke all on function public.notify_product_owner_for_post(bigint) from public;

create or replace function public.notify_product_owner_on_post_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and (old.status is distinct from new.status) then
    perform public.notify_product_owner_for_post(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists posts_notify_product_owner on public.posts;
create trigger posts_notify_product_owner
after update of status on public.posts
for each row execute function public.notify_product_owner_on_post_publish();

create or replace function public.notify_product_owner_on_link_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.content_type = 'post' then
    perform public.notify_product_owner_for_post(new.content_id::bigint);
  end if;
  return new;
end;
$$;

drop trigger if exists content_product_links_notify_product_owner on public.content_product_links;
create trigger content_product_links_notify_product_owner
after insert on public.content_product_links
for each row execute function public.notify_product_owner_on_link_insert();
