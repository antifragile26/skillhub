# 第二批进度

更新时间：2026-09-18（Asia/Shanghai）

## 当前状态

- 开发：核心数据库兼容层、论坛审核状态、案例/问答、知识库/专题、通知、产品关联和运营后台已实现，候选提交 `5954e937f3f89d6fd370d2903b4851fc7d223b16`。
- 测试：本地 lint、TypeScript、生产构建、线上路由和健康检查已通过；真实角色/RLS/并发/完整浏览器链路尚未通过。
- 发布：候选已通过授权 SCP 发布到演示环境；线上健康检查报告提交 `5954e937f3f89d6fd370d2903b4851fc7d223b16`，PM2 online。

## 已完成

- 新增 `20260918020000_batch_2_operations.sql`：角色、禁言、审核状态、举报、审计、精选置顶、案例字段、采纳、知识、专题、产品关联、通知、活动统计和受保护函数。
- 新帖提交进入待审核；驳回稿可编辑重提；已发布内容修改后进入待审核；公开读取由数据库状态控制。
- 新增 `/knowledge`、`/knowledge/[id]`、`/collections`、`/collections/[id]`、`/notifications`、`/admin`。
- 后台包含审核、举报、精选/置顶、知识草稿编辑/发布、专题维护、产品关联、角色/禁言和基础统计入口。
- 论坛支持结构化案例字段、问题采纳、举报和内容状态标识。

## 已核验的线上数据库证据

- 迁移已在 Supabase 项目 `klkpnrkmfsvelghzplvw` 的 SQL Editor 执行。
- 只读核验发现 `user_roles`、`knowledge_entries`、`notifications` 表存在，`moderate_post` 函数存在。
- 执行后数据量快照：posts=5、comments=2、post_votes=2、comment_votes=0、user_roles=0、knowledge_entries=0。
- RLS 策略数量：comments=5、content_reports=3、knowledge_entries=3、notifications=2、posts=5、user_roles=2。
- 已提交私有 schema 快照动作；由于 Supabase 页面在动作后响应超时，快照结果未独立读取确认，不能把它标记为已验证备份。

## 当前阻塞

1. 没有用户明确指定的管理员/运营账号，不能自动给未知账号授予角色；因此 BT01/BT02、后台真实操作和完整链路无法判通过。
3. 没有隔离 U1/U2/O/M、邮件捕获和性能夹具；BT03–BT27 的真实身份、RLS、并发、通知、统计和性能证据待补。
4. 私有回滚快照的 UI 结果未完成独立确认；应用回滚 release 已保留，但数据库新增结构不做反向删除。
5. GitHub HTTPS 推送曾出现连接重置；本次通过授权 SCP 发布，未声称已推送 GitHub。

## 下一步

由用户在安全入口确认一个管理员和一个运营测试账号后，完成隔离验收；再补做私有快照结果确认和 BT01–BT27/第一批受影响回归。
