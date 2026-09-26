-- Stop creating Agent product associations while preserving existing historical rows.
-- NOT VALID keeps old Agent links readable and unchanged, while enforcing Skill-only
-- associations for every new or updated row. Drop this constraint to restore writes.
alter table public.content_product_links
  add constraint content_product_links_skill_only_new_rows
  check (product_type = 'skill') not valid;

drop policy if exists "Members create own post product links" on public.content_product_links;
create policy "Members create own post product links"
on public.content_product_links
for insert
to authenticated
with check (
  content_type = 'post'
  and product_type = 'skill'
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id::text = content_id
      and p.user_id = (select auth.uid())
      and p.deleted_at is null
  )
  and exists (
    select 1 from public.skills s
    where s.id::text = product_id
      and (s.status = 'published' or s.user_id = (select auth.uid()))
  )
);

-- Operators can still manage Skill associations. Existing Agent rows remain visible
-- and can be removed if a moderator explicitly requests it.
drop policy if exists "Operators manage links" on public.content_product_links;
create policy "Operators create Skill links"
on public.content_product_links
for insert
to authenticated
with check (
  public.current_user_is_operator()
  and product_type = 'skill'
  and exists (select 1 from public.skills s where s.id::text = product_id)
);
create policy "Operators update Skill links"
on public.content_product_links
for update
to authenticated
using (public.current_user_is_operator())
with check (public.current_user_is_operator() and product_type = 'skill');
create policy "Operators delete product links"
on public.content_product_links
for delete
to authenticated
using (public.current_user_is_operator());

notify pgrst, 'reload schema';

-- Disable direct Agent publishing while keeping existing rows and files intact.
revoke select, insert, update, delete on public.agents from anon, authenticated;
drop policy if exists "Authenticated users can add their agents" on public.agents;
drop policy if exists "Users can update their own agents" on public.agents;
drop policy if exists "Users can delete their own agents" on public.agents;
drop policy if exists "packages agent upload compatibility" on storage.objects;
drop policy if exists "packages owner delete agent package" on storage.objects;
revoke execute on function public.increment_agent_downloads(bigint) from public, anon, authenticated;

-- Reject legacy Agent values before creating a post. This avoids a partially handled
-- user request and gives the app a clear invalid_product_link error.
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
    if p_product_type is distinct from 'skill' or nullif(btrim(coalesce(p_product_id, '')), '') is null then
      raise exception 'invalid_product_link';
    end if;
    select exists(
      select 1 from public.skills s
      where s.id::text = p_product_id
        and (s.status = 'published' or s.user_id = current_user_id)
    ) into product_exists;
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
    values ('post', new_post_id::text, 'skill', p_product_id, current_user_id);
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
revoke execute on function public.create_forum_post_with_product(
  text, text, text, text, text, uuid, text, text, text, text, text, text, text, text, text, text
) from anon;
