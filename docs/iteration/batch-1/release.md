# 第一批发布记录

## 当前结果

- 状态：未发布。
- 目标演示：`http://47.116.109.213/forum`，当前仍是 `604607f49143700f65bc7ce7b136e209d770beb4`。
- 当前线上 PM2 cwd 已核对为 `/var/www/skillhub/current`，实际 release 为 `/var/www/skillhub/releases/604607f49143700f65bc7ce7b136e209d770beb4`。
- 本地候选 SHA：以交付时 `git rev-parse HEAD` 为准；未推送到 GitHub，未切换线上 current。

## 发布前置

1. 在隔离项目依次执行 `supabase/migrations/20260918000000_forum_batch_1.sql` 和 `supabase/migrations/20260918010000_comment_votes.sql`，确认 posts/comments/votes/comment_votes 行数、抽样正文、投票计数和可恢复备份。
2. 使用隔离 V/U1/U2 完成 AT01–AT22 中的身份、RLS、并发、邮件和性能测试。
3. 在隔离环境演练旧版本回滚与新增列兼容；审核功能尚未启用，本批回滚不涉及审核状态。
4. 本地候选提交推送/传输到服务器后，按 `deploy.sh <40位SHA>` 建 release；禁止直接覆盖 current。

## 回滚

应用回滚目标是当前旧 release `604607f49143700f65bc7ce7b136e209d770beb4`；数据库不执行破坏性反向 SQL。迁移保持新增列兼容，恢复仅通过已验证备份入口。
