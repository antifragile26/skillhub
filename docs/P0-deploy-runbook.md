# P0 演示站部署与回滚手册

适用对象：`antifragile26/skillhub` 的固定 SHA 发布。以下命令在目标服务器 `/var/www/skillhub` 执行；执行前确认 3015 的真实代理/进程归属，不能仅凭端口切换。

## 发布

1. 确认工作目录干净、`.env.local` 在服务器受限位置且必需变量存在；不要打印变量值。
2. 从 GitHub Actions 传入完整 40 位提交 SHA：

```bash
bash /var/www/skillhub/deploy.sh <40位-commit-sha>
```

脚本会 fetch 指定 SHA、建立 `/var/www/skillhub/releases/<sha>`、复制受限环境文件、运行 `npm ci` 与 `npm run build`，然后把 `/var/www/skillhub/current` 切到新 release，并重启 PM2。

3. 发布后检查：

```bash
curl -fsS http://127.0.0.1:3000/api/health
pm2 status skillhub
```

健康检查应返回 `ok=true`、预期 commit SHA 和 Supabase 项目标识；不得把响应中的任何环境变量内容写入日志报告。

## 四步验收

使用公网目标地址和一个从列表实际读到的帖子 ID：

1. 打开 `/forum`，记录状态码、帖子数量和标题。
2. 点击列表中的真实帖子，打开 `/forum/<实际ID>`，核对标题和正文。
3. 打开 `/forum/new`；未登录时按设计进入登录页，登录测试账号后确认表单可见。测试账号和测试内容必须与生产用户隔离。
4. 返回 `/forum`，刷新并再次打开原帖子详情；核对原帖子仍在，且 `posts/comments/skills/agents` 行数没有无法解释的减少。

当前可体验的旁路预览：<https://deploy-preview-1--skillhub-1785163757.netlify.app/forum>。该链接已按上述四步完成浏览器验收；正式 3015 仍需目标服务器访问和切换审批。

触发任一条件即停止验收并回滚：主要页面 5xx、帖子数减少、详情打不开、数据库连接错误、登录/发帖回归失败、health 的 SHA 与发布记录不一致。

## 回滚

发布时保留旧 release。先列出当前与旧版本：

```bash
readlink -f /var/www/skillhub/current
find /var/www/skillhub/releases -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort
```

把 `current` 重新指向验收前的旧目录，再重启并验证：

```bash
ln -sfn /var/www/skillhub/releases/<旧SHA> /var/www/skillhub/current
DEPLOY_COMMIT_SHA=<旧SHA> DEPLOYED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ) pm2 startOrRestart /var/www/skillhub/ecosystem.config.js --update-env
curl -fsS http://127.0.0.1:3000/api/health
pm2 status skillhub
```

不要用回滚代码的方式回滚数据库迁移；数据库恢复只能按 Supabase/管理员已验证的恢复入口执行。

## 已完成备份

- 候选 Supabase 匿名只读快照：`C:\Users\1\Documents\ChatGPT\ai pm\skillhub-backups\20260917-111614`。表行数为 `posts=4`、`comments=1`、`skills=10`、`agents=10`；manifest SHA-256：`cc64f1d6a3b03353cac8b06e4b6d5afa3b3d52847f21aa989cb40a8b31fb0df5`，四个表文件逐一校验通过。
- 代码与部署配置备份：`C:\Users\1\Documents\ChatGPT\ai pm\skillhub-backups\skillhub-source-20260917-111614.zip`，58 个文件可展开读取，SHA-256：`ea2c33cc700f66f74b84e675040363fba3a5fe8ac77fb4ebd5a0b8d9db7f67a3`。
- 以上备份不在 Git 中。它们是候选环境的保护快照，不等同于 3015 原服务的整库/整机备份；后者需目标服务器和数据库管理员权限后补做。
