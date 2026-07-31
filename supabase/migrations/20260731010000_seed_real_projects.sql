-- 种子数据：一批真实存在的开源 AI Agent / Skill 项目
-- 执行说明：在 Supabase SQL Editor 中运行（前提是已先执行 category / frameworks 迁移）
-- 幂等：先按 name 删除同名种子，再重新插入，可反复执行

-- ========== Agents ==========
delete from public.agents where name in (
  'AutoGPT', 'MetaGPT', 'GPT Researcher', 'OpenHands', 'Aider',
  'gpt-engineer', 'AgentGPT', 'SuperAGI', 'Khoj', 'BabyAGI'
);

insert into public.agents (name, category, frameworks, description, skills_count, posts_count) values
(
  'AutoGPT',
  'workflow',
  array['其他'],
  '最早出圈的自主 AI agent 之一，给定目标后自行拆解任务、调用工具、循环执行直到完成。适合探索 autonomous agent 的能力边界。'
    || E'\n\n入口：https://github.com/Significant-Gravitas/AutoGPT',
  0, 0
),
(
  'MetaGPT',
  'coding',
  array['其他'],
  '多智能体软件公司框架：输入一句需求，产品经理 / 架构师 / 工程师等角色协作产出 PRD、设计、代码。'
    || E'\n\n入口：https://github.com/geekan/MetaGPT',
  0, 0
),
(
  'GPT Researcher',
  'research',
  array['LangChain'],
  '自主研究 agent：针对一个课题自动做网络检索、聚合多来源信息、生成带引用的研究报告。'
    || E'\n\n入口：https://github.com/assafelovic/gpt-researcher',
  0, 0
),
(
  'OpenHands',
  'coding',
  array['其他'],
  '前身 OpenDevin，开源 AI 软件工程师：能读写代码、跑命令、浏览网页，在沙箱里完成端到端开发任务。'
    || E'\n\n入口：https://github.com/All-Hands-AI/OpenHands',
  0, 0
),
(
  'Aider',
  'coding',
  array['其他'],
  '终端里的 AI 结对编程工具，直接在本地 git 仓库里改代码并自动提交，支持几乎所有主流模型。'
    || E'\n\n入口：https://github.com/Aider-AI/aider',
  0, 0
),
(
  'gpt-engineer',
  'coding',
  array['其他'],
  '用自然语言描述想要的软件，它生成整个代码库；也支持在已有项目上迭代改进。'
    || E'\n\n入口：https://github.com/gpt-engineer-org/gpt-engineer',
  0, 0
),
(
  'AgentGPT',
  'workflow',
  array['LangChain'],
  '浏览器里就能配置和运行的自主 agent，给个名字和目标就开始自主执行，适合快速体验。'
    || E'\n\n入口：https://github.com/reworkd/AgentGPT',
  0, 0
),
(
  'SuperAGI',
  'workflow',
  array['其他'],
  '面向开发者的自主 agent 基础设施：并发跑多个 agent、工具市场、图形界面与性能监控。'
    || E'\n\n入口：https://github.com/TransformerOptimus/SuperAGI',
  0, 0
),
(
  'Khoj',
  'research',
  array['LangChain'],
  '个人 AI 第二大脑：把你的笔记、文档、网页索引起来，支持语义搜索和基于自有资料的问答。'
    || E'\n\n入口：https://github.com/khoj-ai/khoj',
  0, 0
),
(
  'BabyAGI',
  'workflow',
  array['其他'],
  '极简的任务驱动自主 agent 示例：用 LLM + 向量存储实现"创建任务→执行→再规划"的循环，经典教学项目。'
    || E'\n\n入口：https://github.com/yoheinakajima/babyagi',
  0, 0
);

-- ========== Skills ==========
delete from public.skills where name in (
  'browser-use', 'firecrawl', 'crawl4ai', 'playwright', 'yt-dlp',
  'e2b-code-interpreter', 'unstructured', 'markitdown', 'tavily-python', 'duckduckgo-search'
);

insert into public.skills (name, version, description, downloads, tags) values
(
  'browser-use',
  '0.1.40',
  '让 AI agent 直接操作浏览器：点击、填表、抓取页面内容。给 LLM 装上一双手，适合网页自动化。仓库：https://github.com/browser-use/browser-use',
  9200, array['browser', 'automation', 'agent']
),
(
  'firecrawl',
  '1.5.0',
  '把整个网站抓成干净的 markdown / 结构化数据，专为喂给 LLM 设计，自动处理 JS 渲染。仓库：https://github.com/mendableai/firecrawl',
  8700, array['crawler', 'scraping', 'markdown']
),
(
  'crawl4ai',
  '0.4.2',
  '开源、面向 LLM 的高性能网页爬虫与抓取库，输出适合 RAG 的干净内容。仓库：https://github.com/unclecode/crawl4ai',
  6400, array['crawler', 'scraping', 'rag']
),
(
  'playwright',
  '1.48.0',
  '微软出品的跨浏览器自动化框架，支持无头运行、截图、录制，是很多浏览器 agent 的底层。仓库：https://github.com/microsoft/playwright',
  15300, array['browser', 'testing', 'automation']
),
(
  'yt-dlp',
  '2024.11.04',
  '功能强大的音视频下载工具，支持上千个站点，常用于给 agent 提供媒体抓取能力。仓库：https://github.com/yt-dlp/yt-dlp',
  21000, array['media', 'download', 'cli']
),
(
  'e2b-code-interpreter',
  '1.0.3',
  '给 AI 一个安全的云端沙箱来执行它生成的代码，秒级启动，适合 code interpreter 类 agent。仓库：https://github.com/e2b-dev/code-interpreter',
  5100, array['sandbox', 'code', 'execution']
),
(
  'unstructured',
  '0.16.5',
  '把 PDF、Word、PPT、HTML 等各种文档解析成结构化元素，是构建 RAG 数据管线的常用预处理库。仓库：https://github.com/Unstructured-IO/unstructured',
  11800, array['document', 'parsing', 'rag']
),
(
  'markitdown',
  '0.0.1a3',
  '微软出品的小工具，把 Office 文档、PDF、图片等一键转成 markdown，方便喂给 LLM。仓库：https://github.com/microsoft/markitdown',
  7600, array['document', 'markdown', 'convert']
),
(
  'tavily-python',
  '0.5.0',
  '专为 LLM / agent 设计的搜索 API 客户端，返回适合直接引用的搜索结果，常配合 RAG 使用。仓库：https://github.com/tavily-ai/tavily-python',
  4300, array['search', 'api', 'rag']
),
(
  'duckduckgo-search',
  '6.3.5',
  '无需 API key 的 DuckDuckGo 搜索封装，给 agent 加上免费网络搜索能力。仓库：https://github.com/deedy5/duckduckgo_search',
  9800, array['search', 'web', 'free']
);
