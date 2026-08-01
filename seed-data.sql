-- 插入真实开源 skills 和 agents（保留现有数据）

-- ============ Skills（10个真实开源 Claude skills / MCP servers）============
INSERT INTO public.skills (name, version, description, downloads, tags, repo_url, user_id) VALUES
('filesystem', '1.0.0', 'MCP server for file system operations - read, write, and manage files securely.
https://github.com/modelcontextprotocol/servers', 0, ARRAY['mcp', 'filesystem', 'claude'], 'https://github.com/modelcontextprotocol/servers', NULL),

('sqlite', '1.0.0', 'MCP server for SQLite database operations - query and manage SQLite databases.
https://github.com/modelcontextprotocol/servers', 0, ARRAY['mcp', 'database', 'sqlite'], 'https://github.com/modelcontextprotocol/servers', NULL),

('github', '1.0.0', 'MCP server for GitHub operations - manage repositories, issues, and pull requests.
https://github.com/modelcontextprotocol/servers', 0, ARRAY['mcp', 'github', 'git'], 'https://github.com/modelcontextprotocol/servers', NULL),

('postgres', '1.0.0', 'MCP server for PostgreSQL database operations - connect and query Postgres databases.
https://github.com/modelcontextprotocol/servers', 0, ARRAY['mcp', 'database', 'postgres'], 'https://github.com/modelcontextprotocol/servers', NULL),

('puppeteer', '1.0.0', 'MCP server for browser automation with Puppeteer - scrape and interact with web pages.
https://github.com/modelcontextprotocol/servers', 0, ARRAY['mcp', 'browser', 'automation'], 'https://github.com/modelcontextprotocol/servers', NULL),

('brave-search', '1.0.0', 'MCP server for Brave Search API - perform web searches programmatically.
https://github.com/modelcontextprotocol/servers', 0, ARRAY['mcp', 'search', 'api'], 'https://github.com/modelcontextprotocol/servers', NULL),

('memory', '1.0.0', 'MCP server for knowledge graph memory - store and retrieve contextual information.
https://github.com/modelcontextprotocol/servers', 0, ARRAY['mcp', 'memory', 'knowledge-graph'], 'https://github.com/modelcontextprotocol/servers', NULL),

('fetch', '1.0.0', 'MCP server for HTTP requests - fetch and process web content.
https://github.com/modelcontextprotocol/servers', 0, ARRAY['mcp', 'http', 'fetch'], 'https://github.com/modelcontextprotocol/servers', NULL),

('git', '1.0.0', 'MCP server for Git operations - manage repositories, commits, and branches.
https://github.com/modelcontextprotocol/servers', 0, ARRAY['mcp', 'git', 'vcs'], 'https://github.com/modelcontextprotocol/servers', NULL),

('slack', '1.0.0', 'MCP server for Slack integration - send messages and manage channels.
https://github.com/modelcontextprotocol/servers', 0, ARRAY['mcp', 'slack', 'messaging'], 'https://github.com/modelcontextprotocol/servers', NULL);

-- ============ Agents（10个真实开源 AI agent 项目）============
INSERT INTO public.agents (name, category, frameworks, description, repo_url, downloads, user_id) VALUES
('CrewAI', 'automation', ARRAY['CrewAI'], 'Framework for orchestrating role-playing autonomous AI agents. Empower agents to work together and tackle complex tasks.
https://github.com/crewAIInc/crewAI', 'https://github.com/crewAIInc/crewAI', 0, NULL),

('AutoGPT', 'automation', ARRAY['LangChain', 'AutoGen'], 'Autonomous GPT-4 agent - set goals and watch it work autonomously to achieve them.
https://github.com/Significant-Gravitas/AutoGPT', 'https://github.com/Significant-Gravitas/AutoGPT', 0, NULL),

('GPT Researcher', 'research', ARRAY['LangChain'], 'Autonomous agent designed for comprehensive online research on various tasks. Produces detailed research reports.
https://github.com/assafelovic/gpt-researcher', 'https://github.com/assafelovic/gpt-researcher', 0, NULL),

('MetaGPT', 'code', ARRAY['LangChain'], 'Multi-agent framework - assign different roles to GPTs to form a collaborative software entity.
https://github.com/geekan/MetaGPT', 'https://github.com/geekan/MetaGPT', 0, NULL),

('SWE-agent', 'code', ARRAY['LangChain'], 'Agent that autonomously fixes bugs and resolves issues in GitHub repositories.
https://github.com/princeton-nlp/SWE-agent', 'https://github.com/princeton-nlp/SWE-agent', 0, NULL),

('Aider', 'code', ARRAY['Other'], 'AI pair programming in your terminal - edit code in your local git repo with GPT-4.
https://github.com/paul-gauthier/aider', 'https://github.com/paul-gauthier/aider', 0, NULL),

('OpenHands', 'code', ARRAY['LangChain'], 'Platform for software development agents - autonomous agents that write code and interact with systems.
https://github.com/All-Hands-AI/OpenHands', 'https://github.com/All-Hands-AI/OpenHands', 0, NULL),

('AutoGen', 'automation', ARRAY['AutoGen'], 'Microsoft framework for building LLM applications using multiple agents that can converse with each other.
https://github.com/microsoft/autogen', 'https://github.com/microsoft/autogen', 0, NULL),

('BabyAGI', 'research', ARRAY['LangChain'], 'AI-powered task management system - creates, prioritizes, and executes tasks autonomously.
https://github.com/yoheinakajima/babyagi', 'https://github.com/yoheinakajima/babyagi', 0, NULL),

('AgentGPT', 'automation', ARRAY['LangChain'], 'Autonomous AI agents in your browser - assemble, configure, and deploy autonomous AI agents.
https://github.com/reworkd/AgentGPT', 'https://github.com/reworkd/AgentGPT', 0, NULL);
