# 第二批基线

- 仓库：`C:/Users/1/Documents/ChatGPT/ai pm/skillhub`
- 分支：`codex/p0-demo-alignment`
- 当前本地候选：以第二批实现提交为准（未发布前不在此预填 SHA）
- 当前线上：`http://47.116.109.213/forum`
- 线上已发布第一批：`4fd9e485d672c69b91f4e4ba46843c5f00134447`
- Supabase 项目：`klkpnrkmfsvelghzplvw`
- 运行方式：Nginx 80 → PM2 `skillhub` → `/var/www/skillhub/current`
- 回滚目标：上一稳定 release `4fd9e485d672c69b91f4e4ba46843c5f00134447`；数据库只允许兼容回滚，不执行破坏性反向迁移。

## 原始缺口

第一批只有帖子/回复/投票和内容目录，没有角色、审核状态、举报、审计、知识、专题、通知、产品点击和后台。第二批实现以现有 `posts`、`comments`、`skills`、`agents` 表为基础演进，不重建内容系统。

## 数据安全

未在真实演示数据中创建测试账号或测试内容；迁移新增列/表/函数，未删除正文、用户、帖子、回复或投票。
