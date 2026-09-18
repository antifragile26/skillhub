# 第一批基线

## 代码与线上

- 工作目录：`C:/Users/1/Documents/ChatGPT/ai pm/skillhub`
- 本地 HEAD：`32c6476`（`codex/p0-demo-alignment`）
- `origin/codex/p0-demo-alignment`：`604607f49143700f65bc7ce7b136e209d770beb4`
- `origin/HEAD`：`217da8b17012547ba66b7c3a03ed3ea616aa8631`
- 线上 `http://47.116.109.213/api/health`：HTTP 200，commit `604607f49143700f65bc7ce7b136e209d770beb4`，Supabase project `klkpnrkmfsvelghzplvw`。
- 线上 PM2 `skillhub` cwd：`/var/www/skillhub/current`；current 实际指向 `/var/www/skillhub/releases/604607f49143700f65bc7ce7b136e209d770beb4`。

## 工作区保护

执行前已有 4 个任务书/计划文档未跟踪：`docs/ai-iteration-*.md` 和 `docs/forum-requirements-and-acceptance-plan.md`。这些文件保留，不覆盖、不纳入本批代码提交，除非用户另行要求。

## 现状缺陷复现

- 原论坛在客户端读取整表后过滤/排序，没有服务端分页或 URL 筛选。
- 原发帖只做前端空值判断，直接写 `posts`，无请求幂等和限流。
- 原回复和投票直接写表，存在快速点击/失败重试造成重复或乐观计数不一致的风险。
- 原帖子和回复只支持明文展示，未提供 Markdown 安全渲染、编辑或软删除。
- 原登录固定跳首页，无安全 returnTo；没有找回/重设页面。
- 线上匿名只读抽样：`posts`、`comments`、`votes` 均可读；不能由匿名证据推断 RLS 写策略、触发器和迁移已执行。

## 数据边界

本轮没有向线上写入帖子、回复、投票、账号或测试数据。未把任何密钥、Cookie 或私钥写入报告。
