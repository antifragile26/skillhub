-- 将已存在的真实社区帖子整理为有来源的知识条目，并通知已确认的管理员。
-- 不创建虚构帖子、举报或违规指控；条目标记 needs_review，要求管理员核验来源细节。
-- 可重复执行，不修改或删除原帖。

do $$
declare
  source_post public.posts%rowtype;
  admin_id uuid;
  knowledge_id uuid;
  item_title text := '从 GitHub 恢复论坛项目并部署到阿里云 ECS';
begin
  select id into admin_id
  from auth.users
  where lower(email) = lower('gugewang332@gmail.com')
  limit 1;
  if admin_id is null then
    raise exception '指定管理员账号不存在于 Supabase auth.users';
  end if;
  if not exists (select 1 from public.user_roles where user_id = admin_id and role = 'admin') then
    raise exception '指定账号尚未配置为 admin；为避免通知发错对象，已停止写入';
  end if;

  select * into source_post
  from public.posts
  where title = '我用 AI Agent 完成了一次论坛项目的部署与恢复'
    and status = 'published'
    and deleted_at is null
    and nullif(btrim(content), '') is not null
  order by created_at desc
  limit 1;
  if source_post.id is null then
    raise exception '未找到可用的已发布来源帖子；未创建知识或通知';
  end if;

  select id into knowledge_id
  from public.knowledge_entries
  where source_post_id = source_post.id and deleted_at is null
  limit 1;

  if knowledge_id is null then
    insert into public.knowledge_entries(
      title, summary, scenario, steps, conclusions, limitations, tags,
      source_post_id, source_author, source_version_at, status, needs_review,
      edited_by, published_at
    ) values (
      item_title,
      '根据社区作者已发布的帖子整理：作者说明在更换电脑后，从 GitHub 找回项目代码，补齐 Supabase 配置，并将项目部署到阿里云 ECS。',
      '更换开发设备后，需要从已有代码托管仓库恢复项目并重新部署。',
      '1. 从已有 GitHub 仓库重新拉取项目代码。\n2. 补齐该项目所需的 Supabase 配置。\n3. 将项目部署到阿里云 ECS。',
      '来源帖子记录了项目恢复、配置补齐和 ECS 部署均已完成。',
      '来源帖子未提供具体命令、依赖版本、配置项内容或 ECS 发布参数；本条目不补写未被来源证实的操作细节，复用前请管理员核验。',
      array['项目恢复','Supabase','阿里云 ECS'],
      source_post.id, source_post.author, coalesce(source_post.updated_at, source_post.created_at),
      'published', true, admin_id, now()
    ) returning id into knowledge_id;
  end if;

  insert into public.notifications(user_id, actor_id, event_key, kind, target_type, target_id, message)
  values
    (admin_id, admin_id, 'curated-knowledge-source-review:' || knowledge_id, 'knowledge', 'knowledge', knowledge_id::text,
     '有一条基于真实论坛帖子整理的知识条目待核验来源细节。条目已注明原帖及未确认信息。'),
    (admin_id, admin_id, 'curated-knowledge-published:' || knowledge_id, 'knowledge', 'knowledge', knowledge_id::text,
     '知识库已新增《从 GitHub 恢复论坛项目并部署到阿里云 ECS》，可查看来源并补充经核实的步骤。')
  on conflict (user_id, event_key) do nothing;
end $$;

-- 清理旧按钮可能调用的演示夹具函数；不会触碰任何数据行。
drop function if exists public.seed_demo_batch2_examples();
notify pgrst, 'reload schema';
