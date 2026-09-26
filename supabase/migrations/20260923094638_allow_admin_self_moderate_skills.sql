-- 管理员可审核自己上传的测试 Skill；运营仍不能自审。
-- 这样便于管理员验收上传、审核和发布闭环，同时保留普通运营的相互审核约束。
create or replace function public.moderate_skill(p_skill_id bigint, p_decision text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.skills%rowtype;
  next_status text;
  actor_role text := public.current_user_role();
begin
  if actor_role not in ('operator', 'admin') then raise exception 'forbidden'; end if;
  select * into s from public.skills where id = p_skill_id;
  if s.id is null then raise exception 'skill_not_found'; end if;
  if s.user_id = auth.uid() and actor_role <> 'admin' then raise exception 'cannot_moderate_own_skill'; end if;
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
