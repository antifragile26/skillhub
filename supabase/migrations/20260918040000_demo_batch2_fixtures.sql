-- 可重复的第二批演示夹具。仅允许 operator/admin 主动调用，不自动创建账号或提升权限。
create or replace function public.seed_demo_batch2_examples()
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare
  owner_id uuid := auth.uid();
  author_name text;
  case_id bigint;
  violation_id bigint;
  knowledge_id uuid;
  collection_id uuid;
begin
  if not public.current_user_is_operator() then raise exception 'forbidden'; end if;
  select coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'username', email, '演示运营') into author_name from auth.users where id = owner_id;

  select id into case_id from public.posts where user_id = owner_id and title = 'demo_batch2_结构化案例示例' limit 1;
  if case_id is null then
    insert into public.posts(title, content, category, content_type, author, user_id, status, case_scenario, case_goal, case_tools_environment, case_steps, case_input_example, case_output_example, case_effects, case_limitations)
    values ('demo_batch2_结构化案例示例', '这是用于验收知识沉淀和专题展示的安全演示帖子。', 'deployment', 'case', author_name, owner_id, 'published', '演示论坛版本验收。', '验证审核、知识库和专题链路。', 'Next.js、Supabase、阿里云 ECS。', '执行迁移、部署、健康检查和浏览器验收。', '提交版本号。', '健康检查返回 ok=true。', '形成可复用验收清单。', '只用于演示，不代表真实业务结论。')
    returning id into case_id;
  end if;

  select id into violation_id from public.posts where user_id = owner_id and title = 'demo_batch2_待处理违规示例' limit 1;
  if violation_id is null then
    insert into public.posts(title, content, category, content_type, author, user_id, status)
    values ('demo_batch2_待处理违规示例', '演示自动审核：博彩 加微信 https://example.invalid；请在后台审核后驳回或下架。', 'other', 'discussion', author_name, owner_id, 'pending')
    returning id into violation_id;
  end if;

  select id into knowledge_id from public.knowledge_entries where title = 'demo_batch2_审核与发布验收知识' limit 1;
  if knowledge_id is null then
    insert into public.knowledge_entries(title, summary, scenario, steps, conclusions, limitations, tags, source_post_id, source_author, source_version_at, status, needs_review, edited_by, published_at)
    values ('demo_batch2_审核与发布验收知识', '用于演示知识库、来源追踪和专题归档。', '论坛版本发布前的运营验收。', '1. 检查审核队列；2. 处理举报；3. 发布合规知识；4. 核对通知和回滚版本。', '审核链路和知识沉淀均可在后台完成。', '示例内容仅供演示，不替代真实审核结论。', array['演示','审核','发布'], case_id, author_name, now(), 'published', false, owner_id, now())
    returning id into knowledge_id;
  end if;

  select id into collection_id from public.knowledge_collections where name = 'demo_batch2_审核运营专题' limit 1;
  if collection_id is null then
    insert into public.knowledge_collections(name, description, status, created_by) values ('demo_batch2_审核运营专题', '审核、通知、知识发布和回滚验收示例。', 'published', owner_id) returning id into collection_id;
  end if;
  insert into public.knowledge_collection_items(collection_id, knowledge_id, position) values (collection_id, knowledge_id, 1) on conflict do nothing;

  insert into public.content_reports(reporter_id, target_type, target_id, reason, status)
  values (owner_id, 'post', violation_id::text, '演示举报：命中高风险词、联系方式和外链规则。', 'open')
  on conflict (reporter_id, target_type, target_id) where status = 'open' do nothing;

  insert into public.notifications(user_id, actor_id, event_key, kind, target_type, target_id, message)
  values
    (owner_id, owner_id, 'demo_batch2:moderation:' || violation_id, 'moderation', 'post', violation_id::text, '演示通知：有一条疑似违规帖子需要你处理。'),
    (owner_id, owner_id, 'demo_batch2:knowledge:' || knowledge_id, 'knowledge', 'knowledge', knowledge_id::text, '演示通知：审核验收知识已发布到知识库。'),
    (owner_id, owner_id, 'demo_batch2:report:' || violation_id, 'report', 'post', violation_id::text, '演示通知：举报队列新增一条待处理记录。')
  on conflict (user_id, event_key) do nothing;

  return jsonb_build_object('ok', true, 'case_post_id', case_id, 'violation_post_id', violation_id, 'knowledge_id', knowledge_id, 'collection_id', collection_id);
end;
$$;
grant execute on function public.seed_demo_batch2_examples() to authenticated;
