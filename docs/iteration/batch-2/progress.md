# 第二批进度

更新时间：2026-09-18（Asia/Shanghai）

## 当前状态

- 开发：核心数据库兼容层、论坛审核状态、案例/问答、知识库/专题、通知、产品关联、运营后台和自动审核 Agent v1 已实现；本轮补齐回复某人、案例详情、同类推荐、帖子页产品点击、运营审计入口和后台筛选分页，应用提交 `86af342`。
- 测试：本地 lint、TypeScript、生产构建、线上路由和健康检查已通过；真实角色/RLS/并发/完整浏览器链路尚未通过。
- 发布：应用已通过授权 SCP 发布到演示环境；线上健康检查报告提交 `86af342`，PM2 online；上一版 `72a012a` 已保留，可按发布手册回滚。

## 已完成

- 新增 `20260918020000_batch_2_operations.sql`：角色、禁言、审核状态、举报、审计、精选置顶、案例字段、采纳、知识、专题、产品关联、通知、活动统计和受保护函数。
- 新帖提交进入待审核；驳回稿可编辑重提；已发布内容修改后进入待审核；公开读取由数据库状态控制。
- 新增 `/knowledge`、`/knowledge/[id]`、`/collections`、`/collections/[id]`、`/notifications`、`/admin`。
- 后台包含审核、举报、精选/置顶、知识草稿编辑/发布、专题维护、产品关联、角色/禁言和基础统计入口。
- 新增 `/admin/audit` 运营审计日志入口，后台审核列表支持状态、内容类型、作者筛选与分页。
- 论坛支持结构化案例字段详情展示、问题采纳、单层回复某人、举报和内容状态标识；帖子详情支持关联 Skill/Agent 展示与点击统计、无向量时按同分类最新内容推荐。
- 新增 `supabase/seed/batch-2-demo-examples.sql` 隔离演示夹具，覆盖案例、问答回复、知识条目和专题；需先填入已确认的管理员/运营 UUID，不会自动选人或提权。

## 已核验的线上数据库证据

- 迁移已在 Supabase 项目 `klkpnrkmfsvelghzplvw` 的 SQL Editor 执行。
- 只读核验发现 `user_roles`、`knowledge_entries`、`notifications` 表存在，`moderate_post` 函数存在。
- 执行后数据量快照：posts=5、comments=2、post_votes=2、comment_votes=0、user_roles=0、knowledge_entries=0。
- RLS 策略数量：comments=5、content_reports=3、knowledge_entries=3、notifications=2、posts=5、user_roles=2。
- 私有 schema 快照已执行成功，Supabase 显示 “Success. No rows returned”，并启用 RLS；表名为 `private.skillhub_batch2_20260918_posts`、`_comments`、`_votes`、`_comment_votes`，未授权给 `public/anon/authenticated`。
- 自动审核迁移 `20260918030000_automated_moderation_agent.sql` 已执行成功；核验到自动审核记录表、评分函数、人工队列函数和 2 个触发器存在。测试文本被判定为 `flagged`，风险分 100。

## 当前阻塞

1. 没有用户明确指定的管理员/运营账号，不能自动给未知账号授予角色；因此 BT01/BT02、后台真实操作和完整链路无法判通过。
3. 没有隔离 U1/U2/O/M、邮件捕获和性能夹具；BT03–BT27 的真实身份、RLS、并发、通知、统计和性能证据待补。
4. 应用回滚 release 已保留；数据库新增结构不做反向删除，按兼容回滚策略处理。
5. GitHub HTTPS 推送曾出现连接重置；本次通过授权 SCP 发布，未声称已推送 GitHub。

## 自动审核 Agent

- 低风险帖子自动发布；高风险帖子保留在 `/admin` 待审核。
- 高风险回复不公开展示，保留原记录并进入 `/admin/moderation` 队列。
- Agent 只做规则初筛，不拥有管理员角色；运营人员仍负责最终通过/驳回。

## 下一步

由用户在安全入口确认一个管理员和一个运营测试账号后，完成隔离验收；再补做私有快照结果确认和 BT01–BT27/第一批受影响回归。
