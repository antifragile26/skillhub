# 填充真实开源项目数据 - 执行指南

往数据库里填了 **10 个真实开源 Agent** 和 **10 个真实开源 Skill**，都带真实 GitHub 仓库链接，点进去能看介绍、跳转去用。

## ⚠️ 执行顺序很重要

在 Supabase SQL Editor 里**按顺序**执行两段 SQL。

### 第 1 步：先加字段（如果之前没跑过）

agents 表需要 `category` 和 `frameworks` 两个新列。如果你之前已经跑过 agent 增强的迁移，跳过这步。没跑过就先执行：

```sql
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS frameworks TEXT[];
CREATE INDEX IF NOT EXISTS agents_category_idx ON public.agents (category);
CREATE INDEX IF NOT EXISTS agents_frameworks_idx ON public.agents USING GIN (frameworks);
```

### 第 2 步：填充种子数据

打开仓库里的 `supabase/migrations/20260731010000_seed_real_projects.sql`，把**整个文件内容**复制到 SQL Editor 执行。

这个脚本是**幂等**的——先删同名记录再插入，可以反复跑不会重复。

## 填了哪些内容

### Agents（10 个）
| 名称 | 类别 | 说明 |
|------|------|------|
| AutoGPT | 自动化工作流 | 最早出圈的自主 agent |
| MetaGPT | 代码开发 | 多智能体软件公司 |
| GPT Researcher | 研究分析 | 自动做研究报告 |
| OpenHands | 代码开发 | 开源 AI 软件工程师 |
| Aider | 代码开发 | 终端 AI 结对编程 |
| gpt-engineer | 代码开发 | 自然语言生成代码库 |
| AgentGPT | 自动化工作流 | 浏览器里跑的自主 agent |
| SuperAGI | 自动化工作流 | agent 基础设施平台 |
| Khoj | 研究分析 | 个人 AI 第二大脑 |
| BabyAGI | 自动化工作流 | 极简任务驱动 agent |

### Skills（10 个）
browser-use、firecrawl、crawl4ai、playwright、yt-dlp、e2b-code-interpreter、unstructured、markitdown、tavily-python、duckduckgo-search

（都是网页抓取 / 浏览器自动化 / 文档解析 / 搜索 / 代码沙箱这类真实可用的工具库）

## 重要说明

- **这些是登记信息，不是可运行实例。** 平台展示项目介绍并链接到真实 GitHub 仓库，用户去仓库按官方文档使用。真正在平台里"运行"agent 是另一套系统（需要后端执行环境）。
- GitHub 链接目前写在描述文本里（`入口：https://...`）。如果想让它变成可点击的独立链接按钮，我可以再改详情页。
- 下载量等数字是示意数据，不是真实统计。

## 验证

执行后访问：
- https://skillhub-1785163757.netlify.app/agents  — 应看到 10 个 agent，可按类别/框架筛选
- https://skillhub-1785163757.netlify.app/skills  — 应看到 10 个 skill，可按标签筛选
