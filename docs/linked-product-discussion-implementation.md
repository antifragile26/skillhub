# 作品交流闭环实施记录

日期：2026-09-25

## 已实现

- Skill 和 Agent 详情页新增统一的社区讨论模块、最近讨论列表、求助入口和经验分享入口。
- 发帖页支持从查询参数恢复内容类型、作品类型、作品 ID 和安全返回路径。
- 发帖页显示关联作品卡片，并在登录、草稿恢复和提交时保留作品上下文。
- 新帖子通过 `create_forum_post_with_product` 幂等 RPC 在一个事务中创建帖子、作品关联并提交审核。
- 详情页入口传入的内容类型优先于浏览器旧草稿，避免从作品发帖时被旧草稿覆盖。
- 经验分享沿用数据库 `case` 类型，但结构化补充字段改为可选，降低首次分享门槛。
- 帖子详情显示待审核状态，并把关联作品操作明确为返回 Skill / Agent 详情。
- 论坛支持 `productType + productId` 筛选，作品页可进入该作品的全部讨论。
- 帖子首次公开时，作品作者收到去重通知；回复和采纳通知沿用原有机制。

## 数据库迁移

- `20260925081816_linked_product_discussions.sql`
  - 放宽经验分享提交校验。
  - 增加作者创建/删除自己帖子关联的 RLS。
  - 增加事务化发帖 RPC。
  - 增加帖子公开和关联写入时的作品作者通知触发器。
  - 增加按作品查询关联的索引。
- `20260925083049_lock_linked_discussion_function_privileges.sql`
  - 限制新 RPC 仅已登录用户可执行。
  - 限制通知触发器函数不作为客户端 RPC 暴露。

两个迁移已应用到 Supabase 项目 `klkpnrkmfsvelghzplvw`。

## 验证结果

- `npx tsc --noEmit`：通过。
- `npm run build`：通过，Next.js 16.2.12 生成成功。
- `npm run lint`：本次改动文件无新增 lint 错误；项目原有 `src/app/admin/skills/page.tsx` 和 `src/app/my-skills/page.tsx` 各有一个 `react-hooks/set-state-in-effect` 错误。
- 数据库验证：新 RPC 为 `SECURITY INVOKER`；关联表 RLS、作品关联索引、两个通知触发器均已存在。
- 权限验证：`create_forum_post_with_product` 仅 `authenticated` 可执行；通知函数和触发器函数对 `anon`、`authenticated` 均不可执行。
- 当前数据库统计：5 个帖子、5 个已发布帖子、0 个作品关联、3 条通知；没有创建伪造测试数据。

## 尚未完成

- 尚未用两个隔离登录账号完成真实的“发帖 → 审核 → 作者通知 → 回复”浏览器写入验收；当前没有安全可用的测试账号。
- 已部署到正式演示站：`http://47.116.109.213/`。
- 当前线上 commit：`de7e70c88f86821c4700feae0b9b9e1f98784042`；health 返回 `ok=true`，部署时间为 `2026-09-25T08:51:00Z`。
- 公网匿名验收：首页、Skills、Agents、Forum、发帖页、作品筛选论坛和 `/api/health` 均返回 HTTP 200。

## Advisor 说明

Supabase advisors 仍报告项目历史遗留的 `SECURITY DEFINER` 可执行权限、重复 permissive policy 和 RLS 性能告警。本次新增的普通用户关联策略与既有运营全权限策略会形成重复 permissive policy，属于当前授权模型的已知告警；本轮已限制新函数的客户端执行权限，没有扩大其他历史函数的权限范围。
