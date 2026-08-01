-- 补全 UPDATE/DELETE 的 RLS 策略。
-- 背景：20260728 的迁移给 agents/skills/posts 授予了 update/delete 权限，
-- 但只写了 INSERT 策略。RLS 开启后，无匹配策略的写操作会被静默拒绝，
-- 导致详情页的删除按钮（agents/skills/posts）失效。
-- 全部幂等，可在 Supabase SQL Editor 反复执行。

-- ---------- agents ----------
drop policy if exists "Users can update their own agents" on public.agents;
create policy "Users can update their own agents"
  on public.agents for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own agents" on public.agents;
create policy "Users can delete their own agents"
  on public.agents for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- skills ----------
drop policy if exists "Users can update their own skills" on public.skills;
create policy "Users can update their own skills"
  on public.skills for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own skills" on public.skills;
create policy "Users can delete their own skills"
  on public.skills for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- posts ----------
drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
  on public.posts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
  on public.posts for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- votes（投票功能依赖，若线上已手动建过策略这里会覆盖为一致版本） ----------
-- votes 表当前不在仓库迁移里（手动建的）。以下先确保 RLS 打开并授权，
-- 再补齐 select/insert/update/delete 策略。若表结构字段名不同（如没有 user_id），
-- 执行会报错——那种情况把报错发我，按实际字段调整。
alter table if exists public.votes enable row level security;
grant select on public.votes to anon, authenticated;
grant insert, update, delete on public.votes to authenticated;

drop policy if exists "Anyone can read votes" on public.votes;
create policy "Anyone can read votes"
  on public.votes for select using (true);

drop policy if exists "Users can add their own votes" on public.votes;
create policy "Users can add their own votes"
  on public.votes for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own votes" on public.votes;
create policy "Users can update their own votes"
  on public.votes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own votes" on public.votes;
create policy "Users can delete their own votes"
  on public.votes for delete to authenticated
  using ((select auth.uid()) = user_id);
