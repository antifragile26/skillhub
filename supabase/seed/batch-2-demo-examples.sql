-- 第二批隔离演示夹具（不删除真实数据）。
-- 使用前仅需把下方 UUID 替换为已确认的管理员/运营账号 UUID；不要填密码。
-- 该脚本使用 demo_batch2_ 前缀，可重复执行，不会重复创建同名演示内容。

do $$
declare
  v_owner uuid := '00000000-0000-0000-0000-000000000000';
  v_author text;
  v_case_id bigint;
  v_question_id bigint;
  v_comment_id uuid;
  v_knowledge_id uuid;
  v_collection_id uuid;
begin
  if v_owner = '00000000-0000-0000-0000-000000000000' then
    raise exception '请先将 v_owner 替换为已确认的 auth.users.id；本脚本不会自动选择或提权账号';
  end if;
  if not exists (select 1 from auth.users where id = v_owner) then
    raise exception 'v_owner 不存在于 auth.users';
  end if;
  select coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'username', email, '演示运营') into v_author from auth.users where id = v_owner;

  insert into public.posts(title, content, category, content_type, author, user_id, status, case_scenario, case_goal, case_tools_environment, case_steps, case_input_example, case_output_example, case_effects, case_limitations)
  select 'demo_batch2_结构化案例：论坛版本发布验收', '用于验收结构化案例字段、审核、精选和知识沉淀。', 'deployment', 'case', v_author, v_owner, 'published', '需要验证论坛线上发布是否稳定时使用。', '确认迁移、部署、健康检查和回滚路径。', 'Next.js、Supabase、阿里云 ECS、PM2。', '1. 执行迁移；2. 发布构建；3. 检查 /api/health；4. 浏览器验收。', '提交版本号 4fd9e48。', '健康检查返回 ok=true。', '将发布验收步骤沉淀为可复用案例。', '必须保留上一版 release，数据库迁移不能回滚删除真实数据。'
  where not exists (select 1 from public.posts where title = 'demo_batch2_结构化案例：论坛版本发布验收')
  returning id into v_case_id;
  if v_case_id is null then select id into v_case_id from public.posts where title = 'demo_batch2_结构化案例：论坛版本发布验收' limit 1; end if;

  insert into public.posts(title, content, category, content_type, author, user_id, status)
  select 'demo_batch2_问答：如何验证自动审核 Agent？', '建议先用隔离文本验证风险评分，再在运营后台人工确认。', 'question', 'question', v_author, v_owner, 'published'
  where not exists (select 1 from public.posts where title = 'demo_batch2_问答：如何验证自动审核 Agent？')
  returning id into v_question_id;
  if v_question_id is null then select id into v_question_id from public.posts where title = 'demo_batch2_问答：如何验证自动审核 Agent？' limit 1; end if;

  insert into public.comments(post_id, user_id, author, content, status)
  select v_question_id, v_owner, v_author, 'demo_batch2_示例回复：使用“博彩 加微信 https://example.invalid”作为隔离高风险样本，确认进入人工队列。', 'published'
  where not exists (select 1 from public.comments where post_id = v_question_id and content like 'demo_batch2_%')
  returning id into v_comment_id;

  insert into public.knowledge_entries(title, summary, scenario, steps, conclusions, limitations, tags, source_post_id, source_author, status, edited_by)
  select 'demo_batch2_论坛发布验收清单', '用于演示知识库发布、来源追踪和专题归档。', '论坛版本交付前的运营验收。', '检查数据库迁移、页面路由、健康检查、审核队列和回滚 release。', '完成隔离验收后再开放真实运营。', '示例数据仅用于演示，不代表真实业务结论。', array['演示','发布','审核'], v_case_id, v_author, 'published', v_owner
  where not exists (select 1 from public.knowledge_entries where title = 'demo_batch2_论坛发布验收清单')
  returning id into v_knowledge_id;
  if v_knowledge_id is null then select id into v_knowledge_id from public.knowledge_entries where title = 'demo_batch2_论坛发布验收清单' limit 1; end if;

  insert into public.knowledge_collections(name, description, status, created_by)
  select 'demo_batch2_运营验收专题', '汇总审核、自动审核、知识沉淀和发布回滚示例。', 'published', v_owner
  where not exists (select 1 from public.knowledge_collections where name = 'demo_batch2_运营验收专题')
  returning id into v_collection_id;
  if v_collection_id is null then select id into v_collection_id from public.knowledge_collections where name = 'demo_batch2_运营验收专题' limit 1; end if;

  insert into public.knowledge_collection_items(collection_id, knowledge_id, position)
  select v_collection_id, v_knowledge_id, 1
  where not exists (select 1 from public.knowledge_collection_items where collection_id = v_collection_id and knowledge_id = v_knowledge_id);
end $$;
