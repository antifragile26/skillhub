-- SkillHub 第二批：审核、角色、举报、精选、案例、知识、通知与运营统计。
-- 只新增结构/策略/函数，不删除真实内容；可重复执行。

create extension if not exists pgcrypto;

-- ---------- 角色与内容状态 ----------
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','operator','admin')),
  muted_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;
grant select on public.user_roles to authenticated;

alter table public.posts add column if not exists status text not null default 'published';
alter table public.posts add column if not exists content_type text not null default 'discussion';
alter table public.posts add column if not exists rejection_reason text;
alter table public.posts add column if not exists moderation_reason text;
alter table public.posts add column if not exists moderated_by uuid references auth.users(id) on delete set null;
alter table public.posts add column if not exists moderated_at timestamptz;
alter table public.posts add column if not exists version integer not null default 1;
alter table public.posts add column if not exists is_featured boolean not null default false;
alter table public.posts add column if not exists pin_rank integer;
alter table public.posts add column if not exists resolved boolean not null default false;
alter table public.posts add column if not exists accepted_comment_id uuid;
alter table public.posts add column if not exists case_scenario text;
alter table public.posts add column if not exists case_goal text;
alter table public.posts add column if not exists case_tools_environment text;
alter table public.posts add column if not exists case_steps text;
alter table public.posts add column if not exists case_input_example text;
alter table public.posts add column if not exists case_output_example text;
alter table public.posts add column if not exists case_effects text;
alter table public.posts add column if not exists case_limitations text;

alter table public.comments add column if not exists status text not null default 'published';
alter table public.comments add column if not exists parent_comment_id uuid references public.comments(id) on delete set null;
alter table public.comments add column if not exists moderated_by uuid references auth.users(id) on delete set null;
alter table public.comments add column if not exists moderation_reason text;
alter table public.comments add column if not exists moderated_at timestamptz;

alter table public.posts drop constraint if exists posts_status_check;
alter table public.posts add constraint posts_status_check check (status in ('draft','pending','published','rejected','unpublished'));
alter table public.posts drop constraint if exists posts_content_type_check;
alter table public.posts add constraint posts_content_type_check check (content_type in ('discussion','question','case'));
alter table public.comments drop constraint if exists comments_status_check;
alter table public.comments add constraint comments_status_check check (status in ('published','unpublished'));
alter table public.posts drop constraint if exists posts_pin_rank_check;
alter table public.posts add constraint posts_pin_rank_check check (pin_rank is null or pin_rank between 1 and 3);

update public.posts set status = case when deleted_at is not null then 'unpublished' else 'published' end where status is null or status = '';
update public.posts set content_type = case when category = 'question' then 'question' else 'discussion' end where content_type is null or content_type = '';

-- ---------- 权限函数 ----------
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.user_roles where user_id = auth.uid()), 'member');
$$;
create or replace function public.current_user_is_operator()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('operator','admin');
$$;
create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() = 'admin';
$$;
create or replace function public.current_user_is_muted()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = auth.uid() and muted_until is not null and muted_until > now());
$$;
grant execute on function public.current_user_role() to anon, authenticated;
grant execute on function public.current_user_is_operator() to anon, authenticated;
grant execute on function public.current_user_is_admin() to anon, authenticated;
grant execute on function public.current_user_is_muted() to anon, authenticated;

drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.current_user_is_operator());
drop policy if exists "Admins can manage roles" on public.user_roles;
create policy "Admins can manage roles" on public.user_roles for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- 旧公开策略改为服务端可见性策略；作者可看到自己的审核状态，运营可看管理内容。
drop policy if exists "Anyone can read posts" on public.posts;
create policy "Published posts are public" on public.posts for select using (
  deleted_at is null and (status = 'published' or user_id = auth.uid() or public.current_user_is_operator())
);
drop policy if exists "Authenticated users can add their posts" on public.posts;
create policy "Members submit posts" on public.posts for insert to authenticated with check (
  auth.uid() = user_id and not public.current_user_is_muted() and status in ('draft','pending','published')
);
drop policy if exists "Users can update their own posts" on public.posts;
create policy "Authors update their posts" on public.posts for update to authenticated using (
  auth.uid() = user_id and not public.current_user_is_muted()
) with check (auth.uid() = user_id and not public.current_user_is_muted());
drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Authors delete their posts" on public.posts for delete to authenticated using (auth.uid() = user_id and not public.current_user_is_muted());

drop policy if exists "Anyone can read comments" on public.comments;
create policy "Published comments are public" on public.comments for select using (
  deleted_at is null and status = 'published' and exists (
    select 1 from public.posts p where p.id = comments.post_id and p.deleted_at is null and p.status = 'published'
  ) or user_id = auth.uid() or public.current_user_is_operator()
);
drop policy if exists "Authenticated users can add their comments" on public.comments;
create policy "Members add comments to published posts" on public.comments for insert to authenticated with check (
  auth.uid() = user_id and not public.current_user_is_muted() and status = 'published' and exists (
    select 1 from public.posts p where p.id = comments.post_id and p.deleted_at is null and p.status = 'published'
  )
);
drop policy if exists "Users can update their own comments" on public.comments;
create policy "Authors update comments" on public.comments for update to authenticated using (auth.uid() = user_id and not public.current_user_is_muted()) with check (auth.uid() = user_id and not public.current_user_is_muted());
drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Authors delete comments" on public.comments for delete to authenticated using (auth.uid() = user_id and not public.current_user_is_muted());

create index if not exists posts_status_created_idx on public.posts(status, created_at desc, id desc);
create index if not exists posts_featured_idx on public.posts(is_featured, pin_rank, created_at desc) where status = 'published' and deleted_at is null;
create index if not exists posts_content_type_idx on public.posts(content_type, status, created_at desc);
create index if not exists comments_status_idx on public.comments(post_id, status, created_at asc);

-- 禁言账号不能通过旧的 votes/comment_votes 入口继续互动。
drop policy if exists "Users can add their own votes" on public.votes;
create policy "Users can add their own votes" on public.votes for insert to authenticated with check (auth.uid() = user_id and not public.current_user_is_muted());
drop policy if exists "Users can update their own votes" on public.votes;
create policy "Users can update their own votes" on public.votes for update to authenticated using (auth.uid() = user_id and not public.current_user_is_muted()) with check (auth.uid() = user_id and not public.current_user_is_muted());
drop policy if exists "Users can delete their own votes" on public.votes;
create policy "Users can delete their own votes" on public.votes for delete to authenticated using (auth.uid() = user_id and not public.current_user_is_muted());

drop policy if exists "Users can add their comment votes" on public.comment_votes;
create policy "Users can add their comment votes" on public.comment_votes for insert to authenticated with check (auth.uid() = user_id and not public.current_user_is_muted());
drop policy if exists "Users can update their comment votes" on public.comment_votes;
create policy "Users can update their comment votes" on public.comment_votes for update to authenticated using (auth.uid() = user_id and not public.current_user_is_muted()) with check (auth.uid() = user_id and not public.current_user_is_muted());
drop policy if exists "Users can delete their comment votes" on public.comment_votes;
create policy "Users can delete their comment votes" on public.comment_votes for delete to authenticated using (auth.uid() = user_id and not public.current_user_is_muted());
drop policy if exists "Anyone can read comment votes" on public.comment_votes;
create policy "Anyone can read comment votes" on public.comment_votes for select using (
  exists (select 1 from public.comments c join public.posts p on p.id = c.post_id where c.id = comment_id and c.status = 'published' and c.deleted_at is null and p.status = 'published' and p.deleted_at is null)
  or user_id = auth.uid() or public.current_user_is_operator()
);

create or replace function public.moderate_comment(p_comment_id uuid, p_decision text, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.comments%rowtype; next_status text;
begin
  if not public.current_user_is_operator() then raise exception 'forbidden'; end if;
  select * into c from public.comments where id = p_comment_id;
  if c.id is null then raise exception 'comment_not_found'; end if;
  if c.user_id = auth.uid() then raise exception 'cannot_moderate_own_comment'; end if;
  if p_decision not in ('unpublish','restore') then raise exception 'invalid_decision'; end if;
  if p_decision = 'unpublish' and nullif(btrim(coalesce(p_reason,'')),'') is null then raise exception 'reason_required'; end if;
  next_status := case when p_decision='restore' then 'published' else 'unpublished' end;
  update public.comments set status=next_status,deleted_at=case when next_status='unpublished' then coalesce(deleted_at,now()) else null end,moderated_by=auth.uid(),moderated_at=now(),moderation_reason=p_reason,updated_at=now() where id=p_comment_id;
  insert into public.operation_audit_logs(actor_id,action,target_type,target_id,before_state,after_state,reason) values (auth.uid(),p_decision,'comment',p_comment_id::text,jsonb_build_object('status',c.status),jsonb_build_object('status',next_status),p_reason);
  insert into public.notifications(user_id,actor_id,event_key,kind,target_type,target_id,message) values (c.user_id,auth.uid(),'comment:'||p_comment_id||':'||next_status||':'||to_char(now(),'YYYYMMDDHH24MISSMS'),'moderation','comment',p_comment_id::text,case when next_status='published' then '你的回复已恢复。' else '你的回复已被下架：'||coalesce(p_reason,'请查看审核原因。') end) on conflict do nothing;
  return jsonb_build_object('ok',true,'status',next_status);
end; $$;
grant execute on function public.moderate_comment(uuid,text,text) to authenticated;

-- ---------- 举报与审计 ----------
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','knowledge')),
  target_id text not null,
  reason text not null check (char_length(btrim(reason)) between 1 and 2000),
  status text not null default 'open' check (status in ('open','violation','no_violation','merged')),
  resolution text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists content_reports_open_unique on public.content_reports(reporter_id, target_type, target_id) where status = 'open';
create index if not exists content_reports_queue_idx on public.content_reports(status, created_at desc);
alter table public.content_reports enable row level security;
grant insert, select on public.content_reports to authenticated;
create policy "Members create reports" on public.content_reports for insert to authenticated with check (reporter_id = auth.uid() and not public.current_user_is_muted());
create policy "Reporters read own reports" on public.content_reports for select to authenticated using (reporter_id = auth.uid() or public.current_user_is_operator());
create policy "Operators resolve reports" on public.content_reports for update to authenticated using (public.current_user_is_operator()) with check (public.current_user_is_operator());

create table if not exists public.operation_audit_logs (
  id bigint generated by default as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  before_state jsonb,
  after_state jsonb,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.operation_audit_logs enable row level security;
grant select on public.operation_audit_logs to authenticated;
create policy "Operators read relevant audit" on public.operation_audit_logs for select to authenticated using (actor_id = auth.uid() or public.current_user_is_admin());

-- ---------- 知识与专题 ----------
create table if not exists public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  summary text not null default '' check (char_length(summary) <= 2000),
  scenario text not null default '',
  steps text not null default '',
  conclusions text not null default '',
  limitations text not null default '',
  tags text[] not null default '{}',
  source_post_id bigint references public.posts(id) on delete set null,
  source_author text,
  source_version_at timestamptz,
  status text not null default 'draft' check (status in ('draft','published','unpublished')),
  needs_review boolean not null default false,
  edited_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists knowledge_source_unique on public.knowledge_entries(source_post_id) where source_post_id is not null and deleted_at is null;
create index if not exists knowledge_public_idx on public.knowledge_entries(status, published_at desc) where deleted_at is null;
alter table public.knowledge_entries enable row level security;
grant select on public.knowledge_entries to anon, authenticated;
grant insert, update on public.knowledge_entries to authenticated;
create policy "Published knowledge is public" on public.knowledge_entries for select using (deleted_at is null and (status = 'published' or public.current_user_is_operator() or edited_by = auth.uid()));
create policy "Operators manage knowledge" on public.knowledge_entries for insert to authenticated with check (public.current_user_is_operator());
create policy "Operators update knowledge" on public.knowledge_entries for update to authenticated using (public.current_user_is_operator()) with check (public.current_user_is_operator());

create table if not exists public.knowledge_revisions (
  id bigint generated by default as identity primary key,
  knowledge_id uuid not null references public.knowledge_entries(id) on delete cascade,
  revision_no integer not null,
  snapshot jsonb not null,
  editor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (knowledge_id, revision_no)
);
alter table public.knowledge_revisions enable row level security;
grant select on public.knowledge_revisions to authenticated;
create policy "Operators read knowledge revisions" on public.knowledge_revisions for select to authenticated using (public.current_user_is_operator());

create table if not exists public.knowledge_collections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  status text not null default 'draft' check (status in ('draft','published','unpublished')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.knowledge_collection_items (
  collection_id uuid not null references public.knowledge_collections(id) on delete cascade,
  knowledge_id uuid not null references public.knowledge_entries(id) on delete cascade,
  position integer not null check (position > 0),
  primary key (collection_id, knowledge_id),
  unique (collection_id, position)
);
alter table public.knowledge_collections enable row level security;
alter table public.knowledge_collection_items enable row level security;
grant select on public.knowledge_collections, public.knowledge_collection_items to anon, authenticated;
grant insert, update, delete on public.knowledge_collections, public.knowledge_collection_items to authenticated;
create policy "Published collections are public" on public.knowledge_collections for select using (status = 'published' or public.current_user_is_operator() or created_by = auth.uid());
create policy "Operators manage collections" on public.knowledge_collections for all to authenticated using (public.current_user_is_operator()) with check (public.current_user_is_operator());
create policy "Collection items follow collection" on public.knowledge_collection_items for select using (exists (select 1 from public.knowledge_collections c where c.id = collection_id and (c.status = 'published' or public.current_user_is_operator() or c.created_by = auth.uid())));
create policy "Operators manage collection items" on public.knowledge_collection_items for all to authenticated using (public.current_user_is_operator()) with check (public.current_user_is_operator());

-- ---------- 产品关联、通知和活动 ----------
create table if not exists public.content_product_links (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('post','knowledge')),
  content_id text not null,
  product_type text not null check (product_type in ('skill','agent')),
  product_id text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (content_type, content_id, product_type, product_id)
);
alter table public.content_product_links enable row level security;
grant select on public.content_product_links to anon, authenticated;
grant insert, update, delete on public.content_product_links to authenticated;
create policy "Public links follow content" on public.content_product_links for select using (
  (content_type = 'post' and exists (select 1 from public.posts p where p.id::text = content_id and p.status = 'published' and p.deleted_at is null))
  or (content_type = 'knowledge' and exists (select 1 from public.knowledge_entries k where k.id::text = content_id and k.status = 'published' and k.deleted_at is null))
  or public.current_user_is_operator()
);
create policy "Operators manage links" on public.content_product_links for all to authenticated using (public.current_user_is_operator()) with check (public.current_user_is_operator());

create table if not exists public.product_click_events (
  id bigint generated by default as identity primary key,
  content_type text not null,
  content_id text not null,
  product_type text not null,
  product_id text not null,
  session_hash text not null,
  clicked_at timestamptz not null default now()
);
create unique index if not exists product_click_30s_unique on public.product_click_events(content_type, content_id, product_type, product_id, session_hash, date_bin('30 seconds', clicked_at, timestamptz '2000-01-01'));
alter table public.product_click_events enable row level security;
revoke all on public.product_click_events from anon, authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_key text not null,
  kind text not null,
  target_type text not null,
  target_id text,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, event_key)
);
create index if not exists notifications_user_idx on public.notifications(user_id, read_at, created_at desc);
alter table public.notifications enable row level security;
grant select, update on public.notifications to authenticated;
create policy "Users read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "Users mark own notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.forum_activity_events (
  id bigint generated by default as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  post_id bigint references public.posts(id) on delete set null,
  knowledge_id uuid references public.knowledge_entries(id) on delete set null,
  first_occurrence boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.forum_activity_events enable row level security;
revoke all on public.forum_activity_events from anon, authenticated;

-- ---------- 受保护业务函数 ----------
create or replace function public.submit_post_for_review(p_post_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.posts%rowtype; old_status text;
begin
  select * into p from public.posts where id = p_post_id and user_id = auth.uid();
  if p.id is null then raise exception 'post_not_found'; end if;
  if public.current_user_is_muted() then raise exception 'user_muted'; end if;
  old_status := p.status;
  if p.content_type = 'case' and (nullif(btrim(p.case_scenario),'') is null or nullif(btrim(p.case_goal),'') is null or nullif(btrim(p.case_tools_environment),'') is null or nullif(btrim(p.case_steps),'') is null or nullif(btrim(p.case_input_example),'') is null or nullif(btrim(p.case_output_example),'') is null or nullif(btrim(p.case_effects),'') is null or nullif(btrim(p.case_limitations),'') is null) then raise exception 'case_fields_required'; end if;
  update public.posts set status = 'pending', rejection_reason = null, version = version + 1, updated_at = now() where id = p_post_id;
  insert into public.forum_activity_events(actor_id,event_type,post_id,first_occurrence) values (auth.uid(),'post_submitted',p_post_id,old_status is distinct from 'pending');
  return jsonb_build_object('ok',true,'status','pending');
end; $$;
grant execute on function public.submit_post_for_review(bigint) to authenticated;

create or replace function public.moderate_post(p_post_id bigint, p_decision text, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.posts%rowtype; next_status text; event_key text;
begin
  if not public.current_user_is_operator() then raise exception 'forbidden'; end if;
  select * into p from public.posts where id = p_post_id;
  if p.id is null then raise exception 'post_not_found'; end if;
  if p.user_id = auth.uid() then raise exception 'cannot_moderate_own_post'; end if;
  if p_decision not in ('approve','reject','unpublish','restore') then raise exception 'invalid_decision'; end if;
  if p_decision in ('reject','unpublish') and nullif(btrim(coalesce(p_reason,'')),'') is null then raise exception 'reason_required'; end if;
  next_status := case p_decision when 'approve' then 'published' when 'restore' then 'published' when 'reject' then 'rejected' else 'unpublished' end;
  update public.posts set status = next_status, deleted_at = case when p_decision = 'unpublish' then coalesce(deleted_at,now()) when p_decision in ('approve','restore') then null else deleted_at end, rejection_reason = case when p_decision = 'reject' then p_reason else null end, moderation_reason = case when p_decision in ('unpublish','restore') then p_reason else moderation_reason end, moderated_by = auth.uid(), moderated_at = now(), is_featured = case when next_status <> 'published' then false else is_featured end, pin_rank = case when next_status <> 'published' then null else pin_rank end, updated_at = now() where id = p_post_id;
  insert into public.operation_audit_logs(actor_id,action,target_type,target_id,before_state,after_state,reason) values (auth.uid(),p_decision,'post',p_post_id::text,jsonb_build_object('status',p.status),jsonb_build_object('status',next_status),p_reason);
  event_key := 'post:'||p_post_id::text||':'||next_status||':'||to_char(now(),'YYYYMMDDHH24MISSMS');
  insert into public.notifications(user_id,actor_id,event_key,kind,target_type,target_id,message) values (p.user_id,auth.uid(),event_key,'moderation','post',p_post_id::text,case next_status when 'published' then '你的帖子已通过审核。' when 'rejected' then '你的帖子被驳回：'||coalesce(p_reason,'请查看审核原因。') else '你的帖子已被下架：'||coalesce(p_reason,'请查看审核原因。') end) on conflict do nothing;
  return jsonb_build_object('ok',true,'status',next_status);
end; $$;
grant execute on function public.moderate_post(bigint,text,text) to authenticated;

create or replace function public.resolve_report(p_report_id uuid, p_result text, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.content_reports%rowtype;
begin
  if not public.current_user_is_operator() then raise exception 'forbidden'; end if;
  if p_result not in ('violation','no_violation','merged') or nullif(btrim(coalesce(p_reason,'')),'') is null then raise exception 'invalid_resolution'; end if;
  select * into r from public.content_reports where id = p_report_id;
  if r.id is null then raise exception 'report_not_found'; end if;
  update public.content_reports set status=p_result,resolution=p_reason,resolved_by=auth.uid(),resolved_at=now() where id=p_report_id;
  insert into public.operation_audit_logs(actor_id,action,target_type,target_id,reason) values (auth.uid(),'resolve_report',r.target_type,r.target_id,p_reason);
  return jsonb_build_object('ok',true);
end; $$;
grant execute on function public.resolve_report(uuid,text,text) to authenticated;

create or replace function public.set_post_feature_flags(p_post_id bigint, p_featured boolean, p_pin_rank integer default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.posts%rowtype; existing_count integer;
begin
  if not public.current_user_is_operator() then raise exception 'forbidden'; end if;
  select * into p from public.posts where id=p_post_id;
  if p.id is null or p.status <> 'published' or p.deleted_at is not null then raise exception 'published_post_required'; end if;
  if p_pin_rank is not null and (p_pin_rank < 1 or p_pin_rank > 3) then raise exception 'invalid_pin_rank'; end if;
  if p_pin_rank is not null then select count(*) into existing_count from public.posts where status='published' and deleted_at is null and pin_rank is not null and id <> p_post_id; if existing_count >= 3 then raise exception 'pin_limit_reached'; end if; end if;
  update public.posts set is_featured=p_featured,pin_rank=p_pin_rank,updated_at=now() where id=p_post_id;
  insert into public.operation_audit_logs(actor_id,action,target_type,target_id,after_state) values (auth.uid(),'feature_post','post',p_post_id::text,jsonb_build_object('featured',p_featured,'pin_rank',p_pin_rank));
  return jsonb_build_object('ok',true);
end; $$;
grant execute on function public.set_post_feature_flags(bigint,boolean,integer) to authenticated;

create or replace function public.accept_forum_reply(p_post_id bigint, p_comment_id uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.posts%rowtype; c public.comments%rowtype; prior uuid;
begin
  select * into p from public.posts where id=p_post_id and user_id=auth.uid();
  if p.id is null or p.content_type <> 'question' then raise exception 'question_owner_required'; end if;
  select * into c from public.comments where id=p_comment_id and post_id=p_post_id and status='published' and deleted_at is null;
  if p_accept and c.id is null then raise exception 'reply_not_found'; end if;
  prior := p.accepted_comment_id;
  update public.posts set accepted_comment_id=case when p_accept then p_comment_id else null end,resolved=p_accept,updated_at=now() where id=p_post_id;
  if p_accept and c.user_id <> auth.uid() then insert into public.notifications(user_id,actor_id,event_key,kind,target_type,target_id,message) values (c.user_id,auth.uid(),'accepted:'||p_post_id||':'||p_comment_id,'accepted','post',p_post_id::text,'你的回复被提问者采纳了。') on conflict do nothing; end if;
  if prior is not null and (not p_accept or prior <> p_comment_id) then insert into public.notifications(user_id,actor_id,event_key,kind,target_type,target_id,message) select user_id,auth.uid(),'unaccepted:'||p_post_id||':'||prior,'accepted','post',p_post_id::text,'该问题的采纳答案已变更，请查看最新状态。' from public.comments where id=prior and user_id <> auth.uid() on conflict do nothing; end if;
  return jsonb_build_object('ok',true,'accepted_comment_id',case when p_accept then p_comment_id else null end);
end; $$;
grant execute on function public.accept_forum_reply(bigint,uuid,boolean) to authenticated;

create or replace function public.create_knowledge_from_post(p_post_id bigint)
returns uuid language plpgsql security definer set search_path = public as $$
declare p public.posts%rowtype; existing_id uuid; new_id uuid;
begin
  if not public.current_user_is_operator() then raise exception 'forbidden'; end if;
  select * into p from public.posts where id=p_post_id and status='published' and deleted_at is null;
  if p.id is null then raise exception 'published_post_required'; end if;
  select id into existing_id from public.knowledge_entries where source_post_id=p_post_id and deleted_at is null limit 1;
  if existing_id is not null then return existing_id; end if;
  insert into public.knowledge_entries(title,summary,scenario,steps,conclusions,limitations,source_post_id,source_author,source_version_at,edited_by) values (p.title,'',coalesce(p.case_scenario,''),coalesce(p.case_steps,p.content,''),coalesce(p.case_effects,''),coalesce(p.case_limitations,'暂无已知限制'),p.id,p.author,p.updated_at,auth.uid()) returning id into new_id;
  insert into public.operation_audit_logs(actor_id,action,target_type,target_id) values (auth.uid(),'create_knowledge','knowledge',new_id::text);
  return new_id;
end; $$;
grant execute on function public.create_knowledge_from_post(bigint) to authenticated;

create or replace function public.publish_knowledge(p_knowledge_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare k public.knowledge_entries%rowtype; next_revision integer;
begin
  if not public.current_user_is_operator() then raise exception 'forbidden'; end if;
  select * into k from public.knowledge_entries where id=p_knowledge_id and deleted_at is null;
  if k.id is null then raise exception 'knowledge_not_found'; end if;
  if nullif(btrim(k.title),'') is null or nullif(btrim(k.summary),'') is null or nullif(btrim(k.steps),'') is null or nullif(btrim(k.conclusions),'') is null or nullif(btrim(k.limitations),'') is null then raise exception 'knowledge_fields_required'; end if;
  select coalesce(max(revision_no),0)+1 into next_revision from public.knowledge_revisions where knowledge_id=p_knowledge_id;
  insert into public.knowledge_revisions(knowledge_id,revision_no,snapshot,editor_id) values (p_knowledge_id,next_revision,to_jsonb(k),auth.uid());
  update public.knowledge_entries set status='published',published_at=now(),edited_by=auth.uid(),needs_review=false,updated_at=now() where id=p_knowledge_id;
  insert into public.forum_activity_events(actor_id,event_type,knowledge_id,first_occurrence) values (auth.uid(),'knowledge_published',p_knowledge_id,k.published_at is null);
  insert into public.operation_audit_logs(actor_id,action,target_type,target_id,after_state) values (auth.uid(),'publish_knowledge','knowledge',p_knowledge_id::text,jsonb_build_object('revision',next_revision));
  return jsonb_build_object('ok',true,'revision',next_revision);
end; $$;
grant execute on function public.publish_knowledge(uuid) to authenticated;

create or replace function public.get_forum_stats(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.current_user_is_operator() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'new_submissions', (select count(*) from public.forum_activity_events where event_type='post_submitted' and first_occurrence and created_at >= p_from and created_at < p_to),
    'new_replies', (select count(*) from public.forum_activity_events where event_type='reply_created' and created_at >= p_from and created_at < p_to),
    'active_members', (select count(distinct actor_id) from public.forum_activity_events where event_type in ('post_submitted','reply_created','vote') and created_at >= p_from and created_at < p_to),
    'new_knowledge', (select count(*) from public.forum_activity_events where event_type='knowledge_published' and first_occurrence and created_at >= p_from and created_at < p_to),
    'pending', (select count(*) from public.posts where status='pending' and deleted_at is null),
    'product_clicks', (select count(*) from public.product_click_events where clicked_at >= p_from and clicked_at < p_to)
  ) into result;
  return result;
end; $$;
grant execute on function public.get_forum_stats(timestamptz,timestamptz) to authenticated;

create or replace function public.log_product_click(p_content_type text, p_content_id text, p_product_type text, p_product_id text, p_session_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare link_exists boolean; product_exists boolean; inserted_count integer;
begin
  if p_content_type not in ('post','knowledge') or p_product_type not in ('skill','agent') or char_length(p_session_hash) < 8 then raise exception 'invalid_click'; end if;
  select exists(select 1 from public.content_product_links l where l.content_type=p_content_type and l.content_id=p_content_id and l.product_type=p_product_type and l.product_id=p_product_id) into link_exists;
  if not link_exists then raise exception 'invalid_link'; end if;
  if p_product_type='skill' then select exists(select 1 from public.skills where id::text=p_product_id) into product_exists; else select exists(select 1 from public.agents where id::text=p_product_id) into product_exists; end if;
  if not product_exists then raise exception 'product_unavailable'; end if;
  insert into public.product_click_events(content_type,content_id,product_type,product_id,session_hash) values (p_content_type,p_content_id,p_product_type,p_product_id,p_session_hash) on conflict do nothing;
  get diagnostics inserted_count = row_count;
  return jsonb_build_object('ok',true,'counted',inserted_count=1);
end; $$;
grant execute on function public.log_product_click(text,text,text,text,text) to anon, authenticated;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  update public.notifications set read_at=coalesce(read_at,now()) where id=p_notification_id and user_id=auth.uid() returning jsonb_build_object('ok',true);
$$;
grant execute on function public.mark_notification_read(uuid) to authenticated;

-- 来源帖变化传播到知识条目；隐藏来源不会被知识库绕过。
create or replace function public.sync_knowledge_source_state()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('unpublished','rejected') or new.deleted_at is not null then
    update public.knowledge_entries set status='unpublished',updated_at=now() where source_post_id=new.id and deleted_at is null;
  elsif (new.title is distinct from old.title or new.content is distinct from old.content or new.updated_at is distinct from old.updated_at) then
    update public.knowledge_entries set needs_review=true,updated_at=now() where source_post_id=new.id and status='published' and deleted_at is null;
  end if;
  return new;
end; $$;
drop trigger if exists posts_sync_knowledge_source on public.posts;
create trigger posts_sync_knowledge_source after update on public.posts for each row execute function public.sync_knowledge_source_state();

create or replace function public.sync_post_accepted_reply()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null or new.status <> 'published' then
    update public.posts set accepted_comment_id=null,resolved=false where accepted_comment_id=new.id;
  end if;
  return new;
end; $$;
drop trigger if exists comments_sync_accepted_reply on public.comments;
create trigger comments_sync_accepted_reply after update on public.comments for each row execute function public.sync_post_accepted_reply();

create or replace function public.sync_forum_reply_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.posts where id=new.post_id;
  insert into public.forum_activity_events(actor_id,event_type,post_id) values (new.user_id,'reply_created',new.post_id);
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications(user_id,actor_id,event_key,kind,target_type,target_id,message) values (owner_id,new.user_id,'reply:'||new.id,'reply','post',new.post_id::text,'你的帖子收到新回复。') on conflict do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists comments_forum_activity on public.comments;
create trigger comments_forum_activity after insert on public.comments for each row execute function public.sync_forum_reply_activity();

create or replace function public.prevent_last_admin_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role='admin' and new.role <> 'admin' and (select count(*) from public.user_roles where role='admin') <= 1 then raise exception 'last_admin_protected'; end if;
  return new;
end; $$;
drop trigger if exists user_roles_protect_last_admin on public.user_roles;
create trigger user_roles_protect_last_admin before update on public.user_roles for each row execute function public.prevent_last_admin_change();
