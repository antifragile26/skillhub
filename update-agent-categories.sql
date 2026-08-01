-- 更新 agents 分类，对齐用途/场景分类体系

UPDATE public.agents SET category = 'multi-agent' WHERE name = 'CrewAI';
UPDATE public.agents SET category = 'multi-agent' WHERE name = 'AutoGPT';
UPDATE public.agents SET category = 'research' WHERE name = 'GPT Researcher';
UPDATE public.agents SET category = 'coding' WHERE name = 'MetaGPT';
UPDATE public.agents SET category = 'coding' WHERE name = 'SWE-agent';
UPDATE public.agents SET category = 'coding' WHERE name = 'Aider';
UPDATE public.agents SET category = 'coding' WHERE name = 'OpenHands';
UPDATE public.agents SET category = 'multi-agent' WHERE name = 'AutoGen';
UPDATE public.agents SET category = 'workflow' WHERE name = 'BabyAGI';
UPDATE public.agents SET category = 'multi-agent' WHERE name = 'AgentGPT';
