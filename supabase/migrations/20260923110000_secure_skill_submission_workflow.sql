-- Skill 上传、审核和私有包下载。
-- 只新增字段、策略和函数；已有 Skill 保持已发布，旧 packages bucket 不迁移或删除。

alter table public.skills add column if not exists status text not null default 'draft';
alter table public.skills add column if not exists storage_bucket text not null default 'packages';
alter table public.skills add column if not exists readme text;
alter table public.skills add column if not exists license text;
alter table public.skills add column if not exists platforms text[] not null default '{}';
alter table public.skills add column if not exists package_name text;
alter table public.skills add column if not exists package_size bigint;
alter table public.skills add column if not exists package_sha256 text;
alter table public.skills add column if not exists package_manifest jsonb not null default '{}'::jsonb;
alter table public.skills add column if not exists submitted_at timestamptz;
alter table public.skills add column if not exists published_at timestamptz;
alter table public.skills add column if not exists moderated_by uuid references auth.users(id) on delete set null;
alter table public.skills add column if not exists moderated_at timestamptz;
alter table public.skills add column if not exists rejection_reason text;
alter table public.skills add column if not exists updated_at timestamptz not null default now();

alter table public.skills drop constraint if exists skills_status_check;
alter table public.skills add constraint skills_status_check check (status in ('draft', 'pending', 'published', 'rejected', 'unpublished'));
alter table public.skills drop constraint if exists skills_storage_bucket_check;
alter table public.skills add constraint skills_storage_bucket_check check (storage_bucket in ('packages', 'skill-packages'));
alter table public.skills drop constraint if exists skills_package_size_check;
alter table public.skills add constraint skills_package_size_check check (package_size is null or package_size > 0);

-- 本迁移前的 Skill 曾经直接公开展示，因此保留它们的对外可见性。
update public.skills
set status = 'published',
    storage_bucket = coalesce(nullif(storage_bucket, ''), 'packages'),
    published_at = coalesce(published_at, created_at, now()),
    updated_at = coalesce(updated_at, now())
where status is null or status = '' or status = 'draft';

create index if not exists skills_public_listing_idx on public.skills (status, created_at desc, id desc);
create index if not exists skills_file_path_idx on public.skills (storage_bucket, file_path) where file_path is not null;
create index if not exists skills_user_status_idx on public.skills (user_id, status, updated_at desc);

-- 公开目录仅返回已经发布的内容；作者和运营仍可看到其工作流内容。
drop policy if exists "Anyone can read skills" on public.skills;
drop policy if exists "Published skills and author drafts" on public.skills;
create policy "Published skills and author drafts" on public.skills
  for select using (
    status = 'published'
    or user_id = (select auth.uid())
    or (select public.current_user_is_operator())
  );

drop policy if exists "Authenticated users can add their skills" on public.skills;
drop policy if exists "Authors create skill drafts" on public.skills;
create policy "Authors create skill drafts" on public.skills
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'draft'
    and storage_bucket in ('packages', 'skill-packages')
  );

-- 作者只能在草稿状态直接改动；提交、审核和发布统一走受保护函数。
drop policy if exists "Users can update their own skills" on public.skills;
drop policy if exists "Authors update skill drafts" on public.skills;
create policy "Authors update skill drafts" on public.skills
  for update to authenticated
  using (user_id = (select auth.uid()) and status in ('draft', 'rejected'))
  with check (user_id = (select auth.uid()) and status = 'draft');

drop policy if exists "Users can delete their own skills" on public.skills;
drop policy if exists "Authors delete unsubmitted skills" on public.skills;
create policy "Authors delete unsubmitted skills" on public.skills
  for delete to authenticated
  using (user_id = (select auth.uid()) and status in ('draft', 'rejected'));

-- 新 Skill 包独立私有 bucket。即便用户猜到对象路径，待审核包也无法直接读取。
insert into storage.buckets (id, name, public)
values ('skill-packages', 'skill-packages', false)
on conflict (id) do update set public = false;

drop policy if exists "Skill package visible by publication" on storage.objects;
create policy "Skill package visible by publication" on storage.objects
  for select using (
    bucket_id = 'skill-packages'
    and exists (
      select 1 from public.skills s
      where s.storage_bucket = 'skill-packages'
        and s.file_path = storage.objects.name
        and (
          s.status = 'published'
          or s.user_id = (select auth.uid())
          or (select public.current_user_is_operator())
        )
    )
  );

drop policy if exists "Skill author package upload" on storage.objects;
create policy "Skill author package upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'skill-packages'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Skill author package delete" on storage.objects;
create policy "Skill author package delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'skill-packages'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create or replace function public.submit_skill_for_review(p_skill_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare s public.skills%rowtype;
begin
  select * into s from public.skills where id = p_skill_id and user_id = auth.uid();
  if s.id is null then raise exception 'skill_not_found'; end if;
  if s.status not in ('draft', 'rejected') then raise exception 'skill_not_submittable'; end if;
  if nullif(btrim(s.name), '') is null or nullif(btrim(s.description), '') is null then raise exception 'skill_metadata_required'; end if;
  if nullif(btrim(s.file_path), '') is null or s.storage_bucket <> 'skill-packages' then raise exception 'skill_package_required'; end if;
  if nullif(btrim(s.readme), '') is null then raise exception 'skill_readme_required'; end if;

  update public.skills
  set status = 'pending', submitted_at = now(), rejection_reason = null, updated_at = now()
  where id = s.id;
  return jsonb_build_object('ok', true, 'status', 'pending');
end;
$$;
revoke all on function public.submit_skill_for_review(bigint) from public;
grant execute on function public.submit_skill_for_review(bigint) to authenticated;

create or replace function public.moderate_skill(p_skill_id bigint, p_decision text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare s public.skills%rowtype; next_status text;
begin
  if not public.current_user_is_operator() then raise exception 'forbidden'; end if;
  select * into s from public.skills where id = p_skill_id;
  if s.id is null then raise exception 'skill_not_found'; end if;
  if s.user_id = auth.uid() then raise exception 'cannot_moderate_own_skill'; end if;
  if p_decision not in ('approve', 'reject', 'unpublish', 'restore') then raise exception 'invalid_decision'; end if;
  if p_decision in ('reject', 'unpublish') and nullif(btrim(coalesce(p_reason, '')), '') is null then raise exception 'reason_required'; end if;
  if p_decision in ('approve', 'reject') and s.status <> 'pending' then raise exception 'pending_skill_required'; end if;
  if p_decision = 'unpublish' and s.status <> 'published' then raise exception 'published_skill_required'; end if;
  if p_decision = 'restore' and s.status <> 'unpublished' then raise exception 'unpublished_skill_required'; end if;

  next_status := case p_decision when 'approve' then 'published' when 'reject' then 'rejected' when 'unpublish' then 'unpublished' else 'published' end;
  update public.skills
  set status = next_status,
      published_at = case when next_status = 'published' then coalesce(published_at, now()) else published_at end,
      moderated_by = auth.uid(), moderated_at = now(),
      rejection_reason = case when p_decision = 'reject' then p_reason else null end,
      updated_at = now()
  where id = s.id;

  if to_regclass('public.operation_audit_logs') is not null then
    insert into public.operation_audit_logs(actor_id, action, target_type, target_id, before_state, after_state, reason)
    values (auth.uid(), p_decision, 'skill', s.id::text, jsonb_build_object('status', s.status), jsonb_build_object('status', next_status), p_reason);
  end if;

  if to_regclass('public.notifications') is not null then
    insert into public.notifications(user_id, actor_id, event_key, kind, target_type, target_id, message)
    values (
      s.user_id, auth.uid(), 'skill:' || s.id::text || ':' || next_status || ':' || to_char(now(), 'YYYYMMDDHH24MISSMS'),
      'moderation', 'skill', s.id::text,
      case next_status when 'published' then '你的 Skill 已通过审核并发布。' when 'rejected' then '你的 Skill 被驳回：' || p_reason else '你的 Skill 已被下架：' || coalesce(p_reason, '请查看审核说明。') end
    ) on conflict do nothing;
  end if;
  return jsonb_build_object('ok', true, 'status', next_status);
end;
$$;
revoke all on function public.moderate_skill(bigint, text, text) from public;
grant execute on function public.moderate_skill(bigint, text, text) to authenticated;

-- 旧函数可被匿名调用且会给任意 id 计数；替换为只允许已发布内容（或作者/运营预览）计数。
create or replace function public.increment_skill_downloads(skill_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare s public.skills%rowtype;
begin
  select * into s from public.skills where id = skill_id;
  if s.id is null then raise exception 'skill_not_found'; end if;
  if not (s.status = 'published' or s.user_id = auth.uid() or public.current_user_is_operator()) then raise exception 'skill_not_available'; end if;
  update public.skills set downloads = coalesce(downloads, 0) + 1, updated_at = now() where id = s.id;
end;
$$;
revoke all on function public.increment_skill_downloads(bigint) from public;
grant execute on function public.increment_skill_downloads(bigint) to anon, authenticated;
