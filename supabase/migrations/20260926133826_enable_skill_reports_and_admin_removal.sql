-- 让管理员可从目录中移除已发布 Skill，并允许社区成员举报 Skill。
-- 移除采用软删除：保留作品、讨论关联、上传文件与审计记录，管理员可恢复。

alter table public.skills
  add column if not exists deleted_at timestamptz;

-- 历史遗留的宽松策略允许匿名用户读取所有状态，移除后由下方策略明确公开范围。
drop policy if exists "任何人都能查看 skills" on public.skills;
drop policy if exists "Published skills and author drafts" on public.skills;
create policy "Published skills and author drafts" on public.skills
  for select using (
    (status = 'published' and deleted_at is null)
    or user_id = (select auth.uid())
    or (select public.current_user_is_operator())
  );

alter table public.content_reports
  drop constraint if exists content_reports_target_type_check;
alter table public.content_reports
  add constraint content_reports_target_type_check
  check (target_type in ('post', 'comment', 'knowledge', 'skill'));

create or replace function public.validate_skill_report_target()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.target_type = 'skill' then
    if new.target_id !~ '^[0-9]+$' then raise exception 'invalid_skill_id'; end if;
    if not exists (
      select 1 from public.skills s
      where s.id = new.target_id::bigint
        and s.status = 'published'
        and s.deleted_at is null
    ) then
      raise exception 'skill_not_reportable';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists validate_skill_report_target on public.content_reports;
create trigger validate_skill_report_target
before insert on public.content_reports
for each row execute function public.validate_skill_report_target();

create or replace function public.moderate_skill(p_skill_id bigint, p_decision text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.skills%rowtype;
  actor_role text := public.current_user_role();
  next_status text;
  next_deleted_at timestamptz;
begin
  if actor_role not in ('operator', 'admin') then raise exception 'forbidden'; end if;
  select * into s from public.skills where id = p_skill_id;
  if s.id is null then raise exception 'skill_not_found'; end if;
  if s.user_id = auth.uid() and actor_role <> 'admin' then raise exception 'cannot_moderate_own_skill'; end if;
  if p_decision not in ('approve', 'reject', 'unpublish', 'restore', 'delete') then raise exception 'invalid_decision'; end if;
  if p_decision in ('reject', 'unpublish', 'delete') and nullif(btrim(coalesce(p_reason, '')), '') is null then raise exception 'reason_required'; end if;
  if p_decision in ('approve', 'reject') and s.status <> 'pending' then raise exception 'pending_skill_required'; end if;
  if p_decision in ('unpublish', 'delete') and (s.status <> 'published' or s.deleted_at is not null) then raise exception 'published_skill_required'; end if;
  if p_decision = 'restore' and (s.status <> 'unpublished' or s.deleted_at is null) then raise exception 'deleted_skill_required'; end if;

  next_status := case when p_decision in ('approve', 'restore') then 'published' when p_decision in ('reject', 'unpublish', 'delete') then case when p_decision = 'reject' then 'rejected' else 'unpublished' end end;
  next_deleted_at := case when p_decision = 'delete' then now() when p_decision = 'restore' then null else s.deleted_at end;
  update public.skills
  set status = next_status,
      deleted_at = next_deleted_at,
      published_at = case when next_status = 'published' then coalesce(published_at, now()) else published_at end,
      moderated_by = auth.uid(), moderated_at = now(),
      rejection_reason = case when p_decision = 'reject' then p_reason else null end,
      updated_at = now()
  where id = s.id;

  insert into public.operation_audit_logs(actor_id, action, target_type, target_id, before_state, after_state, reason)
  values (auth.uid(), p_decision, 'skill', s.id::text,
    jsonb_build_object('status', s.status, 'deleted_at', s.deleted_at),
    jsonb_build_object('status', next_status, 'deleted_at', next_deleted_at), p_reason);

  insert into public.notifications(user_id, actor_id, event_key, kind, target_type, target_id, message)
  values (
    s.user_id, auth.uid(), 'skill:' || s.id::text || ':' || next_status || ':' || to_char(now(), 'YYYYMMDDHH24MISSMS'),
    'moderation', 'skill', s.id::text,
    case p_decision
      when 'approve' then '你的 Skill 已通过审核并发布。'
      when 'reject' then '你的 Skill 被驳回：' || p_reason
      when 'restore' then '你的 Skill 已恢复展示。'
      when 'delete' then '你的 Skill 已从公开目录移除：' || p_reason
      else '你的 Skill 已被下架：' || coalesce(p_reason, '请查看审核说明。')
    end
  ) on conflict do nothing;
  return jsonb_build_object('ok', true, 'status', next_status, 'deleted_at', next_deleted_at);
end;
$$;
revoke all on function public.moderate_skill(bigint, text, text) from public;
grant execute on function public.moderate_skill(bigint, text, text) to authenticated;
