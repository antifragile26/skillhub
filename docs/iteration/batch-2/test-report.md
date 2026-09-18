# 第二批测试报告

提交 SHA：`5954e937f3f89d6fd370d2903b4851fc7d223b16`。环境：Windows 本地工作区、Supabase 项目 `klkpnrkmfsvelghzplvw`、阿里云演示环境。

## 已执行

| 检查 | 结果 | 证据 |
|---|---|---|
| `npm run lint` | 通过 | 本地命令退出码 0 |
| `npx tsc --noEmit` | 通过 | 本地命令退出码 0 |
| `npm run build` | 通过 | Next.js 16.2.12，新增 6 个第二批路由进入构建 |
| 本地路由冒烟 | 通过 | `/knowledge`、`/collections`、`/notifications`、`/admin`、`/forum`、`/forum/new` 均 HTTP 200；未写入数据库 |
| SQL 迁移 | 通过（结构核验） | SQL Editor 已执行；`user_roles`、`knowledge_entries`、`notifications` 表和 `moderate_post` 函数存在 |
| 迁移后数据保全 | 通过 | 迁移后读取到 posts=5、comments=2、post_votes=2、comment_votes=0；私有 schema 四张快照表执行成功，Supabase 显示 “Success. No rows returned”，并启用 RLS |
| RLS 结构核验 | 通过（结构） | 目标表策略数量已读取；尚未用隔离账号做行为验收 |
| 线上健康检查 | 通过 | `/api/health` 返回 ok=true、commit=`5954e937f3f89d6fd370d2903b4851fc7d223b16` |
| 线上路由冒烟 | 通过 | `/forum`、`/forum/new`、`/knowledge`、`/collections`、`/notifications`、`/admin` 均 HTTP 200 |
| 真实角色/RLS | 阻塞 | `user_roles` 当前为 0；无隔离 O/M/U1/U2 账号 |
| 浏览器完整链路 | 未执行 | 迁移和管理员初始化未满足 |

## BT01–BT27

BT01–BT27 仍为“未执行/阻塞”，不得用代码存在、构建通过或截图有按钮替代真实验收。迁移结构和线上冒烟已完成，但解锁完整验收仍需要隔离角色账号、数据库行为测试和完整链路测试。

## 回归

第一批历史报告仍包含真实身份、RLS、并发、邮件、性能和回滚阻塞；第二批发布前必须重新执行受审核状态影响的第一批用例。
