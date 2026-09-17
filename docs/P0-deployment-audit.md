# P0 演示站部署审计

审计时间：2026-09-17（Asia/Shanghai）

## 结论

当前不能证明 `http://149.129.73.202:3015/` 是本仓库的部署，也不能安全地把它切换到本仓库。公网证据显示 3015 是另一套 SkillHub 实现：导航使用 `/auth/login`、论坛列表为空、`/forum/new` 返回 404；本仓库使用 `/login`、`/register`，并包含 `/forum/new` 和 `/forum/[id]`。

因此本次不修改、不重启 3015，也不修改候选 Supabase 数据库。候选仓库完成了可追踪部署改造，等待具备目标服务器只读/发布访问后再进入旁路和切换。

## 来源与数据映射

| 对象 | 已确认信息 | 证据/备注 |
| --- | --- | --- |
| 代码源 | `https://github.com/antifragile26/skillhub`，`main` 基线 `217da8b17012547ba66b7c3a03ed3ea616aa8631` | GitHub 仓库连接器确认；本地 `origin/main` 同 SHA |
| 候选数据库 | Supabase 项目标识 `klkpnrkmfsvelghzplvw` | 仅记录项目标识，不记录 key |
| 候选数据库行数 | `posts=4`、`comments=1`、`skills=10`、`agents=10` | 匿名只读请求；未查询密码、token 或完整邮箱列表 |
| 候选帖子样本 | ID 3《评测 — tc008-evil-yiu1ng v1.0.0》；ID 1《reading 场景》；ID 2《AI Agent 应该拥有独立决策权》；ID 9《只是一个测试》 | 可作为列表/详情验收样本 |
| 公网 3015 | `/` 200；`/forum` 200 但显示暂无帖子；`/forum/new` 404；`/forum/1` 404 | 3015 未发现可用详情 ID，不能用猜测 ID 验收 |
| 服务器进程/代理 | 未确认 | 当前上下文没有阿里云实例或 SSH 访问入口；未猜测凭据 |

链路目前只能写成：

```text
公网:3015 → 未知代理/进程 → 未知目录/commit → 未知数据库
候选仓库 → Supabase klkpnrkmfsvelghzplvw → 本地旁路可构建
```

## 本次代码改造

- GitHub Actions 将显式传递触发提交的完整 SHA。
- `deploy.sh` 只接受 40 位 commit SHA，拒绝脏工作目录，使用 `npm ci`，构建隔离 release，并让 `current` 指向已构建版本。
- `ecosystem.config.js` 改为运行 `/var/www/skillhub/current`，旧 release 保留用于回切。
- 新增 `/api/health`，只返回 `ok`、公开 commit、部署时间和 Supabase 项目标识，不返回任何密钥。
- 本地分支：`codex/p0-demo-alignment`。

## A01–A10 验收状态

| 编号 | 状态 | 说明 |
| --- | --- | --- |
| A01 | 未完成 | 3015 的进程、目录、remote、运行 SHA、数据库未能从服务器侧确认 |
| A02 | 部分完成 | 候选数据只读快照和代码配置备份已校验；3015 原服务/实际数据库备份未做，避免越权 |
| A03 | 通过（旁路） | 目标基线本地 `npm ci` 依赖已存在，`npm run lint` 和 `npm run build` 通过 |
| A04 | 未完成 | 未进入发布，无法证明 GitHub SHA 与 3015 运行 SHA 一致 |
| A05 | 未完成 | 候选库有 4 条帖子，但 3015 仍为空 |
| A06 | 未完成 | 3015 没有可确认的详情 ID；候选代码路由已通过构建 |
| A07 | 部分完成 | 候选代码包含 `/forum/new`；线上 3015 仍 404，未做登录发帖写入 |
| A08 | 部分完成 | 候选库切换前快照已完成；3015 数据归属未确认 |
| A09 | 通过（代码路径） | 已保留 release，并提供 current 回切步骤；服务器实演待访问权限 |
| A10 | 通过（本次变更） | 未提交 `.env.local`、密钥、私钥或 service-role key；health 仅输出项目标识 |

## 唯一阻塞与下一步

需要目标实例的 SSH/阿里云管理入口，至少能执行计划阶段 A 的只读盘点；随后才能在未占用端口旁路启动、验证并决定是否切换 3015。没有这项访问不能安全交付“3015 已对齐”的结论。
